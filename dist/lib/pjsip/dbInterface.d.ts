import { ExecQueue } from "ts-exec-queue";
export declare const callContext: (endpoint: string) => string;
export declare const messageContext = "from-sip-message";
export declare const addOrUpdateEndpoint: ((endpoint: string, callback?: (() => void) | undefined) => Promise<void>) & ExecQueue;
