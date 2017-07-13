"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var ts_events_extended_1 = require("ts-events-extended");
var _debug = require("debug");
var debug = _debug("_pjsip/endpointsContacts");
var evtNewContact = undefined;
function getEvtNewContact() {
    if (evtNewContact)
        return evtNewContact;
    evtNewContact = new ts_events_extended_1.SyncEvent();
    chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.evt.attach(function (managerEvt) { return (managerEvt.event === "ContactStatus" &&
        managerEvt.contactstatus === "Created" &&
        managerEvt.uri); }, function (_a) {
        var endpointname = _a.endpointname, uri = _a.uri;
        return evtNewContact.post(endpointname + "/" + uri);
    });
    return evtNewContact;
}
exports.getEvtNewContact = getEvtNewContact;
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
