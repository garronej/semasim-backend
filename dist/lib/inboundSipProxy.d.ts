import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as sip from "./sipLibrary";
import { Contact } from "./endpointsContacts";
import "colors";
export declare const evtIncomingMessage: SyncEvent<{
    fromContact: Contact;
    toNumber: string;
    text: string;
}>;
export declare const evtOutgoingMessage: SyncEvent<{
    sipRequest: sip.Request;
    evtReceived: VoidSyncEvent;
}>;
export declare let asteriskSockets: sip.Store;
export declare let proxySocket: sip.Socket;
export declare function start(): Promise<void>;
