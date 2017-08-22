import { SyncEvent } from "ts-events-extended";
import * as db from "./dbInterface";
import * as backendSipApi from "./backendSipApi";
export interface Contact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}
export declare namespace Contact {
    function readPushInfos(contactOrContactUri: Contact | string): {
        pushType: string | undefined;
        pushToken: string | undefined;
    };
    function buildUaInstancePk(contact: Contact): db.semasim.UaInstancePk;
    function buildValueOfUserAgentField(endpoint: string, instanceId: string, realUserAgent: string): string;
    function readInstanceId(contact: Contact): string;
    function readUserAgent(contact: Contact): string;
    function readFlowToken(contact: Contact): string;
    function readAstSocketSrcPort(contact: Contact): number;
    function pretty(contact: Contact): Record<string, string>;
}
export declare function getContactFromAstSocketSrcPort(astSocketSrcPort: number): Promise<Contact | undefined>;
export declare type WakeUpAllContactsTracer = SyncEvent<{
    type: "reachableContact";
    contact: Contact;
} | {
    type: "completed";
}>;
export declare function wakeUpAllContacts(endpoint: string, timeout?: number, evtTracer?: WakeUpAllContactsTracer): Promise<{
    reachableContacts: Contact[];
    unreachableContacts: Contact[];
}>;
export declare type WakeUpContactTracer = SyncEvent<backendSipApi.wakeUpUserAgent.Response["status"]>;
export declare function wakeUpContact(contact: Contact, timeout?: number, evtTracer?: WakeUpContactTracer): Promise<Contact | null>;
export declare function getEvtNewContact(): SyncEvent<Contact>;
export declare function getEvtExpiredContact(): SyncEvent<string>;
