/// <reference types="express" />
import * as express from "express";
import { Contact } from "../admin";
export declare const webApiPath = "outbound-sip-proxy-api";
export declare const webApiPort = 4430;
export declare function startServer(): Promise<void>;
export declare namespace wakeUpDevice {
    type StatusMessage = "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "FAIL";
    const methodName = "wake-up-device";
    function handler(req: express.Request, res: express.Response): Promise<void>;
    function run(contact: Contact): Promise<StatusMessage>;
}
