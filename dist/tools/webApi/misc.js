"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttJC = require("transfer-tools/dist/lib/JSON_CUSTOM");
require("colors");
exports.JSON_CUSTOM = ttJC.get();
function getDefaultLogger(options) {
    options = options || {};
    let idString = options.idString || "";
    let log = options.log || console.log;
    let logOnlyErrors = options.logOnlyErrors || false;
    let logOnlyMethods = options.logOnlyMethods;
    let stringifyAuthentication = options.stringifyAuthentication;
    const base = (methodName, req, isError, date = new Date()) => [
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
        }
        else {
            return JSON.stringify(response);
        }
    };
    return {
        "onMethodNotImplemented": (methodName, req) => log(`${base(methodName || "< no method >", req, true)}Method not implemented`),
        "onUnsupportedHttpMethod": (methodName, httpMethod, req) => log(`${base(methodName, req, true)}Unsupported HTTP method: ${httpMethod}`),
        "onInvalidPostParams": (methodName, rawParams, req) => log(`${base(methodName, req, true)}Invalid post params: ${rawParams.toString("utf8")}`),
        "onFailedSanityCheck": (methodName, params, req) => log(`${base(methodName, req, true)}Params did not pass sanity checks`, JSON.stringify(params, null, 2)),
        "onHandlerThrow": (methodName, params, error, req) => log(`${base(methodName, req, true)}Handler function has throw an error, params: `, JSON.stringify(params, null, 2), error),
        "onHandlerReturnsNotStringifiableResp": (methodName, params, response, req) => log(`${base(methodName, req, true)}Handler function returned not stringifiable response, params: `, JSON.stringify(params, null, 2), { response }),
        "onUnauthorized": (methodName, req) => log(`${base(methodName, req, true)}Unauthorized`),
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
exports.getDefaultLogger = getDefaultLogger;
exports.ContentTypeJSON_CUSTOM = "application/json-custom; charset=utf-8";
function bodyParser(req) {
    return __awaiter(this, void 0, void 0, function* () {
        let parts = [];
        let isSuccess = true;
        let timer = setTimeout(() => {
            isSuccess = false;
            req.emit("end");
        }, 1000);
        req.on("data", data => {
            if (typeof data === "string") {
                parts.push(Buffer.from(data, "utf8"));
            }
            else {
                parts.push(data);
            }
        });
        yield new Promise(resolve => {
            clearTimeout(timer);
            req.once("end", () => resolve());
        });
        return {
            isSuccess,
            "data": Buffer.concat(parts, parts.reduce((total, elem) => total += elem.length, 0)),
        };
    });
}
exports.bodyParser = bodyParser;
exports.httpCodes = {
    "OK": 200,
    "BAD_REQUEST": 400,
    "UNAUTHORIZED": 401,
    "LOCKED": 423,
    "PAYMENT_REQUIRED": 402,
    "INTERNAL_SERVER_ERROR": 500
};
var errorHttpCode;
(function (errorHttpCode) {
    let key = "__http_code__";
    function set(error, code) {
        error[key] = code;
    }
    errorHttpCode.set = set;
    function get(error) {
        try {
            let code = error[key];
            console.assert(typeof code === "number" && !isNaN(code));
            return code;
        }
        catch (_a) {
            return exports.httpCodes.INTERNAL_SERVER_ERROR;
        }
    }
    errorHttpCode.get = get;
})(errorHttpCode = exports.errorHttpCode || (exports.errorHttpCode = {}));
function buildDummySession() {
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
exports.buildDummySession = buildDummySession;
