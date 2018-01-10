import * as express from "express";
import * as logger from "morgan";
import { Session } from "./mainWeb";
import { webApiDeclaration } from "../frontend";
const apiPath = webApiDeclaration.apiPath;
import JSON_= webApiDeclaration.JSON;
import { handlers } from "./webApiImplementation";

import "colors";

import * as _debug from "debug";
let debug = _debug("_webApiRouter");

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

export async function bodyParser(req: express.Request): Promise<any> {

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

        return JSON_.parse(rawBody);

    } catch{

        throw new Error("Bad request");

    }

}

export function start(app: express.Express) {

    let router = express.Router();

    app.use(`/${apiPath}`, router);

    router
        //.use(logger("dev"))
        .use("/:methodName", async (req, res) => {

            let badRequest = () => {
                (req.session! as Session).auth = undefined;
                res.status(httpCodes.badRequest).end();
            };

            let { methodName } = req.params;

            if (!handlers[methodName]) {
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
                        badRequest();
                        return;
                    }
                    break;
                default: badRequest(); return;
            }

            if (sanityChecks && !sanityChecks(params)) {
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
                res.status(httpCodes.internalServerError).end();
                return;
            }

            res.setHeader("Content-Type", `${contentType}; charset=utf-8`)

            res.status(httpCodes.ok);

            let rawResponse: string;

            if (contentType === "application/json") {

                rawResponse = JSON_.stringify(response);

            } else {

                rawResponse = response;

            }

            res.send(new Buffer(rawResponse, "utf8"));

        });

}
