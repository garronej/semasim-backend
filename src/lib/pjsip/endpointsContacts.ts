import { DongleExtendedClient } from "chan-dongle-extended-client";
import { SyncEvent } from "ts-events-extended";
import * as sip from "../sipProxy/sip";
import { flowTokenKey } from "../sipProxy/shared";

import { messageContext } from "./dbInterface";

import * as _debug from "debug";
let debug = _debug("_pjsip/endpointsContacts");


let evtNewContact: SyncEvent<string> | undefined = undefined;

export function getEvtNewContact(): SyncEvent<string> {

    if (evtNewContact) return evtNewContact;

    evtNewContact = new SyncEvent<string>();

    DongleExtendedClient.localhost().ami.evt.attach(
        managerEvt => (
            managerEvt.event === "ContactStatus" &&
            managerEvt.contactstatus === "Created" &&
            managerEvt.uri
        ),
        ({ endpointname, uri })=> evtNewContact!.post(`${endpointname}/${uri}`)
    );

    return evtNewContact;


}



/*


export class Contact {

    public readonly endpoint: string;
    public readonly sessionId: string;
    public readonly offlineSince: Date;
    public readonly isGenericClient: boolean;
    public readonly port: number;

    constructor(
        public readonly pjsipUri: string
        ){
            let parsedUri= sip.parseUri(pjsipUri.match(/^[0-9]{15}\/(.*)$/)![1]);

            this.endpoint= parsedUri.user!;

            this.sessionId= parsedUri.params[sessionIdKey];

            let offlineSinceTimestamp= parseInt(parsedUri.params[offlineSinceKey]);

            this.isGenericClient= isNaN(offlineSinceTimestamp);

            //TODO: set the real offline timestamp if isNan

            this.offlineSince= new Date(offlineSinceTimestamp);

            this.port= parsedUri.port;

    }
}

type ContactStatus = "Avail" | "Unavail" | "Unknown" | "Created";

function getContacts(): Promise<Contact[]> {

    return new Promise<Contact[]>(async resolve => {

        let ami = DongleExtendedClient.localhost().ami;

        let proxyEvt = ami.evt.createProxy();

        ami.postAction( "PJSIPShowEndpoints", {}).catch( error => {

            proxyEvt.stopWaiting();

            resolve([]);

        });

        let actionId = ami.lastActionId;

        let contacts: Contact[] = [];

        while (true) {

            let evt = await proxyEvt.waitFor(evt => evt.actionid === actionId);

            console.log({ evt });

            if (evt.event === "EndpointListComplete") break;

            let concatPjsipContactUri = evt["contacts"];

            let pjsipContactUris = concatPjsipContactUri.split(",");

            pjsipContactUris.pop();

            contacts= pjsipContactUris.map( pjsipContactUri => new Contact(pjsipContactUri));

        }

        resolve(contacts);

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

//TODO: no need to check status

export async function getAvailableContactsOfEndpoint(endpoint: string): Promise<Contact[]> {

    let contacts = (await getContacts()).filter( contact => contact.endpoint === endpoint);

    let availableContacts: Contact[]= [];

    for( let contact of contacts ){

        if( (await getContactStatus(contact.pjsipUri)) !== "Avail" ) continue;

        availableContacts.push(contact);

    }

    return availableContacts;

}

let evtNewContact: SyncEvent<Contact> | undefined = undefined;

export function getEvtNewContact(): SyncEvent<Contact> {

    if (evtNewContact) return evtNewContact;

    let out = new SyncEvent<Contact>();

    let pendingRegistrations= new Set<string>();

    DongleExtendedClient.localhost().ami.evt.attach(
        managerEvt => (
            managerEvt.event === "ContactStatus" &&
            managerEvt.contactstatus === "Created" &&
            managerEvt.uri
        ),
        async function callee(contactStatusEvt) {

            let { endpointname, uri } = contactStatusEvt;

            let contact= new Contact(`${endpointname}/${uri}`);

            let registrationId = `${contact.port}_${contact.sessionId}`;

            if (pendingRegistrations.has(registrationId)) return;

            pendingRegistrations.add(registrationId);

            await new Promise<void>(resolve => setTimeout(resolve, 5000));

            let status = await getContactStatus(contact.pjsipUri);

            switch (status) {
                case undefined:
                    break;
                case "Avail":
                    pendingRegistrations.delete(registrationId);
                    out.post(contact);
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




*/



