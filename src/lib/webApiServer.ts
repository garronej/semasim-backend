import * as express from "express";
import { Session } from "./web";
import { webApiDeclaration, JSON_CUSTOM } from "../semasim-frontend";
const apiPath = webApiDeclaration.apiPath;

import "colors";
import * as _debug from "debug";
let debug = _debug("_webApiServer");

export type Handler<Params, Response>={
    needAuth: boolean;
    contentType: "application/json" | "application/xml";
    sanityChecks?: (params: Params) => boolean;
    handler: ( params: Params, session: Session, remoteAddress: string) => Promise<Response>;
}

export type Handlers = {
    [methodName: string]: Handler<any, any>;
};

const httpCodes = {
    "ok": 200,
    "badRequest": 400,
    "unauthorized": 401,
    "internalServerError": 500,
};

async function bodyParser(req: express.Request): Promise<any> {

    let rawBody = "";

    let timer = setTimeout(() => {
        rawBody = "!";
        req.emit("end");
    }, 1000);

    req.on("data", (buff: Buffer) => rawBody += buff.toString("utf8"));

    await new Promise<void>(resolve => {
        clearTimeout(timer);
        req.once("end", () => resolve());
    });

    try {

        return JSON_CUSTOM.parse(rawBody);

    } catch{

        throw new Error("Bad request");

    }

}

export function start(
    app: express.Express,
    handlers: Handlers
) {

    let router = express.Router();

    app.use(`/${apiPath}`, router);

    router
        .use("/:methodName", async (req, res) => {

            let badRequest = () => {
                (req.session! as Session).auth = undefined;
                res.status(httpCodes.badRequest).end();
            };

            let { methodName } = req.params;

            if (!handlers[methodName]) {
                console.log("no handler".red, { methodName });
                badRequest();
                return;
            }

            let { handler, sanityChecks, needAuth, contentType } = handlers[methodName];

            let session: Session = req.session!;

            if (needAuth && !session.auth) {
                res.status(httpCodes.unauthorized).end();
                return;
            }

            let params: any;

            switch (req.method) {
                case "GET": params = req.query; break;
                case "POST": 
                    try{
                        params= await bodyParser(req);
                    }catch{
                        console.log("body could not be parsed".red, { params, methodName });
                        badRequest();
                        return;
                    }
                    break;
                default: badRequest(); return;
            }

            if (sanityChecks && !sanityChecks(params)) {
                console.log("sanity checks failed".red, { params, methodName });
                badRequest();
                return;
            }

            let response: any;

            try {

                response = await handler(
                    params,
                    session,
                    req.connection.remoteAddress
                );

            } catch (error) {

                debug("WEB API INTERNAL SERVER ERROR".red,{ methodName, params}, error);

                res.status(httpCodes.internalServerError).end();
                return;
            }

            res.setHeader("Content-Type", `${contentType}; charset=utf-8`)

            res.status(httpCodes.ok);

            let rawResponse: string;

            if (contentType === "application/json") {

                rawResponse = JSON_CUSTOM.stringify(response);

            } else {

                rawResponse = response;

            }

            res.send(Buffer.from(rawResponse, "utf8"));

        });

}
