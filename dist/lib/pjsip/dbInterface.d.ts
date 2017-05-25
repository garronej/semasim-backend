import { ExecQueue } from "ts-exec-queue";
export declare const callContext: (endpoint: string) => string;
export declare const messageContext = "from-sip-message";
export declare const queryEndpoints: ((callback?: ((endpoints: string[]) => void) | undefined) => Promise<string[]>) & ExecQueue;
export declare const addOrUpdateEndpoint: ((endpoint: string, callback?: (() => void) | undefined) => Promise<void>) & ExecQueue;
