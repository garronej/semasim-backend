/// <reference types="express" />
import * as express from "express";
import * as gatewaySipApi from "./gatewaySipApi";
export declare function startServer(): Promise<void>;
export declare namespace getUserConfig {
    const methodName = "get-user-config";
    function handler(req: express.Request, res: express.Response): Promise<void>;
}
export declare namespace getConfigAndUnlock {
    const methodName = "get-config-and-unlock";
    function handler(req: express.Request, res: express.Response): Promise<void>;
    function run(params: gatewaySipApi.unlockDongle.Request): Promise<string>;
}
