import { DongleExtendedClient } from "chan-dongle-extended-client";
import { SyncEvent } from "ts-events-extended";

import { messageContext } from "./dbInterface";

import * as _debug from "debug";
let debug = _debug("_pjsip/endpointsContacts");

type ContactStatus = "Avail" | "Unavail" | "Unknown" | "Created";

function getContacts(): Promise<{
    [endpoint: string]: {
        status: ContactStatus;
        contact: string;
    }[]
}> {

    return new Promise<any>(async resolve => {

        let ami = DongleExtendedClient.localhost().ami;

        let proxyEvt = ami.evt.createProxy();

        ami.postAction(
            { "action": "PJSIPShowEndpoints" }
        ).catch(error => {

            proxyEvt.stopWaiting();

            resolve({});

        });


        let actionId = ami.lastActionId;

        let contactsByEndpoint: { [endpoint: string]: string[]; } = {};

        while (true) {

            let evt = await proxyEvt.waitFor(evt => evt.actionid === actionId);

            if (evt.event === "EndpointListComplete") break;

            let endpoint = evt.objectname;
            let concatContacts = evt.contacts;

            let contacts = concatContacts.split(",");

            contacts.pop();

            contactsByEndpoint[endpoint] = contacts;

        }

        let out: {
            [endpoint: string]: {
                status: ContactStatus;
                contact: string;
            }[];
        } = {};

        for (let endpoint of Object.keys(contactsByEndpoint)) {

            let contacts = contactsByEndpoint[endpoint];

            out[endpoint] = [];

            for (let contact of contacts) {

                let status = await getContactStatus(contact);

                if (!status) continue;

                out[endpoint].push({ contact, status });

            }
        }

        resolve(out);

    });




}

async function getContactStatus(contact: string): Promise<ContactStatus | undefined> {

    let output= await DongleExtendedClient.localhost().ami.runCliCommand(`pjsip show contact ${contact}`);

    try {

        return output
        .split("\n")
        .filter( line => line.match(/^[ \t]*Contact:/) )
        .pop()!
        .match( /^[ \t]*Contact:[ \t]*[^ \t]+[ \t]*[0-9a-fA-F]+[ \t]*([^ \t]+).*$/)![1] as any;

    } catch (error) {

        return undefined;

    }

}

export async function getAvailableContactsOfEndpoint(endpoint: string): Promise<string[]> {

    let contacts = (await getContacts())[endpoint] || [];

    let availableContacts: string[] = [];

    for (let { contact, status } of contacts) {

        if (status !== "Avail") continue;

        availableContacts.push(contact);

    }

    return availableContacts;

}

let evtNewContact: SyncEvent<{ endpoint: string; contact: string; }> | undefined = undefined;

export function getEvtNewContact(): SyncEvent<{ endpoint: string; contact: string; rinstance: string; }> {

    if (evtNewContact) return evtNewContact;

    let out = new SyncEvent<{
        endpoint: string;
        contact: string;
    }>();

    let pendingRegistrations= new Set<string>();

    DongleExtendedClient.localhost().ami.evt.attach(
        managerEvt => (
            managerEvt.event === "ContactStatus" &&
            managerEvt.contactstatus === "Created" &&
            managerEvt.uri
        ),
        async function callee(contactStatusEvt) {

            let { endpointname, uri } = contactStatusEvt;

            let endpoint = endpointname;
            let contact = `${endpoint}/${uri}`;


            let match = contact.match(/@[^:]+:([0-9]+).*rinstance=([^;]+)/)!;

            let port = parseInt(match[1]);


            let rinstance = match[2];

            let registrationId = `${port}_${rinstance}`;

            if (pendingRegistrations.has(registrationId)) return;

            pendingRegistrations.add(registrationId);

            await new Promise<void>(resolve => setTimeout(() => resolve(), 5000));

            let status = await getContactStatus(contact);

            switch (status) {
                case undefined:
                    break;
                case "Avail":
                    pendingRegistrations.delete(registrationId);
                    out.post({ contact, endpoint });
                    break;
                default:
                    console.log(`Unexpected contact status ${status}`);
                    callee(contactStatusEvt);
                    break;
            }
        }
    );

    evtNewContact = out;

    return getEvtNewContact();

}





