import { SyncEvent } from "ts-events-extended";
export interface Contact {
    id: string;
    uri: string;
    path: string;
    endpoint: string;
    user_agent: string;
}
export declare function getEvtNewContact(): SyncEvent<Contact>;
export declare function readAsteriskSocketLocalPortFromPath(path: string): number;
