import { DongleExtendedClient } from "chan-dongle-extended-client";
import { SyncEvent } from "ts-events-extended";
import * as sip from "../sipProxy/sip";
import { flowTokenKey } from "../sipProxy/outbound";
import * as dbInterface from "./dbInterface";
import { asteriskSockets } from "../sipProxy/inbound";
import * as outboundApi from "../sipProxy/outbound.api";

import { messageContext } from "./dbInterface";

import * as _debug from "debug";
let debug = _debug("_admin/endpointsContacts");

export interface Contact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}

export namespace Contact {

    export function buildValueOfUserAgentField(
        endpoint: string,
        instanceId: string,
        realUserAgent: string
    ): string {

        let wrap = { endpoint, instanceId, realUserAgent };

        return (new Buffer(JSON.stringify(wrap), "utf8")).toString("base64")

    }

    function decodeUserAgentFieldValue(contact: Contact): { 
        endpoint: string,
        instanceId: string,
        realUserAgent: string
    }{
        return JSON.parse((new Buffer(contact.user_agent, "base64")).toString("utf8"));
    }

    export function readInstanceId(contact: Contact): string {
        return decodeUserAgentFieldValue(contact).instanceId;
    }

    export function readUserAgent(contact: Contact): string {
        return decodeUserAgentFieldValue(contact).realUserAgent;
    }


    export function readFlowToken(contact: Contact): string {

        return sip.parsePath(contact.path).pop()!.uri.params[flowTokenKey]!;

    }

    export function readAstSocketSrcPort(contact: Contact): number {

        if (!contact.path) return NaN;

        return sip.parsePath(contact.path)[0].uri.port;

    }

    export function pretty(contact: Contact): Record<string, string>{

        let parsedUri= sip.parseUri(contact.uri);

        let pnTok= parsedUri.params["pn-tok"];

        if( pnTok )
            parsedUri.params["pn-tok"] = pnTok.substring(0,3) + "..." + pnTok.substring(pnTok.length - 3 );

        return {
            "uri": sip.stringifyUri(parsedUri),
            "path": contact.path,
            "instanceId": readInstanceId(contact),
            "userAgent": readUserAgent(contact)
        };

    }




}



export function getContactFromAstSocketSrcPort(
    astSocketSrcPort: number
): Promise<Contact | undefined> {

    let returned = false;

    return new Promise<Contact | undefined>(async resolve => {

        getEvtNewContact().waitFor(
            contact => Contact.readAstSocketSrcPort(contact) === astSocketSrcPort,
            1200
        ).then(contact => {
            if (returned) return;
            returned = true;

            resolve(contact);

        }).catch(() => {
            if (returned) return;
            returned = true;

            resolve(undefined);
        });

        let contacts = await dbInterface.dbAsterisk.queryContacts();

        if (returned) return;

        for (let contact of contacts) {

            if (Contact.readAstSocketSrcPort(contact) !== astSocketSrcPort)
                continue;

            returned = true;

            resolve(contact);

        }

    });


}



export function wakeUpAllContacts(
    endpoint: string,
    timeout?: number
): {
        all: Promise<{
            reachableContacts: Contact[];
            unreachableContacts: Contact[];
        }>;
        evtReachableContact: SyncEvent<Contact | "COMPLETED">
    } {

    let evtReachableContact = new SyncEvent<Contact | "COMPLETED">();

    let all = new Promise<{
        reachableContacts: Contact[];
        unreachableContacts: Contact[];
    }>(async resolve => {

        let contactsOfEndpoint = (await dbInterface.dbAsterisk.queryContacts()).filter(contact => contact.endpoint === endpoint);

        let reachableContactMap: Map<Contact, Contact> = new Map();

        let resolver = () => {

            let reachableContacts: Contact[] = [];
            let unreachableContacts: Contact[] = [];

            for (let keyContact of reachableContactMap.keys()) {

                let reachableContact = reachableContactMap.get(keyContact)

                if (reachableContact) reachableContacts.push(reachableContact);
                else unreachableContacts.push(keyContact);

            }

            resolve({ reachableContacts, unreachableContacts });

        };

        let timer: NodeJS.Timer | undefined = undefined;

        if (timeout) {
            timer = setTimeout(() => {

                if (!reachableContactMap.size) return;

                resolver();

            }, timeout);
        }


        let taskArray: Promise<void>[] = [];

        for (let contact of contactsOfEndpoint)
            taskArray.push(new Promise<void>(resolve =>
                wakeUpContact(contact).then(reachableContact => {

                    reachableContactMap.set(contact, reachableContact);
                    evtReachableContact.post(reachableContact);

                    resolve();

                }).catch(() => resolve())
            ));


        await Promise.all(taskArray);

        if (timer) clearTimeout(timer);

        resolver();

        evtReachableContact.post("COMPLETED");

    });

    return { all, evtReachableContact };

}

export async function wakeUpContact(
    contact: Contact,
    timeout?: number
): Promise<Contact> {

    let statusMessage = await outboundApi.wakeUpUserAgent.run(contact);

    switch (statusMessage) {
        case "REACHABLE":
            debug("Directly reachable");
            return contact;
        case "FAIL":
            debug("WebAPI fail");
            throw new Error("webApi FAIL");
        case "PUSH_NOTIFICATION_SENT":

            try {

                let newlyRegisteredContact = await getEvtNewContact().waitFor(
                    ({ user_agent }) => user_agent === contact.user_agent,
                    timeout || 30000
                );

                debug("Contact woke up after push notification");

                return newlyRegisteredContact;

            } catch (error) {

                throw new Error("Timeout new register after push notification");

            }

    }

}


let evtNewContact: SyncEvent<Contact> | undefined = undefined;

export function getEvtNewContact(): SyncEvent<Contact> {

    if (evtNewContact) return evtNewContact;

    evtNewContact = new SyncEvent<Contact>();

    DongleExtendedClient.localhost().ami.evt.attach(
        managerEvt => (
            managerEvt.event === "ContactStatus" &&
            managerEvt.contactstatus === "Created" &&
            managerEvt.uri
        ),
        async ({ endpointname, uri }) => {

            let contacts = await dbInterface.dbAsterisk.queryContacts();

            let newContact = contacts.filter(
                contact => contact.endpoint === endpointname && contact.uri === uri
            )[0];

            let contactsToDelete = contacts.filter(
                contact => contact !== newContact && contact.user_agent === newContact.user_agent
            );

            for (let contactToDelete of contactsToDelete) {

                debug("we had a contact for this UA, we delete it", Contact.pretty(contactToDelete));

                await dbInterface.dbAsterisk.deleteContact(contactToDelete.id);

                let astSocketSrcPort = Contact.readAstSocketSrcPort(contactToDelete);

                asteriskSockets.getAll().filter(
                    ({ localPort }) => localPort === astSocketSrcPort
                ).map(asteriskSocket => asteriskSocket.destroy());

            }

            evtNewContact!.post(newContact);

        }
    );

    return evtNewContact;

}
