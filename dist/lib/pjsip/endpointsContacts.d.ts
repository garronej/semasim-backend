import { SyncEvent } from "ts-events-extended";
export declare function getAvailableContactsOfEndpoint(endpoint: string): Promise<string[]>;
export declare function getEvtNewContact(): SyncEvent<{
    endpoint: string;
    contact: string;
    rinstance: string;
}>;
