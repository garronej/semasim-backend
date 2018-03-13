import * as express from "express";
import * as misc from "./misc";
import { InitParams } from "./types";

export function init(initParams: InitParams): void {

    let { app, apiPath, handlers } = initParams;

    let isAuthenticated = initParams.isAuthenticated || (req => false);

    let onError = initParams.onError || {};
    let logger = initParams.logger || {};

    let router = express.Router();

    app.use(`/${apiPath}`, router);

    router.use("/:methodName",
        async (req, res) => {

            const handleError = buildHandleError(onError, req, res);

            let { methodName } = req.params;

            try {

                var {
                    handler, sanityCheck, needAuth, contentType
                } = handlers[methodName];

            } catch{

                handleError.badRequest();

                if (!!logger.onMethodNotImplemented) {

                    logger.onMethodNotImplemented(methodName, req);

                }

                return;

            }

            let isAuthenticatedVal = isAuthenticated(req, res);

            if (typeof isAuthenticatedVal !== "boolean") {

                isAuthenticatedVal = await isAuthenticatedVal;

            }

            if (needAuth && !isAuthenticatedVal) {

                handleError.unauthorized();

                if( !!logger.onUnauthorized ){

                    logger.onUnauthorized(methodName, req);

                }

                return;

            }

            let session: Express.Session =
                req.session || misc.buildDummySession();

            let params: any;

            switch (req.method) {
                case "GET":
                    params = req.query;

                    break;
                case "POST":

                    let { isSuccess, data } = await misc.bodyParser(req);

                    try {

                        console.assert(isSuccess);

                        params = misc.JSON_CUSTOM.parse(data.toString("utf8"));


                    } catch{

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

            let response: any;

            try {

                response = await handler(
                    params, session,
                    req.connection.remoteAddress, req
                );

            } catch (error) {

                if( !!logger.onHandlerThrow ){

                    logger.onHandlerThrow(methodName, params, error, req);

                }

                return;

            }

            let data: Buffer;

            if (contentType === misc.ContentTypeJSON_CUSTOM) {

                let str: string;

                try {

                    console.assert(response !== null);
                    console.assert(!(typeof response === "number" && isNaN(response)));

                    str = misc.JSON_CUSTOM.stringify(response);

                } catch {

                    if( !!logger.onHandlerReturnsNotStringifiableResp ){

                        logger.onHandlerReturnsNotStringifiableResp(methodName, params, response, req);

                    }

                    return;

                }

                data = Buffer.from(str, "utf8");

            } else {

                data = response;

            }

            res.status(misc.httpCodes.OK);

            res.setHeader("Content-Type", contentType);

            res.send(data);

            if (!!logger.onRequestSuccessfullyHandled) {

                logger.onRequestSuccessfullyHandled(methodName, params, response, req);

            }


        }
    );

}

export function buildHandleError(
    onError: Partial<InitParams.OnError>,
    req: express.Request,
    res: express.Response
) {

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
