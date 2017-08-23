import * as https from "https";
import * as express from "express";
import * as logger from "morgan";
import * as fs from "fs";
import * as path from "path";//TODO: remove
import * as clone from "clone";
import * as nodeRestClient from "node-rest-client";
import * as gatewaySipApi from "./gatewaySipApi";
import { gatewaySockets } from "./backendSipProxy";
import * as db from "./dbInterface";


import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_backendWebApi");

export function startServer(): Promise<void> {

    return new Promise<void>(resolve => {

        let router = express.Router()
            .use(logger("dev"))
        router.get("/:method", (req, res) => {

            switch (req.params.method) {
                case getConfigAndUnlock.methodName: return getConfigAndUnlock.handler(req, res);
                case getUserConfig.methodName: return getUserConfig.handler(req, res);
                default: return res.status(400).end();
            }

        });

        let app = express()
            .use(`/${c.webApiPath}`, router);

        let httpsServer = https.createServer(c.tlsOptions)
            .on("request", app)
            .listen(c.webApiPort)
            .on("listening", () => resolve());

    });

}

export namespace getUserConfig {

    export const methodName= "get-user-config";

    function generateUserConfig(
        endpointConfigs: string[]
    ): string {

        return [
            `<?xml version="1.0" encoding="UTF-8"?>`,
            [
                `<config xmlns="http://www.linphone.org/xsds/lpconfig.xsd" `,
                `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" `,
                `xsi:schemaLocation="http://www.linphone.org/xsds/lpconfig.xsd lpconfig.xsd">`,
            ].join(""),
            `  <section name="sip">`,
            `    <entry name="sip_port">-1</entry>`,
            `    <entry name="sip_tcp_port">5060</entry>`,
            `    <entry name="sip_tls_port">5061</entry>`,
            `    <entry name="default_proxy">0</entry>`,
            `    <entry name="ping_with_options">0</entry>`,
            `  </section>`,
            `  <section name="net">`,
            `    <entry name="dns_srv_enabled">0</entry>`,
            `    <entry name="firewall_policy">ice</entry>`,
            `    <entry name="stun_server">${c.backendHostname}</entry>`,
            `  </section>`,
            ...endpointConfigs,
            `</config>`
        ].join("\n");

    }

    function generateEndpointConfig(
        id: number,
        display_name: string,
        imei: string,
        last_four_digits_of_iccid: string
    ): string {

        return [
            `  <section name="proxy_${id}">`,
            `    <entry name="reg_proxy">sip:${c.backendHostname};transport=tls</entry>`,
            `    <entry name="reg_route">sip:${c.backendHostname};transport=tls;lr</entry>`,
            `    <entry name="reg_expires">${c.reg_expires}</entry>`,
            `    <entry name="reg_identity">"${display_name}" &lt;sip:${imei}@${c.backendHostname};transport=tls&gt;</entry>`,
            `    <entry name="reg_sendregister">1</entry>`,
            `    <entry name="publish">0</entry>`,
            `  </section>`,
            `  <section name="auth_info_${id}">`,
            `    <entry name="username">${imei}</entry>`,
            `    <entry name="userid">${imei}</entry>`,
            `    <entry name="passwd">${last_four_digits_of_iccid}</entry>`,
            `    <entry name="realm">semasim</entry>`,//TODO: should be removable
            `  </section>`
        ].join("\n");


    }

    type Request = {
        email: string;
        password: string;
    }

    function validateQueryString(query: Object): query is Request {

        try {

            let { email, password } = query as Request;

            return (
                email.match(c.regExpEmail) !== null &&
                password.match(c.regExpPassword) !== null
            );

        } catch (error) {
            return false;
        }

    }

    export async function handler(
        req: express.Request,
        res: express.Response
    ) {

        debug("=>getUserConfig");

        await (async () => {

            try {

                let email = "joseph.garrone.gj@gmail.com";
                let password = "abcde12345";

                await db.semasim_backend.deleteUser(email);

                await db.semasim_backend.addUser(email, "abcde12345");

                await db.semasim_backend.addConfig(email, {
                    "dongle_imei": "353145038273450",
                    "sim_iccid": "8933150116110005978",
                    "sim_number": "+33769365812",
                    "sim_service_provider": "Free"
                });

                await db.semasim_backend.addConfig(email, {
                    "dongle_imei": "358880032664586",
                    "sim_iccid": "8933201717151946530",
                    "sim_number": "+33636786385",
                    "sim_service_provider": "Bouygues Telecom"
                });

                let url = buildUrl(methodName, { email, password });
            } catch (error) {

                console.log("error", error);
            }

        })();

        try {

            let query: Object = req.query;

            debug({ query });

            if (!validateQueryString(query))
                throw new Error("INVALID_QUERY");

            if (!await db.semasim_backend.checkUserPassword(query.email, query.password))
                throw new Error("FORBIDDEN");

            let configs = await db.semasim_backend.getUserConfigs(query.email);

            let endpointConfigs: string[] = [];

            let id = 0;

            for (let {
                dongle_imei,
                sim_iccid,
                sim_number,
                sim_service_provider
            } of await db.semasim_backend.getUserConfigs(query.email)) {

                let last_four_digits_of_iccid = sim_iccid.substring(sim_iccid.length - 4);

                let display_name = (() => {

                    let out = sim_service_provider || "";

                    out += sim_number || "";

                    if (!out) out += last_four_digits_of_iccid;

                    return out;

                })();

                endpointConfigs[endpointConfigs.length] = generateEndpointConfig(
                    id++,
                    display_name,
                    dongle_imei,
                    last_four_digits_of_iccid
                );

            }

            let xml = generateUserConfig(endpointConfigs);

            debug(xml);

            res.setHeader("Content-Type", "application/xml; charset=utf-8");

            res.status(200).send(new Buffer(xml, "utf8"));

        } catch (error) {

            debug(error.message);

            res.statusMessage = error.message;

            res.status(400).end();

        }


    }




}

export namespace getConfigAndUnlock {

    let xml: string | undefined = undefined;

    function generateXml(
        imei: string,
        last_four_digits_of_iccid: string
    ) {

        if (!xml) {
            xml = fs.readFileSync(path.join(__dirname, "..", "..", "res", "remote_provisioning.xml"), "utf8");
            xml = xml.replace(/DOMAIN/g, c.backendHostname);
            xml = xml.replace(/REG_EXPIRES/g, `${c.reg_expires}`);
        }

        let newXml = xml;

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
                (pin_second_try === undefined || pin_second_try.match(/^[0-9]{4}$/) !== null)
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

            if (resp.pinState !== "READY")
                throw new Error("UNLOCK_FAILED");

            debug({ resp });

            res.setHeader("Content-Type", "application/xml; charset=utf-8");

            let xml = generateXml(query.imei, query.last_four_digits_of_iccid);

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