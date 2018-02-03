import { DongleController as Dc } from "chan-dongle-extended-client";
import { webApiDeclaration as d } from "../semasim-frontend";
import { Session } from "./web";
import { Handler, Handlers } from "./webApiServer";
import * as db from "./db";
import * as dbw from "./dbWebphone";
import * as sipProxy from "./sipProxy";
import * as sipApiGateway from "./sipApiGatewayClientImplementation";
import * as sipApiServer from "./sipApiBackendServerImplementation";
import * as utils from "./utils";

import { c } from "./_constants";

import * as html_entities from "html-entities";
const entities= new html_entities.XmlEntities;

import * as _debug from "debug";
let debug = _debug("_webApiServerImplementation");

export const handlers: Handlers= {};

(() => {

    let methodName = d.registerUser.methodName;
    type Params = d.registerUser.Params;
    type Response = d.registerUser.Response;

    handlers[methodName] = {
        "needAuth": false,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.email === "string" &&
            params.email.match(c.regExpEmail) !== null &&
            typeof params.password === "string" &&
            params.password.match(c.regExpPassword) !== null
        ),
        "handler": async (params): Promise<Response> => {

            let { email, password } = params;

            let user = await db.createUserAccount(email, password);

            return user?"CREATED":"EMAIL NOT AVAILABLE";

        }
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = d.loginUser.methodName;
    type Params = d.loginUser.Params;
    type Response = d.loginUser.Response;

    handlers[methodName] = {
        "needAuth": false,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.email === "string" &&
            params.email.match(c.regExpEmail) !== null &&
            typeof params.password === "string" &&
            params.password.match(c.regExpPassword) !== null
        ),
        "handler": async (params, session): Promise<Response> => {

            let { email, password } = params;

            let user = await db.authenticateUser(email, password);

            if( !user ){
                return false;
            }

            session.auth= { 
                user, 
                "email": email.toLowerCase()
            };

            return true;

        }
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = d.logoutUser.methodName;
    type Params = d.logoutUser.Params;
    type Response = d.logoutUser.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => params === undefined,
        "handler": async (params, session): Promise<Response> => {

            session.auth= undefined;

            return;

        }
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = d.sendRenewPasswordEmail.methodName;
    type Params = d.sendRenewPasswordEmail.Params;
    type Response = d.sendRenewPasswordEmail.Response;

    handlers[methodName] = {
        "needAuth": false,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.email === "string" &&
            params.email.match(c.regExpEmail) !== null 
        ),
        "handler": async (params): Promise<Response> => {

            let { email } = params;

            let hash= await db.getUserHash(email);

            //TODO send email

            return hash !== undefined;

        }
    } as Handler<Params, Response>;

})();


(() => {

    let methodName = d.getSims.methodName;
    type Params = d.getSims.Params;
    type Response = d.getSims.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => params === undefined,
        "handler": (params, session): Promise<Response> => db.getUserSims(session.auth!.user)
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = d.getUnregisteredLanDongles.methodName;
    type Params = d.getUnregisteredLanDongles.Params;
    type Response = d.getUnregisteredLanDongles.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => params === undefined,
        "handler": async (params, session, remoteAddress): Promise<Response> => 
            db.filterDongleWithRegistrableSim(
                session.auth!.user,
                Array.from(
                    (await utils.getDonglesConnectedFrom(remoteAddress)).keys()
                )
            )
    } as Handler<Params, Response>;

})();


(() => {

    let methodName = d.unlockSim.methodName;
    type Params = d.unlockSim.Params;
    type Response = d.unlockSim.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.imei === "string" &&
            typeof params.pin === "string" //TODO: regexp pin
        ),
        "handler": async (params, session, remoteAddress): Promise<Response> => {

            let { imei, pin } = params;

            let donglePathMap = await utils.getDonglesConnectedFrom(remoteAddress);

            let lockedDongle = Array.from(donglePathMap.keys()).find(
                dongle => Dc.LockedDongle.match(dongle) && dongle.imei === imei
            ) as Dc.LockedDongle | undefined;

            if (!lockedDongle) throw new Error("assert 0");

            let gwSocket = donglePathMap.get(lockedDongle)!;

            let unlockResult = await sipApiGateway.unlockDongle(gwSocket, imei, pin);

            if (!unlockResult) throw new Error("assert 1");

            if (!unlockResult.success) {
                return {
                    "wasPinValid": false,
                    "pinState": unlockResult.pinState,
                    "tryLeft": unlockResult.tryLeft
                };
            }

            let { dongle, simOwner } = await sipApiServer.getEvtNewActiveDongle(gwSocket)
                .waitFor(({ dongle }) => dongle.imei === imei, 30000);

            if (!simOwner) {

                return {
                    "wasPinValid": true,
                    "isSimRegisterable": true,
                    dongle
                };

            } else {

                return {
                    "wasPinValid": true,
                    "isSimRegisterable": false,
                    "simRegisteredBy": (simOwner.user === session.auth!.user) ?
                        ({ "who": "MYSELF" }) :
                        ({ "who": "OTHER USER", "email": simOwner.email })
                };

            }

        }
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = d.registerSim.methodName;
    type Params = d.registerSim.Params;
    type Response = d.registerSim.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.imsi === "string" &&
            typeof params.friendlyName === "string"
        ),
        "handler": async (params, session, remoteAddress): Promise<Response> => {

            let { imsi, friendlyName } = params;

            let donglePathMap = await utils.getDonglesConnectedFrom(remoteAddress);

            let dongle = Array.from(donglePathMap.keys()).find(
                dongle => Dc.ActiveDongle.match(dongle) && dongle.sim.imsi === imsi
            ) as Dc.ActiveDongle | undefined;

            if (!dongle) throw new Error("assert");

            let password = utils.simPassword.read(donglePathMap.get(dongle)!, imsi);

            if (!password) throw new Error("assert");

            //NEED password, simDongle & gatewayIp

            let userUas= await db.registerSim(
                session.auth!.user,
                dongle.sim,
                friendlyName, 
                password, 
                dongle, 
                donglePathMap.get(dongle)!.remoteAddress
            );

            await utils.sendPushNotification.toUas(userUas, "RELOAD CONFIG");

            return undefined;

        }
    } as Handler<Params, Response>;

})();


(() => {

    let methodName = d.unregisterSim.methodName;
    type Params = d.unregisterSim.Params;
    type Response = d.unregisterSim.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.imsi === "string"
        ),
        "handler": async (params, session): Promise<Response> => {

            let { imsi } = params;

            let affectedUas = await db.unregisterSim(
                session.auth!.user,
                imsi
            );

            //TODO: force sim to reconnect and remove all ua sim

            let gwSocket = sipProxy.gatewaySockets.getSimRoute(imsi);

            if (gwSocket) {

                sipApiGateway.reNotifySimOnline(gwSocket, imsi);

            }

            await utils.sendPushNotification.toUas(affectedUas, "RELOAD CONFIG");

            return undefined;

        }
    } as Handler<Params, Response>;

})();



(() => {

    let methodName = d.shareSim.methodName;
    type Params = d.shareSim.Params;
    type Response = d.shareSim.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.imsi === "string" &&
            params.emails instanceof Array &&
            params.emails.find(
                email => (
                    typeof email !== "string" ||
                    email.match(c.regExpEmail) === null
                )
            ) === undefined &&
            typeof params.message === "string"
        ),
        "handler": async (params, session): Promise<Response>=> {

            let { imsi, emails, message } = params;

            let affectedUsers = await db.shareSim(
                session.auth!,
                imsi,
                emails,
                message
            );

            //TODO: send email to notify new sim shared

            return affectedUsers;

        }
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = d.stopSharingSim.methodName;
    type Params = d.stopSharingSim.Params;
    type Response = d.stopSharingSim.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.imsi === "string" &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            params.emails.find(
                email => (
                    typeof email !== "string" ||
                    email.match(c.regExpEmail) === null
                )
            ) === undefined
        ),
        "handler": async (params, session): Promise<Response> => {

            let { imsi, emails } = params;

            let noLongerRegisteredUas = await db.stopSharingSim(
                session.auth!.user,
                imsi,
                emails
            );

            if (noLongerRegisteredUas.length) {

                utils.sendPushNotification.toUas(
                    noLongerRegisteredUas,
                    "RELOAD CONFIG"
                );

                let gwSocket = sipProxy.gatewaySockets.getSimRoute(imsi);

                if (gwSocket) {

                    sipApiGateway.reNotifySimOnline(gwSocket, imsi);

                }

            }

            return undefined;

        }
    } as Handler<Params, Response>;

})();

//TODO: define max length of friendly name
(() => {

    let methodName = d.setSimFriendlyName.methodName;
    type Params = d.setSimFriendlyName.Params;
    type Response = d.setSimFriendlyName.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.imsi === "string" &&
            typeof params.friendlyName === "string"
        ),
        "handler": async (params, session): Promise<Response> => {

            let { imsi, friendlyName } = params;

            let userUas = await db.setSimFriendlyName(
                session.auth!.user,
                imsi,
                friendlyName
            );

            utils.sendPushNotification.toUas(
                userUas,
                "RELOAD CONFIG"
            );

            return undefined;

        }
    } as Handler<Params, Response>;

})();

//TODO: define max length of friendly name
(() => {

    let methodName = d.getUaConfig.methodName;
    type Params = d.getUaConfig.Params;
    type Response = d.getUaConfig.Response;

    const hexToUtf8 = (hexStr: string) =>
        (new Buffer(hexStr, "hex")).toString("utf8");

    const ov = ` overwrite="true" `;
    const domain = c.shared.domain;

    handlers[methodName] = {
        "needAuth": false,
        "contentType": "application/xml",
        "sanityChecks": params => {
            try {
                return (
                    hexToUtf8(params.email_as_hex)
                        .match(c.regExpEmail) !== null &&
                    hexToUtf8(params.password_as_hex)
                        .match(c.regExpPassword) !== null
                );
            } catch {
                return false;
            }
        },
        "handler": async (params): Promise<Response> => {

            let email = hexToUtf8(params.email_as_hex).toLocaleLowerCase();
            let password = hexToUtf8(params.password_as_hex);

            let user = await db.authenticateUser(email, password);

            if (!user) throw new Error("assert");

            let endpointEntries: string[] = [];
            let contactEntries: string[] = [];

            //TODO: maybe find a way to smuggle sim infos in config
            let contact_parameters = entities.encode(`base64_email=${(new Buffer(email, "utf8")).toString("base64")}`);

            for (let { sim, friendlyName, password, ownership } of await db.getUserSims(user)) {

                if (ownership.status === "SHARED NOT CONFIRMED") {
                    continue;
                }

                endpointEntries[endpointEntries.length] = [
                    `  <section name="nat_policy_${endpointEntries.length}">`,
                    `    <entry name="ref" ${ov}>nat_policy_${endpointEntries.length}</entry>`,
                    `    <entry name="stun_server" ${ov}>${domain}</entry>`,
                    `    <entry name="protocols" ${ov}>stun,ice</entry>`,
                    `  </section>`,
                    `  <section name="proxy_${endpointEntries.length}">`,
                    `    <entry name="reg_proxy" ${ov}>sip:${domain};transport=tls</entry>`,
                    `    <entry name="reg_route" ${ov}>sip:${domain};transport=tls;lr</entry>`,
                    `    <entry name="reg_expires" ${ov}>${c.reg_expires}</entry>`,
                    [
                        `    <entry name="reg_identity" ${ov}>`,
                        entities.encode(`"${friendlyName}" <sip:${sim.imsi}@${domain};transport=tls>`),
                        `</entry>`,
                    ].join(""),
                    `    <entry name="contact_parameters" ${ov}>${contact_parameters}</entry>`,
                    `    <entry name="reg_sendregister" ${ov}>1</entry>`,
                    `    <entry name="publish" ${ov}>0</entry>`,
                    `    <entry name="nat_policy_ref" ${ov}>nat_policy_${endpointEntries.length}</entry>`,
                    `  </section>`,
                    `  <section name="auth_info_${endpointEntries.length}">`,
                    `    <entry name="username" ${ov}>${sim.imsi}</entry>`,
                    `    <entry name="userid" ${ov}>${sim.imsi}</entry>`,
                    `    <entry name="passwd" ${ov}>${password}</entry>`,
                    `  </section>`
                ].join("\n");

                for (let contact of sim.storage.contacts) {

                    contactEntries[contactEntries.length] = [
                        `  <section name="friend_${contactEntries.length}">`,
                        [
                            `    <entry name="url" ${ov}>`,
                            entities.encode(
                                `"${contact.name.full} (${friendlyName})" <sip:${contact.number.localFormat}@${domain}>`
                            ),
                            `</entry>`
                        ].join(""),
                        `    <entry name="pol" ${ov}>accept</entry>`,
                        `    <entry name="subscribe" ${ov}>0</entry>`,
                        `  </section>`,
                    ].join("\n");

                }

            }

            return [
                `<?xml version="1.0" encoding="UTF-8"?>`,
                [
                    `<config xmlns="http://www.linphone.org/xsds/lpconfig.xsd" `,
                    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" `,
                    `xsi:schemaLocation="http://www.linphone.org/xsds/lpconfig.xsd lpconfig.xsd">`,
                ].join(""),
                ...endpointEntries,
                ...contactEntries,
                `</config>`
            ].join("\n");

        }
    } as Handler<Params, Response>;


})();


import dw= d.webphoneData;

(() => {

    let methodName = dw.fetch.methodName;
    type Params = dw.fetch.Params;
    type Response = dw.fetch.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => params === undefined,
        "handler": (params, session): Promise<Response> => 
            dbw.fetch(session.auth!.user)
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = dw.newInstance.methodName;
    type Params = dw.newInstance.Params;
    type Response = dw.newInstance.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            Dc.isImsiWellFormed(params.imsi)
        ),
        "handler": (params, session): Promise<Response> => 
            dbw.newInstance(session.auth!.user, params.imsi)
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = dw.newChat.methodName;
    type Params = dw.newChat.Params;
    type Response = dw.newChat.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.instance_id === "number" &&
            typeof params.contactNumber === "string" &&
            typeof params.contactName === "string" &&
            typeof params.isContactInSim === "boolean"
        ),
        "handler": (params, session): Promise<Response> => 
            dbw.newChat(
                session.auth!.user,
                params.instance_id,
                params.contactNumber,
                params.contactName,
                params.isContactInSim
            )
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = dw.updateChat.methodName;
    type Params = dw.updateChat.Params;
    type Response = dw.updateChat.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.chat_id === "number" &&
            ( 
                params.lastSeenTime === undefined ||
                typeof params.lastSeenTime === "number" 
            ) && ( 
                params.contactName === undefined ||
                typeof params.contactName === "string" 
            ) && ( 
                params.isContactInSim === undefined ||
                typeof params.isContactInSim === "boolean" 
            ) 
        ),
        "handler": (params, session): Promise<Response> => 
            dbw.updateChat(
                session.auth!.user,
                params.chat_id,
                params.lastSeenTime,
                params.contactName,
                params.isContactInSim
            )
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = dw.destroyChat.methodName;
    type Params = dw.destroyChat.Params;
    type Response = dw.destroyChat.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.chat_id === "number"
        ),
        "handler": (params, session): Promise<Response> => 
            dbw.destroyChat(session.auth!.user, params.chat_id)
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = dw.newMessage.methodName;
    type Params = dw.newMessage.Params;
    type Response = dw.newMessage.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.chat_id === "number" &&
            params.message instanceof Object &&
            typeof params.message.time === "number" &&
            typeof params.message.text === "string" &&
            (
                (
                    params.message.direction === "INCOMING" &&
                    typeof params.message.isNotification === "boolean"
                ) || 
                (
                    params.message.direction === "OUTGOING" &&
                    (
                        params.message.status === "TRANSMITTED TO GATEWAY" ||
                        params.message.status === "SENT BY DONGLE" ||
                        params.message.status === "RECEIVED"
                    ) &&
                    params.message.sentBy instanceof Object &&
                    (
                        params.message.sentBy.who === "MYSELF" ||
                        (
                            params.message.sentBy.who === "OTHER" &&
                            params.message.sentBy.email.match(c.regExpEmail)
                        )
                    )
                )
            )
        ),
        "handler": (params, session): Promise<Response> =>
            dbw.newMessage(
                session.auth!.user, 
                params.chat_id, 
                params.message
            )
    } as Handler<Params, Response>;

})();

(() => {

    let methodName = dw.updateOutgoingMessageStatus.methodName;
    type Params = dw.updateOutgoingMessageStatus.Params;
    type Response = dw.updateOutgoingMessageStatus.Response;

    handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.message_id === "number" &&
            (
                params.status === "TRANSMITTED TO GATEWAY" ||
                params.status === "SENT BY DONGLE" ||
                params.status === "RECEIVED"
            )
        ),
        "handler": (params, session): Promise<Response> => 
            dbw.updateOutgoingMessageStatus(
                session.auth!.user,
                params.message_id,
                params.status
            )
    } as Handler<Params, Response>;

})();
