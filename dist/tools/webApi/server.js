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
const express = require("express");
const misc = require("./misc");
const assert = require("assert");
function init(initParams) {
    let { app, apiPath, handlers } = initParams;
    let isAuthenticated = initParams.isAuthenticated || (req => false);
    let onError = initParams.onError || {};
    let logger = initParams.logger || {};
    let router = express.Router();
    app.use(`/${apiPath}`, router);
    router.use("/:methodName", (req, res) => __awaiter(this, void 0, void 0, function* () {
        let rsvDate = new Date();
        const handleError = buildHandleError(onError, req, res);
        let { methodName } = req.params;
        try {
            var { handler, sanityCheck, needAuth, contentType } = handlers[methodName];
        }
        catch (_a) {
            handleError.badRequest();
            if (!!logger.onMethodNotImplemented) {
                logger.onMethodNotImplemented(methodName, req);
            }
            return;
        }
        let isAuthenticatedVal = isAuthenticated(req, res);
        if (typeof isAuthenticatedVal !== "boolean") {
            isAuthenticatedVal = yield isAuthenticatedVal;
        }
        if (needAuth && !isAuthenticatedVal) {
            handleError.unauthorized();
            if (!!logger.onUnauthorized) {
                logger.onUnauthorized(methodName, req);
            }
            return;
        }
        let session = req.session || misc.buildDummySession();
        let params;
        switch (req.method) {
            case "GET":
                params = req.query;
                break;
            case "POST":
                let { isSuccess, data } = yield misc.bodyParser(req);
                try {
                    assert(isSuccess);
                    params = misc.JSON_CUSTOM.parse(data.toString("utf8"));
                }
                catch (_b) {
                    handleError.badRequest();
                    if (!!logger.onInvalidPostParams) {
                        logger.onInvalidPostParams(methodName, data, req);
                    }
                    return;
                }
                break;
            default:
                handleError.badRequest();
                if (!!logger.onUnsupportedHttpMethod) {
                    logger.onUnsupportedHttpMethod(methodName, req.method, req);
                }
                return;
        }
        if (!sanityCheck(params)) {
            handleError.badRequest();
            if (!!logger.onFailedSanityCheck) {
                logger.onFailedSanityCheck(methodName, params, req);
            }
            return;
        }
        let response;
        let dynamicallyDefinedContentType = undefined;
        try {
            response = yield handler(params, session, req.connection.remoteAddress, req, _contentType => dynamicallyDefinedContentType = _contentType);
        }
        catch (error) {
            res.status(misc.errorHttpCode.get(error)).end();
            if (!!logger.onHandlerThrow) {
                logger.onHandlerThrow(methodName, params, error, req);
            }
            return;
        }
        let data;
        if (contentType === misc.ContentTypeJSON_CUSTOM) {
            let str;
            try {
                assert(response !== null);
                assert(!(typeof response === "number" && isNaN(response)));
                str = misc.JSON_CUSTOM.stringify(response);
            }
            catch (_c) {
                if (!!logger.onHandlerReturnsNotStringifiableResp) {
                    logger.onHandlerReturnsNotStringifiableResp(methodName, params, response, req);
                }
                return;
            }
            data = Buffer.from(str, "utf8");
        }
        else {
            data = response;
        }
        res.status(misc.httpCodes.OK);
        res.setHeader("Content-Type", dynamicallyDefinedContentType || contentType);
        res.send(data);
        if (!!logger.onRequestSuccessfullyHandled) {
            logger.onRequestSuccessfullyHandled(methodName, params, response, req, rsvDate);
        }
    }));
}
exports.init = init;
function buildHandleError(onError, req, res) {
    return {
        "badRequest": () => {
            if (!!onError.badRequest) {
                onError.badRequest(req);
            }
            res.status(misc.httpCodes.BAD_REQUEST).end();
        },
        "unauthorized": () => {
            if (!!onError.unauthorized) {
                onError.unauthorized(req);
            }
            res.status(misc.httpCodes.UNAUTHORIZED).end();
        }
    };
}
exports.buildHandleError = buildHandleError;
