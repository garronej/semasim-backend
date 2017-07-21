import * as sip from "./sip";
import { SyncEvent } from "ts-events-extended";
import { Contact } from "../pjsip";
import "colors";
export declare const evtIncomingMessage: SyncEvent<{
    contact: Contact;
    message: sip.Request;
}>;
export declare function sendMessage(contact: Contact, number: string, headers: Record<string, string>, content: string, contactName?: string): Promise<boolean>;
export declare let asteriskSockets: sip.Store;
export declare function start(): Promise<void>;
