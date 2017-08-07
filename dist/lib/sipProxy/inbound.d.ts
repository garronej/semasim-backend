import * as sip from "./sip";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import { Contact } from "../admin";
import "colors";
export declare const evtIncomingMessage: SyncEvent<{
    contact: Contact;
    message: sip.Request;
}>;
export declare const evtOutgoingMessage: SyncEvent<{
    sipRequest: sip.Request;
    evtReceived: VoidSyncEvent;
}>;
export declare let asteriskSockets: sip.Store;
export declare let proxySocket: sip.Socket;
export declare function start(): Promise<void>;
