import * as express from "express";
import { ContentTypeJSON_CUSTOM } from "./misc";

export type PromiseOrSync<T>= T | Promise<T>;

export namespace Handler {

    export type Method<Params, Response>= 
        (params: Params, session: Express.Session, remoteAddress: string, req: express.Request) => PromiseOrSync<Response>;
    
    export type SanityCheck<Params>= 
        (params: Params) => boolean;

    export type JSON<Params, Response> = {
        needAuth: boolean;
        contentType: typeof ContentTypeJSON_CUSTOM;
        sanityCheck: SanityCheck<Params>;
        handler: Method<Params, Response>
    };

    export type Generic<Params> = {
        needAuth: boolean;
        contentType: string //ex:"application/xml; charset=utf-8";
        sanityCheck: SanityCheck<Params>;
        handler: Method<Params, Buffer>
    };

}

export type Handlers = {
    [methodName: string]: Handler.JSON<any, any> | Handler.Generic<any>;
};

export type InitParams = {
    app: express.Express;
    apiPath: string;
    handlers: Handlers;
    isAuthenticated?: InitParams.IsAuthenticated;
    onError?: Partial<InitParams.OnError>;
    logger?: Partial<InitParams.Logger>;
};

export namespace InitParams {

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
    export type IsAuthenticated = (req: express.Request, res: express.Response) => PromiseOrSync<boolean>;


    export type OnError = {
        badRequest(req: express.Request): void;
        unauthorized(req: express.Request): void;
    };

    export type Logger = {
        onMethodNotImplemented(methodName: string | undefined, req: express.Request): void;
        onUnsupportedHttpMethod(methodName: string, httpMethod: string, req: express.Request): void;
        onInvalidPostParams(methodName: string, rawParams: Buffer, req: express.Request): void;
        onFailedSanityCheck(methodName: string, params: any, req: express.Request): void;
        onHandlerThrow(methodName: string, params: any, error: Error, req: express.Request): void;
        onHandlerReturnsNotStringifiableResp(methodName: string, params: any, response: any, req: express.Request): void;
        onUnauthorized(methodName: string, req: express.Request);
        onRequestSuccessfullyHandled(methodName: string, params: any, response: any, req: express.Request, rsvDate: Date): void
    };


}