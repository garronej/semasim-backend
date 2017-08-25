import * as https from "https";
import * as express from "express";
import * as logger from "morgan";
import * as bodyParser from "body-parser";
import * as gatewaySipApi from "./gatewaySipApi";
import { gatewaySockets } from "./backendSipProxy";
import * as db from "./dbInterface";

import * as _ from "./backendWebApiClient";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_backendWebApi");

export function getRouter(): express.Router {

    return express.Router()
    .use(logger("dev"))
    .use(bodyParser.json())
    .use("/:method", function (req, res) {

        let handler= handlers[req.params.method];

        if (!handler)
            return res.status(400).end();

        handler(req, res);

    });

}

function fail(res: express.Response, statusMessage: string) {

    debug("error", statusMessage);

    res.statusMessage = statusMessage;

    res.status(400).end();

}

function failNoStatus(res: express.Response, reason?: string) {

    if( reason ) debug("error", reason);

    res.status(400).end();

}

const handlers: Record<string, (req: express.Request, res: express.Response) => any> = {};

handlers[_.loginUser.methodName] = async (req, res) => {

    debug(`=>${_.loginUser.methodName}`);

    const validateBody = (query: Object): query is _.loginUser.Request => {

        try {

            let {
                email,
                password
            } = query as _.loginUser.Request;

            return (
                email.match(c.regExpEmail) !== null &&
                password.match(c.regExpPassword) !== null
            );

        } catch (error) {
            return false;
        }

    };

    let body: Object = req.body;

    debug({ body });

    if (!validateBody(body))
        return failNoStatus(res, "malformed");

    let { email, password } = body;

    let user_id = await db.semasim_backend.getUserIdIfGranted(email, password);

    if (!user_id)
        return failNoStatus(res, "Auth failed");

    req.session!.user_id= user_id;

    debug(`User granted ${user_id}`);

    res.status(200).end();

};

handlers[_.createUser.methodName] = async (req, res) => {

    debug(`=>${_.createUser.methodName}`);

    const validateBody = (query: Object): query is _.createUser.Request => {

        try {

            let {
                email,
                password
            } = query as _.createUser.Request;

            return (
                email.match(c.regExpEmail) !== null &&
                password.match(c.regExpPassword) !== null
            );

        } catch (error) {
            return false;
        }

    };

    let body: Object = req.body;

    debug({ body });

    if (!validateBody(body))
        return failNoStatus(res, "malformed");

    let { email, password } = body;

    let isCreated = await db.semasim_backend.addUser(email, password);

    if (!isCreated)
        return fail(res, "EMAIL_NOT_AVAILABLE" as _.createUser.StatusMessage);

    res.status(200).end();

}

handlers[_.createDongleConfig.methodName] = async (req, res) => {

    debug(`=>${_.createDongleConfig.methodName}`);

    const validateBody = (query: Object): query is _.createDongleConfig.Request => {

        try {

            let {
                imei,
                last_four_digits_of_iccid,
                pin_first_try,
                pin_second_try
            } = query as _.createDongleConfig.Request;

            return (
                imei.match(c.regExpImei) !== null &&
                last_four_digits_of_iccid.match(c.regExpFourDigits) !== null &&
                pin_first_try.match(c.regExpFourDigits) !== null &&
                (pin_second_try === undefined || pin_second_try.match(c.regExpFourDigits) !== null)
            );

        } catch (error) {
            return false;
        }

    };


    let body: Object = req.body;

    debug({ body });

    if (!validateBody(body))
        return failNoStatus(res, "malformed");

    let { imei, last_four_digits_of_iccid, pin_first_try, pin_second_try } = body;

    let user_id: number = req.session!.user_id;

    if (!user_id)
        return fail(res, "USER_NOT_LOGGED" as _.createDongleConfig.StatusMessage);

    let gatewaySocket = gatewaySockets.get(imei);

    if (!gatewaySocket)
        return fail(res, "DONGLE_NOT_FOUND" as _.createDongleConfig.StatusMessage);

    let hasSim = await gatewaySipApi.doesDongleHasSim.run(
        gatewaySocket,
        imei,
        last_four_digits_of_iccid
    );

    if (!hasSim)
        return fail(res, "WRONG_SIM" as _.createDongleConfig.StatusMessage);

    let unlockResult = await gatewaySipApi.unlockDongle.run(
        gatewaySocket,
        {
            imei,
            last_four_digits_of_iccid,
            pin_first_try,
            pin_second_try
        }
    );

    if (!unlockResult.dongleFound)
        return fail(res, "DONGLE_NOT_FOUND" as _.createDongleConfig.StatusMessage);

    if (unlockResult.pinState !== "READY")
        return fail(res, "WRONG_PIN" as _.createDongleConfig.StatusMessage);

    await db.semasim_backend.addConfig(user_id, {
        "dongle_imei": imei,
        "sim_iccid": unlockResult.iccid,
        "sim_number": unlockResult.number || null,
        "sim_service_provider": unlockResult.serviceProvider || null
    });

    res.status(200).end();


};



handlers[_.getUserConfig.methodName] = async (req, res) => {

    debug(`=>${_.getUserConfig.methodName}`);

    const validateQueryString = (query: Object): query is _.getUserConfig.Request => {

        try {

            let { email, password } = query as _.getUserConfig.Request;

            return (
                email.match(c.regExpEmail) !== null &&
                password.match(c.regExpPassword) !== null
            );

        } catch (error) {
            return false;
        }

    };

    const generateGlobalConfig = (endpointConfigs: string[]): string => {

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

    const generateDongleConfig = (id: number, display_name: string, imei: string, last_four_digits_of_iccid: string): string => {

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


    /*
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
    */


    let query: Object = req.query;

    debug({ query });

    if (!validateQueryString(query))
        return failNoStatus(res, "malformed");

    let { email, password } = query;

    let user_id = await db.semasim_backend.getUserIdIfGranted(email, password);

    if (!user_id)
        return failNoStatus(res, "user not found");

    let endpointConfigs: string[] = [];

    let id = 0;

    for (
        let { dongle_imei, sim_iccid, sim_number, sim_service_provider }
        of
        await db.semasim_backend.getUserConfigs(user_id)
    ) {

        let last_four_digits_of_iccid = sim_iccid.substring(sim_iccid.length - 4);

        let display_name = (() => {

            let out = sim_service_provider || "";

            out += sim_number || "";

            if (!out) out += last_four_digits_of_iccid;

            return out;

        })();

        endpointConfigs[endpointConfigs.length] = generateDongleConfig(
            id++,
            display_name,
            dongle_imei,
            last_four_digits_of_iccid
        );

    }

    let xml = generateGlobalConfig(endpointConfigs);

    debug(xml);

    res.setHeader("Content-Type", "application/xml; charset=utf-8");

    res.status(200).send(new Buffer(xml, "utf8"));


};

