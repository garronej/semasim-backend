
import { webApiDeclaration as apiDeclaration } from "../../frontend";
import * as dbSemasim from "../dbSemasim";
import {
    Handler,
    Handlers,
    errorHttpCode,
    httpCodes
} from "../../tools/webApi";
import * as sessionManager from "./sessionManager";
import { getUserWebUaInstanceId } from "../toUa/localApiHandlers";
import * as emailSender from "../emailSender";
import * as pushNotifications from "../pushNotifications";
import { deploy } from "../../deploy";
import * as stripe from "../stripe";


import {
    version as semasim_gateway_version,
    misc as gwMisc,
    types as gwTypes
} from "../../gateway";

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
        "handler": async ({ email, password }, _session, remoteAddress) => {

            email = email.toLowerCase();

            const accountCreationResp = await dbSemasim.createUserAccount(
                email, password, remoteAddress
            );

            if (!accountCreationResp) {
                return "EMAIL NOT AVAILABLE";
            }

            await dbSemasim.addOrUpdateUa({
                "instance": getUserWebUaInstanceId(accountCreationResp.user),
                "userEmail": email,
                "platform": "web",
                "pushToken": "",
                "software": "JsSIP"
            });

            if (accountCreationResp.activationCode !== null) {

                emailSender.emailValidation(
                    email,
                    accountCreationResp.activationCode
                );

                return "CREATED";

            }else{

                return "CREATED NO ACTIVATION REQUIRED";

            }

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.validateEmail.methodName;
    type Params = apiDeclaration.validateEmail.Params;
    type Response = apiDeclaration.validateEmail.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            gwMisc.isValidEmail(params.email) &&
            typeof params.activationCode === "string" &&
            params.activationCode.length === 4
        ),
        "handler": ({ email, activationCode }) =>
            dbSemasim.validateUserEmail(email, activationCode)
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

            const resp = await dbSemasim.authenticateUser(email, password);

            if (resp.status === "SUCCESS") {

                sessionManager.setAuth(session, resp.auth);

                return { "status": "SUCCESS" as "SUCCESS" };

            }

            return resp;

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

            const token = await dbSemasim.setPasswordRenewalToken(email);

            if (token !== undefined) {

                await emailSender.passwordRenewalRequest(email, token);

            }

            return token !== undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.renewPassword.methodName;
    type Params = apiDeclaration.renewPassword.Params;
    type Response = apiDeclaration.renewPassword.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            gwMisc.isValidEmail(params.email) &&
            typeof params.newPassword === "string" &&
            typeof params.token === "string"
        ),
        "handler": async ({ email, newPassword, token }) => {

            const wasTokenStillValid = await dbSemasim.renewPassword(email, token, newPassword)

            if (wasTokenStillValid) {

                dbSemasim.getUserUa(email)
                    .then(uas => pushNotifications.send(
                        uas,
                        { "type": "RELOAD CONFIG" }
                    ));

            }

            return wasTokenStillValid;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.getSubscriptionInfos.methodName;
    type Params = apiDeclaration.getSubscriptionInfos.Params;
    type Response = apiDeclaration.getSubscriptionInfos.Response;


    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": async (_params, session, _remoteAddress, req) => {

            const auth = sessionManager.getAuth(session)!;

            return stripe.getSubscriptionInfos(
                auth,
                (() => {

                    const hv = req.header("Accept-Language");

                    if (hv === undefined) {
                        return "";
                    }

                    const match = hv.match(/\-([A-Z]{2})/);

                    if (match === null) {
                        return "";
                    }

                    return match[1].toLowerCase();

                })()
            );

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.subscribeOrUpdateSource.methodName;
    type Params = apiDeclaration.subscribeOrUpdateSource.Params;
    type Response = apiDeclaration.subscribeOrUpdateSource.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            (
                params.sourceId === undefined ||
                typeof params.sourceId === "string"
            )
        ),
        "handler": async ({ sourceId }, session) => {

            const auth = sessionManager.getAuth(session)!;

            await stripe.subscribeUser(auth, sourceId);

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const methodName = apiDeclaration.unsubscribe.methodName;
    type Params = apiDeclaration.unsubscribe.Params;
    type Response = apiDeclaration.unsubscribe.Response;

    const handler: Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": async (_params, session) => {

            const auth = sessionManager.getAuth(session)!;

            await stripe.unsubscribeUser(auth);

            return undefined;

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

{

    const methodName = "linphonerc";

    type Params = {
        email_as_hex: string;
        password_as_hex: string;
    } | {
        email_as_hex: string;
        password_as_hex: string;
        uuid: string;
        platform: gwTypes.Ua.Platform;
        push_token_as_hex: string;
    };

    const hexToUtf8 = (hexStr: string) => Buffer.from(hexStr, "hex").toString("utf8");

    const substitute4BytesChar = (str: string) => Array.from(str)
        .map(c => Buffer.from(c, "utf8").length <= 3 ? c : "?")
        .join("")
        ;

    const toIni = (config: object): string => Object.keys(config).map(
        keySection => [
            `[${keySection}]`,
            ...(Object.keys(config[keySection])
                .map(keyEntry => `${keyEntry}=${config[keySection][keyEntry]}`))
        ].join("\n")
    ).join("\n\n");

    const handler: Handler.Generic<Params> = {
        "needAuth": false,
        "contentType": "text/plain; charset=utf-8",
        "sanityCheck": params => {
            try {
                return (
                    gwMisc.isValidEmail(hexToUtf8(params.email_as_hex)) &&
                    !!hexToUtf8(params.password_as_hex) &&
                    !("uuid" in params) ||
                    (
                        "uuid" in params &&
                        gwMisc.sanityChecks.platform(params.platform) &&
                        !!hexToUtf8(params.push_token_as_hex)
                    )
                );
            } catch {
                return false;
            }
        },
        "handler": async params => {

            const authResp = await dbSemasim.authenticateUser(
                hexToUtf8(params.email_as_hex),
                hexToUtf8(params.password_as_hex)
            );

            switch (authResp.status) {
                case "RETRY STILL FORBIDDEN": {

                    const error = new Error("Account temporally locked");

                    errorHttpCode.set(error, httpCodes.LOCKED);

                    throw error;

                }
                case "NOT VALIDATED YET":
                case "NO SUCH ACCOUNT":
                case "WRONG PASSWORD": {

                    const error = new Error("User not authenticated");

                    errorHttpCode.set(error, httpCodes.UNAUTHORIZED);

                    throw error;

                }
                case "SUCCESS": break;
            }

            const auth = authResp.auth;

            if ("uuid" in params) {

                await dbSemasim.addOrUpdateUa({
                    "instance": `"<urn:uuid:${params.uuid}>"`,
                    "userEmail": auth.email,
                    "platform": params.platform,
                    "pushToken": hexToUtf8(params.push_token_as_hex),
                    //TODO: Remove this field from project.
                    "software": ""
                });

            }

            if (!await stripe.isUserSubscribed(authResp.auth)) {

                const error = new Error("User does not have mobile subscription");

                errorHttpCode.set(error, httpCodes.PAYMENT_REQUIRED);

                throw error;

            }

            const p_email = `enc_email=${gwMisc.urlSafeB64.enc(auth.email)}`;
            const config: object = {};
            let endpointCount = 0;
            let contactCount = 0;

            for (
                const { sim, friendlyName, password, ownership, phonebook, isOnline }
                of await dbSemasim.getUserSims(auth)
            ) {

                if (ownership.status === "SHARED NOT CONFIRMED") {
                    continue;
                }

                config[`nat_policy_${endpointCount}`] = {
                    "ref": `nat_policy_${endpointCount}`,
                    "stun_server": `${deploy.getBaseDomain()}`,
                    "protocols": "stun,ice"
                };

                //TODO: It's dirty to have this here, do we even need XML anymore?
                const safeFriendlyName = substitute4BytesChar(friendlyName.replace(/"/g, `\\"`));

                /** 
                 * iso does not really need to be in the contact parameters.
                 * The gateway already know the SIM's origin country.
                 * We set it here however to inform linphone about it,
                 * linphone does not have the lib to parse IMSI so
                 * we need to provide this info.
                 * */
                config[`proxy_${endpointCount}`] = {
                    "reg_proxy": `<sip:${deploy.getBaseDomain()};transport=TLS>`,
                    "reg_route": `sip:${deploy.getBaseDomain()};transport=TLS;lr`,
                    "reg_expires": `${21601}`,
                    "reg_identity": `"${safeFriendlyName}" <sip:${sim.imsi}@${deploy.getBaseDomain()};transport=TLS>`,
                    "contact_parameters": `${p_email};iso=${sim.country ? sim.country.iso : "undefined"}`,
                    "reg_sendregister": isOnline ? "1" : "0",
                    "publish": "0",
                    "nat_policy_ref": `nat_policy_${endpointCount}`
                };

                config[`auth_info_${endpointCount}`] = {
                    "username": sim.imsi,
                    "userid": sim.imsi,
                    "passwd": password
                };

                for (const contact of phonebook) {

                    const safeContactName = substitute4BytesChar(contact.name.replace(/"/g, `\\"`));

                    config[`friend_${contactCount}`] = {
                        "url": `"${safeContactName} (proxy_${endpointCount})" <sip:${contact.number_raw}@${deploy.getBaseDomain()}>`,
                        "pol": "accept",
                        "subscribe": "0"
                    };

                    contactCount++;

                }

                endpointCount++;

            }

            return Buffer.from(toIni(config), "utf8");

        }
    };

    handlers[methodName] = handler;

}


