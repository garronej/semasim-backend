/// <reference types="express" />
import * as express from "express";
import * as inboundApi from "./inboundSipApi";
export declare function startServer(): Promise<void>;
export declare namespace getConfigAndUnlock {
    const methodName = "get-config-and-unlock";
    function handler(req: express.Request, res: express.Response): Promise<void>;
    function run(params: inboundApi.unlockDongle.Request): Promise<string>;
}
