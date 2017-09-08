import * as https from "https";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as logger from "morgan";
import { sipApiClientGateway as sipApiGateway } from "../semasim-gateway";
import { gatewaySockets } from "./sipProxy";
import * as db from "./db";

import { webApiClient as _ } from "../semasim-webclient";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_backendWebApi");

export function getRouter(): express.Router {

    return express.Router()
    .use(logger("dev"))
    //.use(bodyParser.urlencoded({ "extended": true }))
    .use(bodyParser.json())
    .use("/:method", function (req, res) {

        debug("Api call");

        let handler= handlers[req.params.method];

        if (!handler)
            return res.status(404).end();

        handler(req, res);

    });

}

function fail<T extends string>(res: express.Response, statusMessage: T) {

    debug("error", statusMessage);

    res.statusMessage = statusMessage;

    res.status(400).end();

}

function failNoStatus(res: express.Response, reason?: string) {

    if (reason) debug("error", reason);

    res.status(400).end();

}

const handlers: Record<string, (req: express.Request, res: express.Response) => any> = {};

(() => {


    let methodName = _.loginUser.methodName;
    type Params = _.loginUser.Params;

    function validateBody(query: Object): query is Params {

        try {

            let {
                email,
                password
            } = query as Params;

            return (
                email.match(c.regExpEmail) !== null &&
                password.match(c.regExpPassword) !== null
            );

        } catch (error) {
            return false;
        }

    }

    handlers[methodName] = async (req, res) => {

        debug(`handle ${methodName}`);

        let body: Object = req.body;

        debug({ body });

        if (!validateBody(body))
            return failNoStatus(res, "malformed");

        let { email, password } = body;

        let user_id = await db.semasim_backend.getUserIdIfGranted(email, password);

        debug("======>", { user_id });

        if (!user_id)
            return failNoStatus(res, "Auth failed");

        req.session!.user_id = user_id;
        req.session!.user_email = email;

        debug(`User granted ${user_id}`);

        res.status(200).end();

    };

})();


(() => {

    let methodName = _.registerUser.methodName;
    type Params = _.registerUser.Params;
    type StatusMessage = _.registerUser.StatusMessage;

    function validateBody(query: Object): query is Params {

        try {

            let {
                email,
                password
            } = query as Params;

            return (
                email.match(c.regExpEmail) !== null &&
                password.match(c.regExpPassword) !== null
            );

        } catch (error) {
            return false;
        }

    }


    handlers[methodName] = async (req, res) => {

        debug(`handle ${methodName}`);

        debug({ "session": req.session });

        let body: Object = req.body;

        debug({ body });

        if (!validateBody(body))
            return failNoStatus(res, "malformed");

        let { email, password } = body;

        let isCreated = await db.semasim_backend.addUser(email, password);

        if (!isCreated)
            return fail<StatusMessage>(res, "EMAIL_NOT_AVAILABLE");

        res.status(200).end();

    }




})();


(() => {


    let methodName = _.createdUserEndpointConfig.methodName;
    type Params = _.createdUserEndpointConfig.Params;
    type StatusMessage = _.createdUserEndpointConfig.StatusMessage;

    function validateBody(query: Object): query is Params {

        try {

            let {
                imei,
                last_four_digits_of_iccid,
                pin_first_try,
                pin_second_try
            } = query as Params;

            return (
                imei.match(c.regExpImei) !== null &&
                last_four_digits_of_iccid.match(c.regExpFourDigits) !== null &&
                (pin_first_try === undefined || pin_first_try.match(c.regExpFourDigits) !== null) &&
                (pin_second_try === undefined || pin_second_try.match(c.regExpFourDigits) !== null)
            );

        } catch (error) {
            return false;
        }

    };

    handlers[methodName] = async (req, res) => {

        debug(`handle ${methodName}`);

        let body: Object = req.body;

        debug({ body });

        if (!validateBody(body))
            return failNoStatus(res, "malformed");

        let { imei, last_four_digits_of_iccid, pin_first_try, pin_second_try } = body;

        let user_id: number = req.session!.user_id;

        if (!user_id)
            return fail<StatusMessage>(res, "USER_NOT_LOGGED");

        debug({ user_id });

        let gatewaySocket = gatewaySockets.get(imei);

        debug("Gateway socket found");

        if (!gatewaySocket)
            return fail<StatusMessage>(res, "DONGLE_NOT_FOUND");


        let hasSim = await sipApiGateway.doesDongleHasSim.makeCall(
            gatewaySocket,
            imei,
            last_four_digits_of_iccid
        );

        if (!hasSim)
            return fail<StatusMessage>(res, "ICCID_MISMATCH");


        let unlockResult = await sipApiGateway.unlockDongle.makeCall(
            gatewaySocket,
            {
                imei,
                last_four_digits_of_iccid,
                pin_first_try,
                pin_second_try
            }
        );

        if (!unlockResult.dongleFound)
            return fail<StatusMessage>(res, "DONGLE_NOT_FOUND");

        if (unlockResult.pinState !== "READY") {

            if (!pin_first_try)
                fail<StatusMessage>(res, "SIM_PIN_LOCKED_AND_NO_PIN_PROVIDED");
            else
                fail<StatusMessage>(res, "WRONG_PIN");

            return;
        }

        await db.semasim_backend.addEndpointConfig(user_id, {
            "dongle_imei": imei,
            "sim_iccid": unlockResult.iccid,
            "sim_number": unlockResult.number || null,
            "sim_service_provider": unlockResult.serviceProvider || null
        });

        res.status(200).end();

    };


})();


(() => {

    let methodName = _.getUserEndpointConfigs.methodName;
    type ReturnValue = _.getUserEndpointConfigs.ReturnValue;

    handlers[methodName] = async (req, res) => {

        debug(`handle ${methodName}`);

        let user_id: number = req.session!.user_id;

        if (!user_id)
            return fail(res, "USER_NOT_LOGGED");

        let configs: ReturnValue = await db.semasim_backend.getUserEndpointConfigs(user_id);

        res.setHeader("Content-Type", "application/json; charset=utf-8");

        res.status(200).send(new Buffer(JSON.stringify(configs), "utf8"));

    };


})();

(()=>{

    let methodName= _.getUserLinphoneConfig.methodName;
    type Params = _.getUserLinphoneConfig.Params;

    function validateQueryString(query: Object): query is Params {

        try {

            let { email_as_hex, password_as_hex } = query as Params;

            let email = (new Buffer(email_as_hex, "hex")).toString("utf8");
            let password = (new Buffer(password_as_hex, "hex")).toString("utf8");

            return (
                email.match(c.regExpEmail) !== null &&
                password.match(c.regExpPassword) !== null
            );

        } catch (error) {
            return false;
        }

    }


    function generateGlobalConfig(endpointConfigs: string[]): string {

        return [
            `<?xml version="1.0" encoding="UTF-8"?>`,
            [
                `<config xmlns="http://www.linphone.org/xsds/lpconfig.xsd" `,
                `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" `,
                `xsi:schemaLocation="http://www.linphone.org/xsds/lpconfig.xsd lpconfig.xsd">`,
            ].join(""),
            `  <section name="sip">`,
            //`    <entry name="sip_port" overwrite="true">-1</entry>`,
            //`    <entry name="sip_tcp_port" overwrite="true">5060</entry>`,
            //`    <entry name="sip_tls_port" overwrite="true">5061</entry>`,
            `    <entry name="ping_with_options" overwrite="true">0</entry>`,
            `  </section>`,
            `  <section name="net">`,
            `    <entry name="dns_srv_enabled" overwrite="true">1</entry>`,
            `  </section>`,
            `  <section name="friend_0">`,
            `    <entry name="url" overwrite="true">"Joseph Garrone SIM" &lt;sip:+33636786385@${c.shared.backendHostname}&gt;</entry>`,
            `    <entry name="pol" overwrite="true">accept</entry>`,
            `    <entry name="subscribe" overwrite="true">0</entry>`,
            `  </section>`,
            ...endpointConfigs,
            `</config>`
        ].join("\n");

    }

    function generateDongleConfig(
        id: number, 
        display_name: string, 
        imei: string, 
        last_four_digits_of_iccid: string
    ): string {

        let ov= ` overwrite="true" `;

        return [
            `  <section name="nat_policy_${id}">`,
            `    <entry name="ref" ${ov}>nat_policy_${id}</entry>`,
            `    <entry name="stun_server" ${ov}>${c.shared.backendHostname}</entry>`,
            `    <entry name="protocols" ${ov}>stun,ice</entry>`,
            `  </section>`,
            `  <section name="proxy_${id}">`,
            `    <entry name="reg_proxy" ${ov}>sip:${c.shared.backendHostname};transport=tls</entry>`,
            `    <entry name="reg_route" ${ov}>sip:${c.shared.backendHostname};transport=tls;lr</entry>`,
            `    <entry name="reg_expires" ${ov}>${c.reg_expires}</entry>`,
            `    <entry name="reg_identity" ${ov}>"${display_name}" &lt;sip:${imei}@${c.shared.backendHostname};transport=tls&gt;</entry>`,
            `    <entry name="reg_sendregister" ${ov}>1</entry>`,
            `    <entry name="publish" ${ov}>0</entry>`,
            `    <entry name="nat_policy_ref" ${ov}>nat_policy_${id}</entry>`,
            `  </section>`,
            `  <section name="auth_info_${id}">`,
            `    <entry name="username" ${ov}>${imei}</entry>`,
            `    <entry name="userid" ${ov}>${imei}</entry>`,
            `    <entry name="passwd" ${ov}>${last_four_digits_of_iccid}</entry>`,
            `  </section>`
        ].join("\n");

    }

    handlers[methodName] = async (req, res) => {

        debug(`handle ${methodName}`);

        let query: Object = req.query;

        debug({ query });

        if (!validateQueryString(query))
            return failNoStatus(res, "malformed");

        let { email_as_hex, password_as_hex } = query;

        let email = (new Buffer(email_as_hex, "hex")).toString("utf8");
        let password = (new Buffer(password_as_hex, "hex")).toString("utf8");

        let user_id = await db.semasim_backend.getUserIdIfGranted(email, password);

        if (!user_id)
            return failNoStatus(res, "user not found");

        let endpointConfigs: string[] = [];

        let id = 0;

        for (
            let { dongle_imei, sim_iccid, sim_number, sim_service_provider }
            of
            await db.semasim_backend.getUserEndpointConfigs(user_id)
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




})();


(() => {


    let methodName = _.deleteUserEndpointConfig.methodName;
    type Params = _.deleteUserEndpointConfig.Params;
    type StatusMessage = _.deleteUserEndpointConfig.StatusMessage;

    function validateBody(query: Object): query is Params {

        try {

            let {
                imei
            } = query as Params;

            return (
                imei.match(c.regExpImei) !== null
            );

        } catch (error) {
            return false;
        }

    }

    handlers[methodName] = async (req, res) => {

        debug(`handle ${methodName}`);

        let body: Object = req.body;

        debug({ body });

        if (!validateBody(body))
            return failNoStatus(res, "malformed");

        let { imei } = body;

        let user_id: number = req.session!.user_id;

        if (!user_id)
            return fail<StatusMessage>(res, "USER_NOT_LOGGED");

        debug({ user_id });

        let isDeleted = await db.semasim_backend.deleteEndpointConfig(user_id, imei);

        if (!isDeleted)
            return fail<StatusMessage>(res, "ENDPOINT_CONFIG_NOT_FOUND");

        res.status(200).end();

    };


})();
