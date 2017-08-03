import * as https from "https";
import * as outbound from "./outbound";
import * as express from "express";
import * as logger from "morgan";
import * as bodyParser from "body-parser";
import { Contact } from "../admin";
import * as nodeRestClient from "node-rest-client";
import * as sip from "./sip";
import * as firebase from "../admin/firebase";

import * as _debug from "debug";
let debug = _debug("_sipProxy/outbound.webApi");


export const webApiPath = "outbound-sip-proxy-api";
export const webApiPort = 4430;

export function startServer(): Promise<void> {

    return new Promise<void>(resolve => {

        let router = express.Router()
            .use(logger("dev"))
            .use(bodyParser.json())
        router.post("/:method", function (req, res) {

            //res.setHeader("Access-Control-Allow-Origin", "*");

            switch (req.params.method) {
                case wakeUpDevice.methodName: return wakeUpDevice.handler(req, res);
                default: return res.status(400).end();
            }


        });

        let app = express()
            .use(`/${webApiPath}`, router);

        let httpsServer = https.createServer(outbound.getTlsOptions())
            .on("request", app)
            .listen(webApiPort)
            .on("listening", () => resolve());

    });



}



export namespace wakeUpDevice {

    export type StatusMessage = "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "FAIL";

    export const methodName = "wake-up-device";

    export async function handler(req: express.Request, res: express.Response) {

        let contact: Contact= JSON.parse(req.body.contact);

        res.statusMessage= await ( async (): Promise<StatusMessage>=>{

            let reached = await outbound.qualifyContact(contact);

            if( reached ) return "REACHABLE";

            let { params } = sip.parseUri(contact.uri);

            if (params["pn-type"] !== "firebase") {

                debug("Only firebase supported");

                return "FAIL";

            }

            try {

                let response = await firebase.wakeUpDevice(params["pn-tok"]!);

                debug({ response });

                return "PUSH_NOTIFICATION_SENT";

            } catch (error) {

                debug("Error firebase", error);

                return "FAIL";

            }

        })();

        res.status(200).end();


    }

    export function run(contact: Contact): Promise<StatusMessage> {

        return new Promise<StatusMessage>((resolve, reject) => {

            let client = new nodeRestClient.Client();

            client.post(
                buildUrl(methodName),
                buildPostData({ "contact": JSON.stringify(contact) }),
                (data, { statusCode, statusMessage }) => {

                    if (statusCode !== 200) return reject(new Error(`webAPI ${methodName} error ${statusCode}`));

                    //console.log({ "data": data.toString("utf8") });

                    resolve(statusMessage);

                });



        });


    }

}

function buildUrl(methodName: string): string {
    return `https://${outbound.hostname}:${webApiPort}/${webApiPath}/${methodName}`;
}

function buildPostData(data: Record<string, string>): any {
    return { data, "headers": { "Content-Type": "application/json" } };
}




/*


                */
