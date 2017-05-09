import { ExecQueue } from "ts-exec-queue";
export declare namespace pjsipConfig {
    const addEndpoint: ((imei: string, callback?: (() => void) | undefined) => Promise<void>) & ExecQueue;
}
