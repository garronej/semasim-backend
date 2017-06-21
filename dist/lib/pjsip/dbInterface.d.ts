import { ExecQueue } from "ts-exec-queue";
export declare const callContext = "from-sip-call";
export declare const messageContext = "from-sip-message";
export declare const subscribeContext: (imei: string) => string;
export declare const queryEndpoints: ((callback?: any) => Promise<{
    endpoint: string;
    lastUpdated: number;
}[]>) & ExecQueue;
export declare const truncateContacts: ((callback?: any) => Promise<void>) & ExecQueue;
export declare function queryContactsOfEndpoints(endpoint: string): Promise<string[]>;
export declare function getContactOfFlow(flowToken: string): Promise<string | undefined>;
export declare function deleteContactOfFlow(flowToken: string): Promise<boolean>;
export declare const addOrUpdateEndpoint: ((endpoint: string, isDongleConnected: boolean, callback?: any) => Promise<void>) & ExecQueue;
