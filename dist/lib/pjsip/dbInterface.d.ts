import { ExecQueue } from "ts-exec-queue";
export declare const callContext = "from-sip-call";
export declare const messageContext = "from-sip-message";
export declare const addEndpoint: ((imei: string, callback?: (() => void) | undefined) => Promise<void>) & ExecQueue;
