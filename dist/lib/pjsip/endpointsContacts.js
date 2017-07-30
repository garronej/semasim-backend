"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var ts_events_extended_1 = require("ts-events-extended");
var sip = require("../sipProxy/sip");
var dbInterface = require("./dbInterface");
var inbound_1 = require("../sipProxy/inbound");
var _debug = require("debug");
var debug = _debug("_pjsip/endpointsContacts");
var evtNewContact = undefined;
function getEvtNewContact() {
    var _this = this;
    if (evtNewContact)
        return evtNewContact;
    evtNewContact = new ts_events_extended_1.SyncEvent();
    chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.evt.attach(function (managerEvt) { return (managerEvt.event === "ContactStatus" &&
        managerEvt.contactstatus === "Created" &&
        managerEvt.uri); }, function (_a) {
        var endpointname = _a.endpointname, uri = _a.uri;
        return __awaiter(_this, void 0, void 0, function () {
            var contacts, newContact, contactsToDelete, contactsToDelete_1, contactsToDelete_1_1, contactToDelete, asteriskSocketLocalPort, _a, _b, asteriskSocket, e_1, _c, e_2, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, dbInterface.queryContacts()];
                    case 1:
                        contacts = _e.sent();
                        newContact = contacts.filter(function (contact) { return contact.endpoint === endpointname && contact.uri === uri; })[0];
                        contactsToDelete = contacts.filter(function (contact) { return contact !== newContact && contact.user_agent === newContact.user_agent; });
                        try {
                            for (contactsToDelete_1 = __values(contactsToDelete), contactsToDelete_1_1 = contactsToDelete_1.next(); !contactsToDelete_1_1.done; contactsToDelete_1_1 = contactsToDelete_1.next()) {
                                contactToDelete = contactsToDelete_1_1.value;
                                debug({ contactToDelete: contactToDelete });
                                asteriskSocketLocalPort = readAsteriskSocketLocalPortFromPath(contactToDelete.path);
                                try {
                                    for (_a = __values(inbound_1.asteriskSockets.getAll()), _b = _a.next(); !_b.done; _b = _a.next()) {
                                        asteriskSocket = _b.value;
                                        if (asteriskSocket.localPort !== asteriskSocketLocalPort)
                                            continue;
                                        debug("Deleting socket: " + asteriskSocket.localPort + ":" + asteriskSocket.localAddress + "->" + asteriskSocket.remoteAddress + ":" + asteriskSocket.remotePort);
                                        asteriskSocket.destroy();
                                    }
                                }
                                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                                finally {
                                    try {
                                        if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                                    }
                                    finally { if (e_2) throw e_2.error; }
                                }
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (contactsToDelete_1_1 && !contactsToDelete_1_1.done && (_c = contactsToDelete_1.return)) _c.call(contactsToDelete_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        evtNewContact.post(newContact);
                        return [2 /*return*/];
                }
            });
        });
    });
    return evtNewContact;
}
exports.getEvtNewContact = getEvtNewContact;
function readAsteriskSocketLocalPortFromPath(path) {
    console.log({ path: path });
    if (!path)
        return NaN;
    return sip.parseUri(path.match(/^<([^>]+)>/)[1]).port;
}
exports.readAsteriskSocketLocalPortFromPath = readAsteriskSocketLocalPortFromPath;
/*

avec endpoint et uri on recupère le contact.

avec le contact on recupère tous les autre contact qui on la mème user_agent

tous ses contact on retrouve leurs socket et on les ferme.

pb: le socket doit être capable de retrouver son contact.
il peux le faire grâce a route parsque il y a le src port!





*/
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
