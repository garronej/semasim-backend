
import { webApiDeclaration as apiDeclaration } from "../../semasim-frontend";
import * as dbSemasim from "../dbSemasim";
import { 
    Handler, 
    Handlers, 
    internalErrorCustomHttpCode, 
    httpCodes 
} from "../../tools/webApi";
import * as sessionManager from "./sessionManager";
import { getUserWebUaInstanceId } from "../toUa/localApiHandlers";

import { 
    version as semasim_gateway_version ,
    misc as gwMisc
} from "../../semasim-gateway";

import * as html_entities from "html-entities";
const entities = new html_entities.XmlEntities;

export const handlers: Handlers = {};

//TODO: regexp for password once and for all!!!
//TODO: regexp for friendly name!!!
//TODO: set some reasonable max length for text messages... maybe set max packet length

{

    const methodName = apiDeclaration.registerUser.methodName;
    type Params = apiDeclaration.registerUser.Params;
    type Response = apiDeclaration.registerUser.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            gwMisc.isValidEmail(params.email) &&
            typeof params.password === "string"
        ),
        "handler": async ({ email, password }) => {

            const user = await dbSemasim.createUserAccount(email, password);

            if (!user) {
                return "EMAIL NOT AVAILABLE";
            }

            dbSemasim.addOrUpdateUa({
                "instance": `"<urn:${getUserWebUaInstanceId(user)}>"`,
                "userEmail": email,
                "platform": "web",
                "pushToken": "",
                "software": "JsSIP"
            });

            return "CREATED";

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.loginUser.methodName;
    type Params = apiDeclaration.loginUser.Params;
    type Response = apiDeclaration.loginUser.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            gwMisc.isValidEmail(params.email) &&
            typeof params.password === "string"
        ),
        "handler": async ({ email, password }, session) => {

            let user = await dbSemasim.authenticateUser(email, password);

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

}

{

    const methodName = apiDeclaration.logoutUser.methodName;
    type Params = apiDeclaration.logoutUser.Params;
    type Response = apiDeclaration.logoutUser.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": (_params, session) => {

            sessionManager.setAuth(session, undefined);

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.sendRenewPasswordEmail.methodName;
    type Params = apiDeclaration.sendRenewPasswordEmail.Params;
    type Response = apiDeclaration.sendRenewPasswordEmail.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            gwMisc.isValidEmail(params.email)
        ),
        "handler": async ({ email }) => {

            const hash = await dbSemasim.getUserHash(email);

            //TODO send email

            return hash !== undefined;

        }
    };

    handlers[methodName] = handler;

}

{

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
                    gwMisc.isValidEmail(hexToUtf8(params.email_as_hex)) &&
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

            const user = await dbSemasim.authenticateUser(email, password);

            if (!user) {

                const error = new Error("User not authenticated");

                internalErrorCustomHttpCode.set(error, httpCodes.UNAUTHORIZED);

                throw error;

            }

            const p_email = `enc_email=${gwMisc.urlSafeB64.enc(email)}`;
            const config: object = {};
            let endpointCount = 0;
            let contactCount = 0;

            for (
                const { sim, friendlyName, password, ownership, phonebook }
                of await dbSemasim.getUserSims({ user, email })
            ) {

                if (ownership.status === "SHARED NOT CONFIRMED") {
                    continue;
                }

                /*
                if( endpointCount === 0 ){

                    config["sip"]= { 
                        "default_proxy": `${endpointCount}` 
                    };

                }
                */

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
                    "nat_policy_ref": `nat_policy_${endpointCount}`
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

            if (format === "INI") {

                overwriteResponseContentType("text/plain; charset=utf-8");

            }

            return Buffer.from(format === "XML" ? toXml(config) : toIni(config));

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = "version";
    type Params = {};

    const handler: Handler.Generic<Params> = {
        "needAuth": false,
        "contentType": "text/plain; charset=utf-8",
        "sanityCheck": (params) => params instanceof Object,
        "handler": async () => Buffer.from(semasim_gateway_version, "utf8")
    };

    handlers[methodName] = handler;

}

