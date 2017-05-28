import { ExecQueue } from "ts-exec-queue";
export declare const callContext = "from-sip-call";
export declare const messageContext = "from-sip-message";
export declare const subscribeContext: (imei: string) => string;
export declare const queryEndpoints: ((callback?: ((endpoints: string[]) => void) | undefined) => Promise<string[]>) & ExecQueue;
export declare const addOrUpdateEndpoint: ((endpoint: string, callback?: (() => void) | undefined) => Promise<void>) & ExecQueue;
