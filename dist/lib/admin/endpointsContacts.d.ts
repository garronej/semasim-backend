import { SyncEvent } from "ts-events-extended";
export interface Contact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}
export declare namespace Contact {
    function buildValueOfUserAgentField(endpoint: string, instanceId: string, realUserAgent: string): string;
    function readInstanceId(contact: Contact): string;
    function readFlowToken(contact: Contact): string;
    function readAstSocketSrcPort(contact: Contact): number;
}
export declare function getContactFromAstSocketSrcPort(astSocketSrcPort: number): Promise<Contact | undefined>;
export declare function wakeUpAllContacts(endpoint: string, timeout?: number): {
    all: Promise<{
        reachableContacts: Contact[];
        unreachableContacts: Contact[];
    }>;
    evtReachableContact: SyncEvent<Contact | "COMPLETED">;
};
export declare function wakeUpContact(contact: Contact, timeout?: number): Promise<Contact>;
export declare function getEvtNewContact(): SyncEvent<Contact>;
