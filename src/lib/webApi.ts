import * as https from "https";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as logger from "morgan";

import { DongleController as Dc } from "chan-dongle-extended-client";

import * as html_entities from "html-entities";
const entities= new html_entities.XmlEntities;

import { sipApiClientGateway as sipApiGateway } from "../semasim-gateway";
import { gatewaySockets } from "./sipProxy";
import * as db from "./db";

import * as _ from "./../../frontend/api";

import { c } from "./_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_backendWebApi");

export function getRouter(): express.Router {

    return express.Router()
    .use(logger("dev"))
    //.use(bodyParser.urlencoded({ "extended": true }))
    .use(bodyParser.json())
    .use("/:method", function (req, res) {

        try{

            handlers[req.params.method](req, res);

        }catch(error){

            fail(res, _.unknownError);

        }

    });

}

function fail<T extends string>(res: express.Response, statusMessage: T) {

    debug(`Error: ${statusMessage}`.red);

    res.statusMessage = statusMessage;

    res.status(400).end();

}

function failNoStatus(res: express.Response, reason?: string) {

    if (reason) debug(`Error ${reason}`.red);

    res.status(400).end();

}

const handlers: Record<string, (req: express.Request, res: express.Response) => void> = {};

(() => {


    let methodName = _.loginUser.methodName;
    type Params = _.loginUser.Params;

    function validateBody(query: Object): query is Params {

        try {

            let { email, password } = query as Params;

            return (
                email.match(c.regExpEmail) !== null &&
                password.match(c.regExpPassword) !== null
            );

        } catch {
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

        let user = await db.authenticateUser(email, password);

        if (!user)
            return failNoStatus(res, "Auth failed");

        req.session!.user = user;
        req.session!.user_email = email;

        res.status(200).end();

    };

})();


(() => {

    let methodName = _.registerUser.methodName;
    type Params = _.registerUser.Params;
    type StatusMessage = _.registerUser.StatusMessage;

    function validateBody(query: Object): query is Params {

        try {

            let { email, password } = query as Params;

            return (
                email.match(c.regExpEmail) !== null &&
                password.match(c.regExpPassword) !== null
            );

        } catch {
            return false;
        }

    }


    handlers[methodName] = async (req, res) => {

        let body: Object = req.body;

        if (!validateBody(body))
            return failNoStatus(res, "malformed");

        let { email, password } = body;

        let isCreated = await db.addUser(email, password);

        if (!isCreated)
            return fail<StatusMessage>(res, "EMAIL_NOT_AVAILABLE");

        res.status(200).end();

    }


})();


(() => {

    let methodName = _.createUserEndpoint.methodName;
    type Params = _.createUserEndpoint.Params;
    type StatusMessage = _.createUserEndpoint.StatusMessage;

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

        } catch {
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

        let user: number = req.session!.user;

        if (!user)
            return fail<StatusMessage>(res, "USER_NOT_LOGGED");

        let gatewaySocket = gatewaySockets.get(imei);

        if (!gatewaySocket)
            return fail<StatusMessage>(res, "DONGLE_NOT_FOUND");

        /*
        if (!hasSim)
            return fail<StatusMessage>(res, "ICCID_MISMATCH");
        */


        let unlockResult = await sipApiGateway.unlockDongle.makeCall(
            gatewaySocket,
            {
                imei,
                last_four_digits_of_iccid,
                pin_first_try,
                pin_second_try
            }
        );

        if (unlockResult.status === "STILL LOCKED") {

            if (!pin_first_try)
                fail<StatusMessage>(res, "SIM_PIN_LOCKED_AND_NO_PIN_PROVIDED");
            else
                fail<StatusMessage>(res, "WRONG_PIN");

            return;
        }


        if (unlockResult.status === "ERROR"){
            //TODO: No! Some other error may happen
            debug("ERROR".red);
            debug(unlockResult);
            return fail<StatusMessage>(res, "ICCID_MISMATCH");
        }

        await db.addEndpoint(unlockResult.dongle, user);

        res.status(200).end();

    };


})();



(() => {

    //<string name="semasim_login_url">https://&domain;/api/get-user-linphone-config?email_as_hex=%1$s&amp;password_as_hex=%2$s</string>

    let methodName = "get-user-linphone-config";

    type Params = {
        email_as_hex: string;
        password_as_hex: string;
    };

    function validateQueryString(query: any): query is Params {

        try {

            let { email_as_hex, password_as_hex } = query as Params;

            let email = (new Buffer(email_as_hex, "hex")).toString("utf8");
            let password = (new Buffer(password_as_hex, "hex")).toString("utf8");

            return (
                email.match(c.regExpEmail) !== null &&
                password.match(c.regExpPassword) !== null
            );

        } catch {
            return false;
        }

    }

    const ov = ` overwrite="true" `;
    const domain = c.shared.domain;

    function generateGlobalConfig(
        endpointConfigs: string[],
        phonebookConfigs: string[]
    ): string {

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
            `    <entry name="ping_with_options" ${ov}>0</entry>`,
            `  </section>`,
            `  <section name="net">`,
            `    <entry name="dns_srv_enabled" ${ov}>1</entry>`,
            `  </section>`,
            ...endpointConfigs,
            ...phonebookConfigs,
            `</config>`
        ].join("\n");

    }

    function updateEndpointConfigs(
        id: number,
        dongle: Dc.ActiveDongle,
        endpointConfigs: string[]
    ) {

        let display_name = (function generateDisplayName(
            id: number,
            sim: Dc.ActiveDongle["sim"]
        ): string {

            let infos: string[] = [];

            if (sim.number)
                infos.push(`${sim.number}`);

            if (sim.serviceProvider)
                infos.push(`${sim.serviceProvider}`);

            let infosConcat = ": " + infos.join("-");

            return `Sim${id + 1}${infosConcat}`;

        })(id, dongle.sim);

        //let reg_identity= `"${display_name}" &lt;sip:${imei}@${domain};transport=tls&gt;`;
        let reg_identity = entities.encode(`"${display_name}" <sip:${dongle.imei}@${domain};transport=tls>`);

        let last_four_digits_of_iccid = dongle.sim.iccid.substring(dongle.sim.iccid.length - 4);

        endpointConfigs[endpointConfigs.length] = [
            `  <section name="nat_policy_${id}">`,
            `    <entry name="ref" ${ov}>nat_policy_${id}</entry>`,
            `    <entry name="stun_server" ${ov}>${domain}</entry>`,
            `    <entry name="protocols" ${ov}>stun,ice</entry>`,
            `  </section>`,
            `  <section name="proxy_${id}">`,
            `    <entry name="reg_proxy" ${ov}>sip:${domain};transport=tls</entry>`,
            `    <entry name="reg_route" ${ov}>sip:${domain};transport=tls;lr</entry>`,
            `    <entry name="reg_expires" ${ov}>${c.reg_expires}</entry>`,
            `    <entry name="reg_identity" ${ov}>${reg_identity}</entry>`,
            `    <entry name="reg_sendregister" ${ov}>1</entry>`,
            `    <entry name="publish" ${ov}>0</entry>`,
            `    <entry name="nat_policy_ref" ${ov}>nat_policy_${id}</entry>`,
            `  </section>`,
            `  <section name="auth_info_${id}">`,
            `    <entry name="username" ${ov}>${dongle.imei}</entry>`,
            `    <entry name="userid" ${ov}>${dongle.imei}</entry>`,
            `    <entry name="passwd" ${ov}>${last_four_digits_of_iccid}</entry>`,
            `  </section>`
        ].join("\n");

    }

    function updatePhonebookConfigs(
        id: number,
        contacts: Dc.Contact[],
        phonebookConfigs: string[]
    ) {

        let startIndex = phonebookConfigs.length;

        for (let i = 0; i < contacts.length; i++) {

            let contact = contacts[i];

            //TODO: Test with special characters, see if it break linephone
            let url = entities.encode(`"${contact.name} (Sim${id + 1})" <sip:${contact.number}@${domain}>`);

            phonebookConfigs[phonebookConfigs.length] = [
                `  <section name="friend_${startIndex + i}">`,
                `    <entry name="url" ${ov}>${url}</entry>`,
                `    <entry name="pol" ${ov}>accept</entry>`,
                `    <entry name="subscribe" ${ov}>0</entry>`,
                `  </section>`,
            ].join("\n");

        }

    }


    handlers[methodName] = async (req, res) => {

        debug(`handle ${methodName}`);

        let query = req.query;

        if (!validateQueryString(query))
            return failNoStatus(res, "malformed");

        let { email_as_hex, password_as_hex } = query;

        let email = (new Buffer(email_as_hex, "hex")).toString("utf8");
        let password = (new Buffer(password_as_hex, "hex")).toString("utf8");

        let user = await db.authenticateUser(email, password);

        if (!user)
            return failNoStatus(res, "user not found");

        let endpointConfigs: string[] = [];
        let phonebookConfigs: string[] = [];

        let id = 0;

        for (let dongle of await db.getEndpoints(user)) {

            updateEndpointConfigs(
                id,
                dongle,
                endpointConfigs
            );

            updatePhonebookConfigs(
                id,
                dongle.sim.phonebook.contacts,
                phonebookConfigs
            );


            id++

        }


        let xml = generateGlobalConfig(
            endpointConfigs,
            phonebookConfigs
        );

        debug(xml);

        res.setHeader(
            "Content-Type",
            "application/xml; charset=utf-8"
        );

        res.status(200).send(new Buffer(xml, "utf8"));

    };

})();


(() => {

    let methodName = _.deleteUserEndpoint.methodName;
    type Params = _.deleteUserEndpoint.Params;
    type StatusMessage = _.deleteUserEndpoint.StatusMessage;

    function validateBody(query: any): query is Params {

        try {

            let { imei } = query as Params;

            return imei.match(c.regExpImei) !== null;

        } catch {
            return false;
        }

    }

    handlers[methodName] = async (req, res) => {

        debug(`handle ${methodName}`);

        let body = req.body;

        if (!validateBody(body))
            return failNoStatus(res, "malformed");

        let { imei } = body;

        let user: number = req.session!.user;

        if (!user)
            return fail<StatusMessage>(res, "USER_NOT_LOGGED");

        let isDeleted = await db.deleteEndpoint(imei, user);

        if (!isDeleted)
            return fail<StatusMessage>(res, "ENDPOINT_NOT_FOUND");

        res.status(200).end();

    };

})();
