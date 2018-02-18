import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import { types as dcTypes } from "chan-dongle-extended-client";
import { 
    webApiDeclaration as d, 
    types as feTypes
} from "../semasim-frontend";
import { Handler, Handlers } from "./webApiServer";
import * as db from "./db";
import * as dbw from "./dbWebphone";
import * as sipProxy from "./sipProxy";
import * as sipApiGateway from "./sipApiGatewayClientImplementation";
import * as sipApiServer from "./sipApiBackendServerImplementation";
import * as utils from "./utils";

import * as c from "./_constants";

import { types as gwTypes } from "../semasim-gateway";
import isValidEmail= gwTypes.misc.isValidEmail



import * as html_entities from "html-entities";
const entities= new html_entities.XmlEntities;

export const handlers: Handlers= {};

//TODO: regexp for password once and for all!!!
//TODO: regexp for friendly name!!!
//TODO: set some reasonable max length for text messages... maybe set max packet length

(() => {

    let methodName = d.registerUser.methodName;
    type Params = d.registerUser.Params;
    type Response = d.registerUser.Response;

    let handler: Handler<Params, Response>= {
        "needAuth": false,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            isValidEmail(params.email) &&
            typeof params.password === "string"
        ),
        "handler": async params => {

            let { email, password } = params;

            let user = await db.createUserAccount(email, password);

            return user?"CREATED":"EMAIL NOT AVAILABLE";

        }
    };

    handlers[methodName]= handler;

})();

(() => {

    let methodName = d.loginUser.methodName;
    type Params = d.loginUser.Params;
    type Response = d.loginUser.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            isValidEmail(params.email) &&
            typeof params.password === "string"
        ),
        "handler": async (params, session) => {

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
    };

    handlers[methodName]= handler;

})();

(() => {

    let methodName = d.logoutUser.methodName;
    type Params = d.logoutUser.Params;
    type Response = d.logoutUser.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => params === undefined,
        "handler": async (params, session) => {

            session.auth= undefined;

            return undefined;

        }
    };

    handlers[methodName]= handler;

})();

(() => {

    let methodName = d.sendRenewPasswordEmail.methodName;
    type Params = d.sendRenewPasswordEmail.Params;
    type Response = d.sendRenewPasswordEmail.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            isValidEmail(params.email)
        ),
        "handler": async params=> {

            let { email } = params;

            let hash= await db.getUserHash(email);

            //TODO send email

            return hash !== undefined;

        }
    };

    handlers[methodName]= handler;

})();


(() => {

    let methodName = d.getSims.methodName;
    type Params = d.getSims.Params;
    type Response = d.getSims.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => params === undefined,
        "handler": (params, session)=> db.getUserSims(session.auth!.user)
    };

    handlers[methodName]= handler;

})();

(() => {

    let methodName = d.getUnregisteredLanDongles.methodName;
    type Params = d.getUnregisteredLanDongles.Params;
    type Response = d.getUnregisteredLanDongles.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => params === undefined,
        "handler": async (params, session, remoteAddress) =>
            db.filterDongleWithRegistrableSim(
                session.auth!.user,
                (await utils.getDonglesConnectedFrom(remoteAddress)).keys()
            )
    };

    handlers[methodName] = handler;

})();


(() => {

    let methodName = d.unlockSim.methodName;
    type Params = d.unlockSim.Params;
    type Response = d.unlockSim.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            dcSanityChecks.imei(params.imei) &&
            typeof params.pin === "string" &&
            !!params.pin.match(/^[0-9]{4}$/)
        ),
        "handler": async (params, session, remoteAddress)=> {

            let { imei, pin } = params;

            let donglePathMap = await utils.getDonglesConnectedFrom(remoteAddress);

            let lockedDongle = Array.from(donglePathMap.keys()).find(
                dongle => dcTypes.Dongle.Locked.match(dongle) && dongle.imei === imei
            ) as dcTypes.Dongle.Locked | undefined;

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

                let resp: feTypes.UnlockResult.ValidPin.Registerable = {
                    "wasPinValid": true,
                    "isSimRegisterable": true,
                    dongle
                };

                return resp;

            } else {

                let resp: feTypes.UnlockResult.ValidPin.NotRegisterable = {
                    "wasPinValid": true,
                    "isSimRegisterable": false,
                    "simRegisteredBy": (simOwner.user === session.auth!.user) ?
                        ({ "who": "MYSELF" }) :
                        ({ "who": "OTHER USER", "email": simOwner.email })
                };

                return resp;

            }

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = d.registerSim.methodName;
    type Params = d.registerSim.Params;
    type Response = d.registerSim.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.friendlyName === "string"
        ),
        "handler": async (params, session, remoteAddress) => {

            let { imsi, friendlyName } = params;

            let donglePathMap = await utils.getDonglesConnectedFrom(remoteAddress);

            let dongle = Array.from(donglePathMap.keys()).find(
                dongle => dcTypes.Dongle.Usable.match(dongle) && dongle.sim.imsi === imsi
            ) as dcTypes.Dongle.Usable | undefined;

            if (!dongle) throw new Error("assert");

            let password = utils.simPassword.read(donglePathMap.get(dongle)!, imsi);

            if (!password) throw new Error("assert");

            let userUas = await db.registerSim(
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
    };

    handlers[methodName] = handler;

})();


(() => {

    let methodName = d.unregisterSim.methodName;
    type Params = d.unregisterSim.Params;
    type Response = d.unregisterSim.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": async (params, session)=> {

            let { imsi } = params;

            let affectedUas = await db.unregisterSim(
                session.auth!.user,
                imsi
            );

            let gwSocket = sipProxy.gatewaySockets.getSimRoute(imsi);

            if (gwSocket) {

                sipApiGateway.reNotifySimOnline(gwSocket, imsi);

            }

            await utils.sendPushNotification.toUas(affectedUas, "RELOAD CONFIG");

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();



(() => {

    let methodName = d.shareSim.methodName;
    type Params = d.shareSim.Params;
    type Response = d.shareSim.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            !params.emails.find( email => !isValidEmail(email)) &&
            typeof params.message === "string"
        ),
        "handler": async (params, session) => {

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
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = d.stopSharingSim.methodName;
    type Params = d.stopSharingSim.Params;
    type Response = d.stopSharingSim.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            !params.emails.find( email => !isValidEmail(email))
        ),
        "handler": async (params, session)=> {

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
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = d.setSimFriendlyName.methodName;
    type Params = d.setSimFriendlyName.Params;
    type Response = d.setSimFriendlyName.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.friendlyName === "string"
        ),
        "handler": async (params, session) => {

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
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = d.getUaConfig.methodName;
    type Params = d.getUaConfig.Params;
    type Response = d.getUaConfig.Response;

    const hexToUtf8 = (hexStr: string) =>
        Buffer.from(hexStr, "hex").toString("utf8");

    const ov = ` overwrite="true" `;
    const domain = c.shared.domain;

    let handler: Handler<Params, Response> = {
        "needAuth": false,
        "contentType": "application/xml",
        "sanityChecks": params => {
            try {
                return (
                    isValidEmail(hexToUtf8(params.email_as_hex)) &&
                    typeof hexToUtf8(params.password_as_hex) === "string"
                );
            } catch {
                return false;
            }
        },
        "handler": async params=> {

            let email = hexToUtf8(params.email_as_hex).toLowerCase();
            let password = hexToUtf8(params.password_as_hex);

            let user = await db.authenticateUser(email, password);

            if (!user) throw new Error("assert");

            let endpointEntries: string[] = [];
            let contactEntries: string[] = [];

            //TODO: maybe find a way to smuggle sim infos in config
            let contact_parameters = entities.encode(`base64_email=${Buffer.from(email, "utf8").toString("base64")}`);

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
                    `    <entry name="reg_expires" ${ov}>${21601}</entry>`,
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
    };

    handlers[methodName] = handler;


})();


import dw = d.webphoneData;

(() => {

    let methodName = dw.fetch.methodName;
    type Params = dw.fetch.Params;
    type Response = dw.fetch.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => params === undefined,
        "handler": (params, session) => dbw.fetch(session.auth!)
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.newInstance.methodName;
    type Params = dw.newInstance.Params;
    type Response = dw.newInstance.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": (params, session) => dbw.newInstance(
            session.auth!.user,
            params.imsi
        )
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.newChat.methodName;
    type Params = dw.newChat.Params;
    type Response = dw.newChat.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.instance_id === "number" &&
            typeof params.contactNumber === "string" &&
            typeof params.contactName === "string" &&
            typeof params.isContactInSim === "boolean"
        ),
        "handler": (params, session) => dbw.newChat(
            session.auth!.user,
            params.instance_id,
            params.contactNumber,
            params.contactName,
            params.isContactInSim
        )
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.updateChat.methodName;
    type Params = dw.updateChat.Params;
    type Response = dw.updateChat.Response;

    let handler: Handler<Params, Response> = {
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
        "handler": (params, session) => dbw.updateChat(
            session.auth!.user,
            params.chat_id,
            params.lastSeenTime,
            params.contactName,
            params.isContactInSim
        )
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.destroyChat.methodName;
    type Params = dw.destroyChat.Params;
    type Response = dw.destroyChat.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.chat_id === "number"
        ),
        "handler": (params, session) => dbw.destroyChat(
            session.auth!.user,
            params.chat_id
        )
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.newMessage.methodName;
    type Params = dw.newMessage.Params;
    type Response = dw.newMessage.Response;

    let handler: Handler<Params, Response> = {
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
                        (
                            params.message.status === "SEND REPORT RECEIVED" &&
                            (
                                typeof params.message.dongleSendTime === "number" ||
                                params.message.dongleSendTime === null
                            )
                        ) ||
                        (
                            params.message.status === "STATUS REPORT RECEIVED" &&
                            (
                                typeof params.message.dongleSendTime === "number" ||
                                params.message.dongleSendTime === null
                            ) && (
                                typeof params.message.deliveredTime === "number" ||
                                params.message.deliveredTime === null
                            )
                        )
                    ) &&
                    params.message.sentBy instanceof Object &&
                    (
                        params.message.sentBy.who === "MYSELF" ||
                        (
                            params.message.sentBy.who === "OTHER" &&
                            isValidEmail(params.message.sentBy.email)
                        )
                    )
                )
            )
        ),
        "handler": (params, session) => dbw.newMessage(
            session.auth!.user,
            params.chat_id,
            params.message
        )
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.updateOutgoingMessageStatusToSendReportReceived.methodName;
    type Params = dw.updateOutgoingMessageStatusToSendReportReceived.Params;
    type Response = dw.updateOutgoingMessageStatusToSendReportReceived.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.message_id === "number" &&
            (
                typeof params.dongleSendTime === "number" ||
                params.dongleSendTime === null
            )
        ),
        "handler": (params, session) => dbw.updateOutgoingMessageStatusToSendReportReceived(
            session.auth!.user,
            params.message_id,
            params.dongleSendTime
        )
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.updateOutgoingMessageStatusToStatusReportReceived.methodName;
    type Params = dw.updateOutgoingMessageStatusToStatusReportReceived.Params;
    type Response = dw.updateOutgoingMessageStatusToStatusReportReceived.Response;

    let handler: Handler<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof params.message_id === "number" &&
            (
                typeof params.deliveredTime === "number" ||
                params.deliveredTime === null
            )
        ),
        "handler": (params, session) => dbw.updateOutgoingMessageStatusToStatusReportReceived(
            session.auth!.user,
            params.message_id,
            params.deliveredTime
        )
    };

    handlers[methodName] = handler;

})();
