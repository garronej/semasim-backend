import { Contact } from "./endpointsContacts";
import * as sip from "../sipProxy/sip";
import { SyncEvent } from "ts-events-extended";
export declare const evtMessage: SyncEvent<{
    contact: Contact;
    message: sip.Request;
}>;
export declare function sendMessage(contact: Contact, number: string, headers: Record<string, string>, content: string, contactName?: string): Promise<boolean>;
