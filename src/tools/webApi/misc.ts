import * as express from "express";
import * as ttJC from "transfer-tools/dist/lib/JSON_CUSTOM";
import { InitParams } from "./types";

import "colors";

export const JSON_CUSTOM = ttJC.get();

export function getDefaultLogger(
    options?: Partial<{
        idString: string;
        log: typeof console.log;
        logOnlyErrors: boolean;
        logOnlyMethods: string[];
        stringifyAuthentication(req: express.Request): string;
    }>
): InitParams.Logger {

    options = options || {};

    let idString = options.idString || "";
    let log = options.log || console.log;
    let logOnlyErrors = options.logOnlyErrors || false;
    let logOnlyMethods = options.logOnlyMethods;
    let stringifyAuthentication = options.stringifyAuthentication;

    const base = (methodName: string, req: express.Request, isError: boolean, date= new Date()) => [
        `${date.getHours()}h ${date.getMinutes()}m ${date.getSeconds()}s ${date.getMilliseconds()}ms`,
        isError ? `[ Web API ${idString} Error ]`.red : `[ Web API ${idString} ]`.cyan,
        `from: ${req.connection.remoteAddress}`,
        stringifyAuthentication ? stringifyAuthentication(req) : "",
        methodName.yellow,
        "\n"
    ].join(" ");

    const responseToString = response => {

        if (response instanceof Buffer) {
            return response.toString("utf8");
        } else {
            return JSON.stringify(response);
        }

    };

    return {
        "onMethodNotImplemented": (methodName, req) =>
            log(`${base(methodName || "< no method >", req, true)}Method not implemented`),
        "onUnsupportedHttpMethod": (methodName, httpMethod, req) =>
            log(`${base(methodName, req, true)}Unsupported HTTP method: ${httpMethod}`),
        "onInvalidPostParams": (methodName, rawParams, req) =>
            log(`${base(methodName, req, true)}Invalid post params: ${rawParams.toString("utf8")}`),
        "onFailedSanityCheck": (methodName, params, req) =>
            log(
                `${base(methodName, req, true)}Params did not pass sanity checks`, 
                JSON.stringify(params, null, 2)
            ),
        "onHandlerThrow": (methodName, params, error, req) =>
            log(
                `${base(methodName, req, true)}Handler function has throw an error, params: `, 
                JSON.stringify(params, null, 2), 
                error
            ),
        "onHandlerReturnsNotStringifiableResp": (methodName, params, response, req) => 
            log(
                `${base(methodName, req, true)}Handler function returned not stringifiable response, params: `, 
                JSON.stringify(params, null, 2), 
                { response }
            ),
        "onUnauthorized": (methodName, req) =>
            log(`${base(methodName, req, true)}Unauthorized`),
        "onRequestSuccessfullyHandled": (methodName, params, response, req, rsvDate) => {

            if (logOnlyErrors) {
                return;
            }

            if (logOnlyMethods && !logOnlyMethods.find(m => m === methodName)) {
                return;
            }

            log([
                base(methodName, req, false, rsvDate),
                `${"---Params:".blue}   ${JSON.stringify(params)}\n`,
                `${"---Response:".blue} ${responseToString(response)}\n`,
                `${"---Runtime:".yellow}  ${Date.now() - rsvDate.getTime()}ms\n`
            ].join(""));

        }
    };

}

export const ContentTypeJSON_CUSTOM = "application/json-custom; charset=utf-8";

export async function bodyParser(req: express.Request): Promise<{ isSuccess: boolean; data: Buffer; }> {

    let parts: Buffer[] = [];

    let isSuccess = true;

    let timer = setTimeout(() => {

        isSuccess = false;

        req.emit("end");

    }, 1000);

    req.on("data", data => {

        if (typeof data === "string") {
            parts.push(Buffer.from(data, "utf8"));
        } else {
            parts.push(data);
        }

    });

    await new Promise<void>(resolve => {
        clearTimeout(timer);
        req.once("end", () => resolve());
    });

    return {
        isSuccess,
        "data": Buffer.concat(
            parts,
            parts.reduce((total, elem) => total += elem.length, 0)
        ),
    };

}

export const httpCodes = {
    "OK": 200,
    "BAD_REQUEST": 400,
    "UNAUTHORIZED": 401,
    "LOCKED": 423,
    "PAYMENT_REQUIRED": 402,
    "INTERNAL_SERVER_ERROR": 500
};

export namespace errorHttpCode {

    let key = "__http_code__";

    export function set(error:Error, code: number): void{
        error[key]= code;
    }

    export function get(error): number {

        try{ 

            let code= error[key];

            console.assert( typeof code === "number" && !isNaN(code) );

            return code;

        }catch{

            return httpCodes.INTERNAL_SERVER_ERROR;

        }

    }

}


export function buildDummySession(): Express.Session {
    return {
        "id": "dummy",
        "regenerate": () => { },
        "destroy": () => { },
        "reload": () => { },
        "save": () => { },
        "touch": () => { },
        "cookie": {
            "originalMaxAge": -1,
            "path": "dummy",
            "maxAge": null,
            "httpOnly": false,
            "expires": false,
            "serialize": () => ""
        }
    };
}




