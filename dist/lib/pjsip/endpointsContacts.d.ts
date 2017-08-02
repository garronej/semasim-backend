import { SyncEvent } from "ts-events-extended";
export interface Contact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}
export declare function readInboundLocalPort(contact: Contact): number;
export declare function getContactFromInboundLocalPort(asteriskSocketLocalPort: number): Promise<Contact | undefined>;
export declare function getEvtNewContact(): SyncEvent<Contact>;
