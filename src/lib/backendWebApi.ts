import * as https from "https";
import * as express from "express";
import * as logger from "morgan";
import * as fs from "fs";
import * as path from "path";//TODO: remove
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
                case createUserEndpointConfig.methodName: 
                    return createUserEndpointConfig.handler(req, res);
                case getUserConfig.methodName: 
                    return getUserConfig.handler(req, res);
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

//TODO: test!
export namespace createUserEndpointConfig {

    export const methodName= "create-user-endpoint-config";

    type Request = {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try: string;
        pin_second_try?: string;
    }

    function validateQueryString(query: Object): query is Request {

        try {

            let { 
                imei,
                last_four_digits_of_iccid,
                pin_first_try,
                pin_second_try
            } = query as Request;

            return (
                imei.match(c.regExpImei) !== null &&
                last_four_digits_of_iccid.match(c.regExpFourDigits) !== null &&
                pin_first_try.match(c.regExpFourDigits) !== null &&
                (pin_second_try === undefined || pin_second_try.match(c.regExpFourDigits) !== null)
            );

        } catch (error) {
            return false;
        }

    }

    export async function handler(
        req: express.Request,
        res: express.Response
    ) {

        debug("=>createUserEndpointConfig");

            try {

            let query: Object = req.query;

            debug({ query });

            if (!validateQueryString(query))
                throw new Error("INVALID_QUERY");

            let { 
                imei,
                last_four_digits_of_iccid,
                pin_first_try,
                pin_second_try
            }= query;

            let email: string= (req as any).session.email;

            if (!email)
                throw new Error("FORBIDDEN");

            let gatewaySocket= gatewaySockets.get(imei);

            if( !gatewaySocket ) 
                throw new Error("DONGLE NOT FOUND");

            let hasSim = await gatewaySipApi.doesDongleHasSim.run(
                gatewaySocket,
                imei,
                last_four_digits_of_iccid
            );

            if (!hasSim)
                throw new Error("WRONG SIM");

            let unlockResult= await gatewaySipApi.unlockDongle.run(
                gatewaySocket,
                { 
                    imei, 
                    last_four_digits_of_iccid, 
                    pin_first_try, 
                    pin_second_try 
                }
            );

            if (!unlockResult.dongleFound)
                throw new Error("DONGLE NOT FOUND");

            if (unlockResult.pinState !== "READY")
                throw new Error("WRONG PIN");

            await db.semasim_backend.addConfig(email, {
                "dongle_imei": imei,
                "sim_iccid": unlockResult.iccid,
                "sim_number": unlockResult.number || null,
                "sim_service_provider": unlockResult.serviceProvider || null
            });

            res.statusMessage = "SUCCESS";

            res.status(200).end();

        } catch (error) {

            debug(error.message);

            //TODO do not give debug info here
            res.statusMessage = error.message;

            res.status(400).end();

        }


    }



}

export namespace getUserConfig {

    export const methodName = "get-user-config";

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