import { ExecQueue } from "ts-exec-queue";
import { Contact } from "./endpointsContacts";
export declare const callContext = "from-sip-call";
export declare const messageContext = "from-sip-message";
export declare const subscribeContext: (imei: string) => string;
export declare const queryEndpoints: ((callback?: any) => Promise<{
    endpoint: string;
    lastUpdated: number;
}[]>) & ExecQueue;
export declare const truncateContacts: ((callback?: any) => Promise<void>) & ExecQueue;
export declare const queryContacts: ((callback?: any) => Promise<Contact[]>) & ExecQueue;
export declare const deleteContact: ((id: string, callback?: any) => Promise<boolean>) & ExecQueue;
export declare const addOrUpdateEndpoint: ((endpoint: string, isDongleConnected: boolean, callback?: any) => Promise<void>) & ExecQueue;
