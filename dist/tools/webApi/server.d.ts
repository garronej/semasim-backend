import * as express from "express";
import { InitParams } from "./types";
export declare function init(initParams: InitParams): void;
export declare function buildHandleError(onError: Partial<InitParams.OnError>, req: express.Request, res: express.Response): {
    "badRequest": () => void;
    "unauthorized": () => void;
};
