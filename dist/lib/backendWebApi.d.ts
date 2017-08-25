/// <reference types="express" />
import * as express from "express";
export declare function startServer(): Promise<void>;
export declare namespace createUserEndpointConfig {
    const methodName = "create-user-endpoint-config";
    function handler(req: express.Request, res: express.Response): Promise<void>;
}
export declare namespace getUserConfig {
    const methodName = "get-user-config";
    function handler(req: express.Request, res: express.Response): Promise<void>;
}
