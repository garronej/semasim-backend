
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import {
    webApiDeclaration as d
} from "../../../semasim-frontend";
import * as db from "../../dbSemasim";
import { Handler, Handlers, internalErrorCustomHttpCode, httpCodes } from "../../../tools/webApi";
import * as sessionManager from "./sessionManager";
import * as dbw from "./dbWebphone";
import * as gatewaySideSockets_remoteApi from "../sipProxy/gatewaySideSockets/remoteApiCaller";
import * as pushNotifications from "../../pushNotifications";

import { types as gwTypes, version as semasim_gateway_version } from "../../../semasim-gateway";
import isValidEmail = gwTypes.misc.isValidEmail


import * as html_entities from "html-entities";
const entities = new html_entities.XmlEntities;

export const handlers: Handlers = {};

//TODO: regexp for password once and for all!!!
//TODO: regexp for friendly name!!!
//TODO: set some reasonable max length for text messages... maybe set max packet length

(() => {

    let methodName = d.registerUser.methodName;
    type Params = d.registerUser.Params;
    type Response = d.registerUser.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            isValidEmail(params.email) &&
            typeof params.password === "string"
        ),
        "handler": async ({ email, password }) => {

            let user = await db.createUserAccount(email, password);

            return user ? "CREATED" : "EMAIL NOT AVAILABLE";

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = d.loginUser.methodName;
    type Params = d.loginUser.Params;
    type Response = d.loginUser.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            isValidEmail(params.email) &&
            typeof params.password === "string"
        ),
        "handler": async ({ email, password }, session) => {

            let user = await db.authenticateUser(email, password);

            if (!user) {

                return false;

            }

            sessionManager.setAuth(session, {
                user, "email": email.toLocaleLowerCase()
            });

            return true;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = d.logoutUser.methodName;
    type Params = d.logoutUser.Params;
    type Response = d.logoutUser.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": (params, session) => {

            sessionManager.setAuth(session, undefined);

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = d.sendRenewPasswordEmail.methodName;
    type Params = d.sendRenewPasswordEmail.Params;
    type Response = d.sendRenewPasswordEmail.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            isValidEmail(params.email)
        ),
        "handler": async ({ email }) => {

            const hash = await db.getUserHash(email);

            //TODO send email

            return hash !== undefined;

        }
    };

    handlers[methodName] = handler;

})();


(() => {

    const methodName = d.getSims.methodName;
    type Params = d.getSims.Params;
    type Response = d.getSims.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": (_params, session) => db.getUserSims(sessionManager.getAuth(session)!)
    };

    handlers[methodName] = handler;

})();

(() => {

    /*
    TODO: optimizations.
    */

    let methodName = d.getUnregisteredLanDongles.methodName;
    type Params = d.getUnregisteredLanDongles.Params;
    type Response = d.getUnregisteredLanDongles.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": async (params, session, remoteAddress) =>
            db.filterDongleWithRegistrableSim(
                sessionManager.getAuth(session)!,
                await gatewaySideSockets_remoteApi.getDongles(remoteAddress)
            )
    };

    handlers[methodName] = handler;

})();


(() => {

    let methodName = d.unlockSim.methodName;
    type Params = d.unlockSim.Params;
    type Response = d.unlockSim.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imei(params.imei) &&
            typeof params.pin === "string" &&
            !!params.pin.match(/^[0-9]{4}$/)
        ),
        "handler": async ({ imei, pin }, session, remoteAddress) => {

            let result = await gatewaySideSockets_remoteApi.unlockDongle(
                imei, pin, remoteAddress, sessionManager.getAuth(session)!
            );

            if (result === undefined) {
                throw new Error("Unlock failed, internal error");
            }

            return result;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = d.rebootDongle.methodName;
    type Params = d.rebootDongle.Params;
    type Response = d.rebootDongle.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": async ({ imsi }, session) => {

            const { isSuccess }= await gatewaySideSockets_remoteApi.rebootDongle(
                imsi, sessionManager.getAuth(session)!
            );

            if( !isSuccess ){
                throw new Error("Reboot dongle error");
            }

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = d.registerSim.methodName;
    type Params = d.registerSim.Params;
    type Response = d.registerSim.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.friendlyName === "string"
        ),
        "handler": async ({ imsi, friendlyName }, session, remoteAddress) => {

            try {

                var { dongle, sipPassword } = (await gatewaySideSockets_remoteApi.getSipPasswordAndDongle(
                    imsi,
                    remoteAddress
                ))!;

            } catch{

                throw new Error("Dongle not found");

            }

            

            const userUas = await db.registerSim(
                sessionManager.getAuth(session)!,
                dongle.sim,
                friendlyName,
                sipPassword,
                dongle,
                remoteAddress
            );

            pushNotifications.send(userUas, "RELOAD CONFIG");

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = d.unregisterSim.methodName;
    type Params = d.unregisterSim.Params;
    type Response = d.unregisterSim.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": async ({ imsi }, session) => {

            let affectedUas = await db.unregisterSim(
                sessionManager.getAuth(session)!,
                imsi
            );

            gatewaySideSockets_remoteApi.reNotifySimOnline(imsi);

            pushNotifications.send(affectedUas, "RELOAD CONFIG");

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = d.shareSim.methodName;
    type Params = d.shareSim.Params;
    type Response = d.shareSim.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            !params.emails.find(email => !isValidEmail(email)) &&
            typeof params.message === "string"
        ),
        "handler": async (params, session) => {

            let { imsi, emails, message } = params;

            let affectedUsers = await db.shareSim(
                sessionManager.getAuth(session)!,
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

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            !params.emails.find(email => !isValidEmail(email))
        ),
        "handler": async ({ imsi, emails }, session) => {

            const noLongerRegisteredUas = await db.stopSharingSim(
                sessionManager.getAuth(session)!,
                imsi,
                emails
            );

            if (noLongerRegisteredUas.length) {

                gatewaySideSockets_remoteApi.reNotifySimOnline(imsi);

                pushNotifications.send(noLongerRegisteredUas, "RELOAD CONFIG");

            }

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = d.setSimFriendlyName.methodName;
    type Params = d.setSimFriendlyName.Params;
    type Response = d.setSimFriendlyName.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.friendlyName === "string"
        ),
        "handler": async ({ imsi, friendlyName }, session) => {

            const userUas = await db.setSimFriendlyName(
                sessionManager.getAuth(session)!,
                imsi,
                friendlyName
            );

            pushNotifications.send(userUas, "RELOAD CONFIG");

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();


(() => {

    const methodName = d.createContact.methodName;
    type Params = d.createContact.Params;
    type Response = d.createContact.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.name === "string" &&
            typeof params.number === "string"
        ),
        "handler": async ({ imsi, name, number }, session) => {

            const result = await gatewaySideSockets_remoteApi.createContact(
                imsi, name, number, sessionManager.getAuth(session)!
            );

            if (result === undefined) {
                throw new Error("Create contact failed, internal error");
            }

            return result;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = d.updateContactName.methodName;
    type Params = d.updateContactName.Params;
    type Response = d.updateContactName.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.contactRef instanceof Object &&
            (
                typeof params.contactRef["mem_index"] === "number" ||
                typeof params.contactRef["number"] === "string"
            ) &&
            typeof params.newName === "string" &&
            params.newName !== ""
        ),
        "handler": async ({ imsi, contactRef, newName }, session, remoteAddress) => {

            const result = await gatewaySideSockets_remoteApi.updateContactName(
                imsi, contactRef, newName, sessionManager.getAuth(session)!
            );

            if( !result.isSuccess ){
                throw new Error("Update contact error");
            }

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = d.deleteContact.methodName;
    type Params = d.deleteContact.Params;
    type Response = d.deleteContact.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            params.contactRef instanceof Object &&
            (
                typeof params.contactRef["mem_index"] === "number" ||
                typeof params.contactRef["number"] === "string"
            )
        ),
        "handler": async ({ imsi, contactRef }, session, remoteAddress) => {

            const result = await gatewaySideSockets_remoteApi.deleteContact(
                imsi, contactRef, sessionManager.getAuth(session)!
            );

            if( !result.isSuccess ){
                throw new Error("Delete contact error");
            }

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();


(() => {

    //TODO: enable "Send DTMFs in SIP" disable "Send DTMFs in stream" in static config
    //TODO: remove response from declaration
    const methodName = "get-user-linphone-config";
    type Params = { email_as_hex: string; password_as_hex: string; format?: "XML" | "INI" };;

    const hexToUtf8 = (hexStr: string) => Buffer.from(hexStr, "hex").toString("utf8");

    const domain = "semasim.com";

    const toXml = (config: object): string => {

        return [
            `<?xml version="1.0" encoding="UTF-8"?>`,
            [
                `<config xmlns="http://www.linphone.org/xsds/lpconfig.xsd" `,
                `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" `,
                `xsi:schemaLocation="http://www.linphone.org/xsds/lpconfig.xsd lpconfig.xsd">`,
            ].join(""),
            ...(() => {

                const sections: string[] = [];

                for (const keySection in config) {

                    sections.push([
                        `  <section name="${keySection}">`,
                        ...(() => {

                            const entries: string[] = [];

                            for (const keyEntry in config[keySection]) {

                                entries.push([
                                    `    <entry name="${keyEntry}" overwrite="true">`,
                                    entities.encode(config[keySection][keyEntry]),
                                    `</entry>`
                                ].join(""));

                            }

                            return entries;

                        })(),
                        `  </section>`
                    ].join("\n"));

                }

                return sections;

            })(),
            `</config>`
        ].join("\n");

    };

    const toIni = (config: object): string => {

        return Object.keys(config).map(
            keySection => [
                `[${keySection}]`,
                ...(Object.keys(config[keySection])
                    .map(keyEntry => `${keyEntry}=${config[keySection][keyEntry]}`))
            ].join("\n")
        ).join("\n\n");

    };

    //text/plain

    const handler: Handler.Generic<Params> = {
        "needAuth": false,
        "contentType": "application/xml; charset=utf-8",
        "sanityCheck": params => {
            try {
                return (
                    isValidEmail(hexToUtf8(params.email_as_hex)) &&
                    typeof hexToUtf8(params.password_as_hex) === "string"
                );
            } catch {
                return false;
            }
        },
        "handler": async (params, _session, _remoteAddress, _req, overwriteResponseContentType) => {

            const email = hexToUtf8(params.email_as_hex).toLowerCase();
            const password = hexToUtf8(params.password_as_hex);

            const format = params.format || "XML";


            const user = await db.authenticateUser(email, password);

            if (!user) {

                const error = new Error("User not authenticated");

                internalErrorCustomHttpCode.set(error, httpCodes.UNAUTHORIZED);

                throw error;

            }

            const p_email = `enc_email=${gwTypes.misc.urlSafeB64.enc(email)}`;
            const config: object = {};
            let endpointCount = 0;
            let contactCount = 0;

            for (const { sim, friendlyName, password, ownership, phonebook } of await db.getUserSims({ user, email })) {

                if (ownership.status === "SHARED NOT CONFIRMED") {
                    continue;
                }

                if( endpointCount === 0 ){

                    config["sip"]= { 
                        "default_proxy": `${endpointCount}` 
                    };

                }

                config[`nat_policy_${endpointCount}`] = {
                    "ref": `nat_policy_${endpointCount}`,
                    "stun_server": domain,
                    "protocols": "stun,ice"
                };

                config[`proxy_${endpointCount}`] = {
                    //"reg_proxy": `sip:${domain};transport=TLS`,
                    "reg_proxy": `<sip:${domain};transport=TLS>`,
                    "reg_route": `sip:${domain};transport=TLS;lr`,
                    "reg_expires": `${21601}`,
                    "reg_identity": `"${friendlyName}" <sip:${sim.imsi}@${domain};transport=TLS;${p_email}>`,
                    "contact_parameters": p_email,
                    "reg_sendregister": "1",
                    "publish": "0",
                    "nat_policy_ref": `nat_policy_${endpointCount}`,

                };

                config[`auth_info_${endpointCount}`] = {
                    "username": sim.imsi,
                    "userid": sim.imsi,
                    "passwd": password
                };

                endpointCount++;

                for (const contact of phonebook) {

                    config[`friend_${contactCount}`] = {
                        "url": `"${contact.name} (${friendlyName})" <sip:${contact.number_local_format}@${domain}>`,
                        "pol": "accept",
                        "subscribe": "0"
                    };

                    contactCount++;

                }

            }

            if( format === "INI" ){

                overwriteResponseContentType("text/plain; charset=utf-8");

            }

            return Buffer.from(format==="XML"?toXml(config):toIni(config));

        }
    };

    handlers[methodName] = handler;


})();

(() => {

    const methodName = "version";
    type Params = {};

    const handler: Handler.Generic<Params> = {
        "needAuth": false,
        "contentType": "text/plain; charset=utf-8",
        "sanityCheck": (params) => params instanceof Object,
        "handler": async () => Buffer.from(semasim_gateway_version, "utf8")
    };

    handlers[methodName] = handler;

})();


import dw = d.webphoneData;

(() => {

    let methodName = dw.fetch.methodName;
    type Params = dw.fetch.Params;
    type Response = dw.fetch.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": (params, session) => dbw.fetch(sessionManager.getAuth(session)!)
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.newInstance.methodName;
    type Params = dw.newInstance.Params;
    type Response = dw.newInstance.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": (params, session) => dbw.newInstance(
            sessionManager.getAuth(session)!.user,
            params.imsi
        )
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.newChat.methodName;
    type Params = dw.newChat.Params;
    type Response = dw.newChat.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.instance_id === "number" &&
            typeof params.contactNumber === "string" &&
            typeof params.contactName === "string" &&
            (typeof params.contactIndexInSim === "number" || params.contactIndexInSim === null)
        ),
        "handler": (params, session) => dbw.newChat(
            sessionManager.getAuth(session)!.user,
            params.instance_id,
            params.contactNumber,
            params.contactName,
            params.contactIndexInSim
        )
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.updateChat.methodName;
    type Params = dw.updateChat.Params;
    type Response = dw.updateChat.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.chat_id === "number" &&
            (
                params.lastSeenTime === undefined ||
                typeof params.lastSeenTime === "number"
            ) && (
                params.contactName === undefined ||
                typeof params.contactName === "string"
            ) && (
                params.contactIndexInSim === undefined ||
                typeof params.contactIndexInSim === "number" ||
                params.contactIndexInSim === null
            )
        ),
        "handler": (params, session) => dbw.updateChat(
            sessionManager.getAuth(session)!.user,
            params.chat_id,
            params.lastSeenTime,
            params.contactName,
            params.contactIndexInSim
        )
    };

    handlers[methodName] = handler;

})();

(() => {

    let methodName = dw.destroyChat.methodName;
    type Params = dw.destroyChat.Params;
    type Response = dw.destroyChat.Response;

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.chat_id === "number"
        ),
        "handler": (params, session) => dbw.destroyChat(
            sessionManager.getAuth(session)!.user,
            params.chat_id
        )
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = dw.newMessage.methodName;
    type Params = dw.newMessage.Params;
    type Response = dw.newMessage.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
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
            sessionManager.getAuth(session)!.user,
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

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.message_id === "number" &&
            (
                typeof params.dongleSendTime === "number" ||
                params.dongleSendTime === null
            )
        ),
        "handler": (params, session) => dbw.updateOutgoingMessageStatusToSendReportReceived(
            sessionManager.getAuth(session)!.user,
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

    let handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.message_id === "number" &&
            (
                typeof params.deliveredTime === "number" ||
                params.deliveredTime === null
            )
        ),
        "handler": (params, session) => dbw.updateOutgoingMessageStatusToStatusReportReceived(
            sessionManager.getAuth(session)!.user,
            params.message_id,
            params.deliveredTime
        )
    };

    handlers[methodName] = handler;

})();
