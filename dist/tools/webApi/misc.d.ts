/// <reference types="node" />
/// <reference types="express-session" />
import * as express from "express";
import { InitParams } from "./types";
import "colors";
export declare const JSON_CUSTOM: {
    "stringify": (obj: any) => string;
    "parse": (str: string) => any;
};
/**
 * NOTE: stringifyAuthentication may be called before
 * isAuthenticated have resolved. Do not assume req.session
 * to be set.
 */
export declare function getDefaultLogger(options?: Partial<{
    idString: string;
    log: typeof console.log;
    logOnlyErrors: boolean;
    logOnlyMethods: string[];
    stringifyAuthentication(req: express.Request): string;
}>): InitParams.Logger;
export declare const ContentTypeJSON_CUSTOM = "application/json-custom; charset=utf-8";
export declare function bodyParser(req: express.Request): Promise<{
    isSuccess: boolean;
    data: Buffer;
}>;
export declare const httpCodes: {
    "OK": number;
    "BAD_REQUEST": number;
    "UNAUTHORIZED": number;
    "LOCKED": number;
    "PAYMENT_REQUIRED": number;
    "INTERNAL_SERVER_ERROR": number;
};
export declare namespace errorHttpCode {
    function set(error: Error, code: number): void;
    function get(error: any): number;
}
export declare function buildDummySession(): Express.Session;
