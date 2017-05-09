import { ExecQueue } from "ts-exec-queue";
import { SyncEvent } from "ts-events-extended";
export declare type ContactStatus = "Avail" | "Unavail" | "Unknown";
export declare namespace pjsip {
    const addEndpoint: ((imei: string, callback?: (() => void) | undefined) => Promise<void>) & ExecQueue;
    function getContacts(): Promise<{
        [endpoint: string]: {
            status: ContactStatus;
            contact: string;
        }[];
    }>;
    function getContactStatus(contact: string): Promise<ContactStatus | undefined>;
    function getAvailableEndpointContacts(endpoint: string): Promise<string[]>;
    const evtNewContact: SyncEvent<string>;
}
