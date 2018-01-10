/// <reference types="express" />
import * as express from "express";
import { Session } from "./mainWeb";
import "colors";
export declare type Handler<Params, Response> = {
    needAuth: boolean;
    contentType: "application/json" | "application/xml";
    sanityChecks?: (params: Params) => boolean;
    handler: (params: Params, session: Session, remoteAddress: string) => Promise<Response>;
};
export declare type Handlers = {
    [methodName: string]: Handler<any, any>;
};
export declare function bodyParser(req: express.Request): Promise<any>;
export declare function start(app: express.Express): void;
