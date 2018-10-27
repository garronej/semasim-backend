/// <reference types="express-session" />
/// <reference types="node" />
import * as express from "express";
import { ContentTypeJSON_CUSTOM } from "./misc";
export declare type PromiseOrSync<T> = T | Promise<T>;
export declare namespace Handler {
    type Method<Params, Response> = (params: Params, session: Express.Session, remoteAddress: string, req: express.Request, overwriteResponseContentType: (contentType: string) => void) => PromiseOrSync<Response>;
    type SanityCheck<Params> = (params: Params) => boolean;
    type JSON<Params, Response> = {
        needAuth: boolean;
        contentType: typeof ContentTypeJSON_CUSTOM;
        sanityCheck: SanityCheck<Params>;
        handler: Method<Params, Response>;
    };
    type Generic<Params> = {
        needAuth: boolean;
        contentType: string;
        sanityCheck: SanityCheck<Params>;
        handler: Method<Params, Buffer>;
    };
}
export declare type Handlers = {
    [methodName: string]: Handler.JSON<any, any> | Handler.Generic<any>;
};
export declare type InitParams = {
    app: express.Express;
    apiPath: string;
    handlers: Handlers;
    isAuthenticated?: InitParams.IsAuthenticated;
    onError?: Partial<InitParams.OnError>;
    logger?: Partial<InitParams.Logger>;
};
export declare namespace InitParams {
    /**
     * The function should return true if the user is authenticated.
     *
     * This function will be called each time the API receive a call,
     * even if the handler is needAuth === false.
     * In consequence it can be used to asynchronously load the session
     * object.
     *
     * NOTE:If after calling there is no session property on req then a dummy
     * session object will be passed to the handlers.
     *
    */
    type IsAuthenticated = (req: express.Request, res: express.Response) => PromiseOrSync<boolean>;
    type OnError = {
        badRequest(req: express.Request): void;
        unauthorized(req: express.Request): void;
    };
    type Logger = {
        onMethodNotImplemented(methodName: string | undefined, req: express.Request): void;
        onUnsupportedHttpMethod(methodName: string, httpMethod: string, req: express.Request): void;
        onInvalidPostParams(methodName: string, rawParams: Buffer, req: express.Request): void;
        onFailedSanityCheck(methodName: string, params: any, req: express.Request): void;
        onHandlerThrow(methodName: string, params: any, error: Error, req: express.Request): void;
        onHandlerReturnsNotStringifiableResp(methodName: string, params: any, response: any, req: express.Request): void;
        onUnauthorized(methodName: string, req: express.Request): any;
        onRequestSuccessfullyHandled(methodName: string, params: any, response: any, req: express.Request, rsvDate: Date): void;
    };
}
