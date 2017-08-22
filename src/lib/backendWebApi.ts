import * as https from "https";
import * as express from "express";
import * as logger from "morgan";
import * as fs from "fs";
import * as path from "path";
import * as nodeRestClient from "node-rest-client";
import * as gatewaySipApi from "./gatewaySipApi";
import { gatewaySockets } from "./backendSipProxy";

import * as c from "./_constants";

import * as _debug from "debug";
let debug = _debug("_backendWebApi");

export function startServer(): Promise<void> {

    return new Promise<void>(resolve => {

        let router = express.Router()
            .use(logger("dev"))
        router.get("/:method", (req, res) => {

            switch (req.params.method) {
                case getConfigAndUnlock.methodName: return getConfigAndUnlock.handler(req, res);
                default: return res.status(400).end();
            }

        });

        let app = express()
            .use(`/${c.webApiPath}`, router);

        let httpsServer = https.createServer(c.getTlsOptions())
            .on("request", app)
            .listen(c.webApiPort)
            .on("listening", () => resolve());

    });

}

export namespace getConfigAndUnlock {

    let xml: string | undefined= undefined;

    function generateXml(
        imei: string,
        last_four_digits_of_iccid: string
    ) {

        if( !xml ){
            xml= fs.readFileSync(path.join(__dirname, "..", "..", "res", "remote_provisioning.xml"), "utf8");
            xml = xml.replace(/DOMAIN/g, c.backendHostname);
            xml = xml.replace(/REG_EXPIRES/g, `${c.reg_expires}`);
        }

        let newXml= xml;

        newXml = newXml.replace(/IMEI/g, imei);
        newXml = newXml.replace(/LAST_FOUR_DIGITS_OF_ICCID/g, last_four_digits_of_iccid);
        newXml = newXml.replace(/DISPLAY_NAME/g, "XXXXXXX");

        return newXml;


    }



    export const methodName = "get-config-and-unlock";

    function validateQueryString(query: Object): query is gatewaySipApi.unlockDongle.Request {

        try {

            let {
            imei,
                last_four_digits_of_iccid,
                pin_first_try,
                pin_second_try
        } = query as gatewaySipApi.unlockDongle.Request;

            return (
                imei.match(/^[0-9]{15}$/) !== null &&
                last_four_digits_of_iccid.match(/^[0-9]{4}$/) !== null &&
                pin_first_try.match(/^[0-9]{4}$/) !== null &&
                ( pin_second_try === undefined  || pin_second_try.match(/^[0-9]{4}$/) !== null )
            );

        } catch (error) {
            return false;
        }

    }

    export async function handler(
        req: express.Request, 
        res: express.Response
    ) {

        try {

            debug("=>getConfig");

            let query: Object = req.query;

            debug({ query });

            if (!validateQueryString(query))
                throw new Error("INVALID_QUERY");

            let gatewaySocket = gatewaySockets.get(query.imei);

            if (!gatewaySocket) throw new Error("GATEWAY_NOT_FOUND");

            let resp = await gatewaySipApi.unlockDongle.run(gatewaySocket, query);

            if( resp.pinState !== "READY" ) 
                throw new Error("UNLOCK_FAILED");

            debug({ resp });

            res.setHeader("Content-Type", "application/xml; charset=utf-8");

            let xml= generateXml(query.imei, query.last_four_digits_of_iccid);

            debug(xml);

            res.status(200).send(new Buffer(xml, "utf8"));

        } catch (error) {

            debug(error.message);

            res.statusMessage = error.message;

            res.status(400).end();

        }

    }

    export function run(
        params: gatewaySipApi.unlockDongle.Request
    ): Promise<string> {

        return new Promise((resolve, reject) => {

            let client = new nodeRestClient.Client();

            let paramsAsRecord = (() => {

                let out: Record<string, string | undefined> = {};

                for (let key of Object.keys(params))
                    out[key] = params[key];

                return out;

            })();

            client.get(
                buildUrl(methodName, paramsAsRecord),
                (data, { statusCode, statusMessage }) => {

                    if (statusCode !== 200)
                        return reject(new Error(`webAPI ${methodName} error ${statusCode}, ${statusMessage}`));

                    resolve(data);

                }
            );

        });

    }

}

function buildUrl(
    methodName: string,
    params: Record<string, string | undefined>
): string {

    let query: string[] = [];

    for (let key of Object.keys(params)) {

        let value = params[key];

        if (value === undefined) continue;

        query[query.length] = `${key}=${params[key]}`;

    }

    let url = `https://${c.backendHostname}:${c.webApiPort}/${c.webApiPath}/${methodName}?${query.join("&")}`;

    console.log(`GET ${url}`);

    return url;
}