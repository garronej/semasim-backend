
import { currencyLib } from "../../frontend";
import * as dbSemasim from "../dbSemasim";
import * as dbWebphone from "../dbWebphone";
import { webApi } from "../../load-balancer";
import * as sessionManager from "./sessionManager";
import * as emailSender from "../emailSender";
import * as pushNotifications from "../pushNotifications";
import { deploy } from "../../deploy";
import * as stripe from "../stripe";
import { geoiplookup } from "../../tools/geoiplookup";
import * as mobile from "../../mobile";
import * as apiDeclaration from "../../web_api_declaration";

import {
    version as semasim_gateway_version,
    misc as gwMisc
} from "../../gateway";

export const handlers: webApi.Handlers = {};

//TODO: regexp for password once and for all!!!
//TODO: regexp for friendly name!!!
//TODO: set some reasonable max length for text messages... maybe set max packet length

{

    const { methodName } = apiDeclaration.registerUser;
    type Params = apiDeclaration.registerUser.Params;
    type Response = apiDeclaration.registerUser.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            gwMisc.isValidEmail(params.email) &&
            typeof params.secret === "string" &&
            typeof params.towardUserEncryptKeyStr === "string" &&
            typeof params.encryptedSymmetricKey === "string"
        ),
        "handler": async ({ email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey }, _session, remoteAddress) => {

            email = email.toLowerCase();

            const accountCreationResp = await dbSemasim.createUserAccount(
                email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey, remoteAddress
            );

            if (!accountCreationResp) {
                return "EMAIL NOT AVAILABLE";
            }

            if (accountCreationResp.activationCode !== null) {

                emailSender.emailValidationSafe(
                    email,
                    accountCreationResp.activationCode
                );

                return "CREATED";

            } else {

                return "CREATED NO ACTIVATION REQUIRED";

            }

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.validateEmail;
    type Params = apiDeclaration.validateEmail.Params;
    type Response = apiDeclaration.validateEmail.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
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

    const { methodName } = apiDeclaration.loginUser;
    type Params = apiDeclaration.loginUser.Params;
    type Response = apiDeclaration.loginUser.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            gwMisc.isValidEmail(params.email) &&
            typeof params.secret === "string" && 
            (
                params.uaInstanceId === undefined || 
                typeof params.uaInstanceId === "string"
            )
        ),
        "handler": async (params, req) => {


            const resp = await dbSemasim.authenticateUser(params.email, params.secret);

            if (resp.status === "SUCCESS") {

                const { shared, user, towardUserEncryptKeyStr } =
                    resp.webUaAuthenticatedSessionDescriptorWithoutConnectSid;

                const { encryptedSymmetricKey } = shared;

                const { connect_sid } = sessionManager.authenticateSession(
                    req,
                    {
                        user,
                        towardUserEncryptKeyStr,
                        "shared": {
                            "email": shared.email,
                            encryptedSymmetricKey,
                            "uaInstanceId": params.uaInstanceId !== undefined ?
                                params.uaInstanceId : shared.webUaInstanceId
                        }
                    }
                );

                return {
                    "status": "SUCCESS" as const,
                    connect_sid,
                    "webUaInstanceId": params.uaInstanceId === undefined ? shared.webUaInstanceId : undefined,
                    encryptedSymmetricKey
                };

            }

            return resp;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.isUserLoggedIn;
    type Params = apiDeclaration.isUserLoggedIn.Params;
    type Response = apiDeclaration.isUserLoggedIn.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": (_params, { session }) => Promise.resolve(
             sessionManager.isAuthenticated(session!)
        )
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.declareUa;
    type Params = apiDeclaration.declareUa.Params;
    type Response = apiDeclaration.declareUa.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            ( params.platform === "iOS" || params.platform === "android" ) &&
            typeof params.pushNotificationToken === "string"
        ),
        "handler": async ({ platform, pushNotificationToken }, { session }) => {

            if (!sessionManager.isAuthenticated(session!))
                throw new Error("never");

            await dbSemasim.addOrUpdateUa({
                "instance": session.shared.uaInstanceId,
                "userEmail": session.shared.email,
                platform,
                "pushToken": pushNotificationToken,
                "messagesEnabled": true
            });

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.logoutUser;
    type Params = apiDeclaration.logoutUser.Params;
    type Response = apiDeclaration.logoutUser.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": (_params, { session }) => {

            sessionManager.eraseSessionAuthentication(session!);

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.sendRenewPasswordEmail;
    type Params = apiDeclaration.sendRenewPasswordEmail.Params;
    type Response = apiDeclaration.sendRenewPasswordEmail.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            gwMisc.isValidEmail(params.email)
        ),
        "handler": async ({ email }) => {

            const token = await dbSemasim.setPasswordRenewalToken(email);

            if (token !== undefined) {

                emailSender.passwordRenewalRequestSafe(email, token);

            }

            return token !== undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.renewPassword;
    type Params = apiDeclaration.renewPassword.Params;
    type Response = apiDeclaration.renewPassword.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            gwMisc.isValidEmail(params.email) &&
            typeof params.newSecret === "string" &&
            typeof params.newTowardUserEncryptKeyStr === "string" &&
            typeof params.newEncryptedSymmetricKey === "string" &&
            typeof params.token === "string"
        ),
        "handler": async ({ email, newSecret, newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token }) => {

            const renewPasswordResult = await dbSemasim.renewPassword(
                email, newSecret, newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token
            );

            if (!renewPasswordResult.wasTokenStillValid) {
                return false;
            }

            await dbWebphone.deleteAllUserInstance(renewPasswordResult.user);

            {

                const uas = await dbSemasim.getUserUa(email);

                pushNotifications.sendSafe(
                    uas,
                    { "type": "RELOAD CONFIG" }
                );

            }


            return true;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.getCountryIso;
    type Params = apiDeclaration.getCountryIso.Params;
    type Response = apiDeclaration.getCountryIso.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": async (_params, req, remoteAddress) => ({
            "language": (() => {

                const hv = req.header("Accept-Language");

                if (hv === undefined) {
                    return undefined;
                }

                const match = hv.match(/\-([A-Z]{2})/);

                if (match === null) {
                    return undefined;
                }

                const countryIsoGuessed = match[1].toLowerCase();

                if (!currencyLib.isValidCountryIso(countryIsoGuessed)) {
                    return undefined;
                }

                return countryIsoGuessed;

            })(),
            "location": await geoiplookup(remoteAddress)
                .then(({ countryIso }) => countryIso)
                .catch(() => undefined)
        })
    };

    handlers[methodName] = handler;

}



{

    const { methodName } = apiDeclaration.getChangesRates;
    type Params = apiDeclaration.getChangesRates.Params;
    type Response = apiDeclaration.getChangesRates.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": async () => {

            await currencyLib.convertFromEuro.refreshChangeRates();

            return currencyLib.convertFromEuro.getChangeRates();

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.getSubscriptionInfos;
    type Params = apiDeclaration.getSubscriptionInfos.Params;
    type Response = apiDeclaration.getSubscriptionInfos.Response;


    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": async (_params, { session }) => {

            if (!sessionManager.isAuthenticated(session!))
                throw new Error("never");

            return stripe.getSubscriptionInfos(session);

        }
    };

    handlers[methodName] = handler;

}


{

    const { methodName } = apiDeclaration.subscribeOrUpdateSource;
    type Params = apiDeclaration.subscribeOrUpdateSource.Params;
    type Response = apiDeclaration.subscribeOrUpdateSource.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (
            params instanceof Object &&
            (
                params.sourceId === undefined ||
                typeof params.sourceId === "string"
            )
        ),
        "handler": async ({ sourceId }, { session }) => {

            if (!sessionManager.isAuthenticated(session!))
                throw new Error("never");

            await stripe.subscribeUser(session, sourceId);

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.unsubscribe;
    type Params = apiDeclaration.unsubscribe.Params;
    type Response = apiDeclaration.unsubscribe.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": async (_params, { session }) => {

            if (!sessionManager.isAuthenticated(session!))
                throw new Error("never");

            await stripe.unsubscribeUser(session);

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.createStripeCheckoutSessionForShop;
    type Params = apiDeclaration.createStripeCheckoutSessionForShop.Params;
    type Response = apiDeclaration.createStripeCheckoutSessionForShop.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => { /*TODO*/ return true; },
        "handler": async (params, { session }) => {

            const {
                cartDescription,
                shippingFormData,
                currency,
                success_url,
                cancel_url
            } = params;

            if (!sessionManager.isAuthenticated(session!))
                throw new Error("never");

            return {
                "stripePublicApiKey": deploy.getStripeApiKeys().publicApiKey,
                "checkoutSessionId": await stripe.createCheckoutSessionForShop(
                    session,
                    cartDescription,
                    shippingFormData,
                    currency,
                    success_url,
                    cancel_url
                )
            };

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.createStripeCheckoutSessionForSubscription;
    type Params = apiDeclaration.createStripeCheckoutSessionForSubscription.Params;
    type Response = apiDeclaration.createStripeCheckoutSessionForSubscription.Response;

    const handler: webApi.Handler.JSON<Params, Response> = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => { /*TODO*/ return true; },
        "handler": async ({ currency, success_url, cancel_url }, { session }) => {

            if (!sessionManager.isAuthenticated(session!))
                throw new Error("never");

            return {
                "stripePublicApiKey": deploy.getStripeApiKeys().publicApiKey,
                "checkoutSessionId": await stripe.createCheckoutSessionForSubscription(
                    session,
                    currency,
                    success_url,
                    cancel_url
                )
            };

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.version;
    type Params = apiDeclaration.version.Params;

    const handler: webApi.Handler.Generic<Params> = {
        "needAuth": false,
        "contentType": "text/plain; charset=utf-8",
        "sanityCheck": params => params instanceof Object,
        "handler": async () => Buffer.from(semasim_gateway_version, "utf8")
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.linphonerc;
    type Params = apiDeclaration.linphonerc.Params;

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

    const handler: webApi.Handler.Generic<Params> = {
        "needAuth": false,
        "contentType": "text/plain; charset=utf-8",
        "sanityCheck": params => {
            try {
                return (
                    gwMisc.isValidEmail(params.email) &&
                    typeof params.secret === "string" &&
                    !("uuid" in params) ||
                    (
                        "uuid" in params &&
                        gwMisc.sanityChecks.platform(params.platform) &&
                        typeof params.push_token === "string"
                    )
                );
            } catch {
                return false;
            }
        },
        "handler": async params => {

            const authResp = await dbSemasim.authenticateUser(
                params.email,
                params.secret
            );

            switch (authResp.status) {
                case "RETRY STILL FORBIDDEN": {

                    const error = new Error("Account temporally locked");

                    webApi.errorHttpCode.set(error, webApi.httpCodes.LOCKED);

                    throw error;

                }
                case "NOT VALIDATED YET":
                case "NO SUCH ACCOUNT":
                case "WRONG PASSWORD": {

                    const error = new Error("User not authenticated");

                    webApi.errorHttpCode.set(error, webApi.httpCodes.UNAUTHORIZED);

                    throw error;

                }
                case "SUCCESS": break;
            }

            const { webUaAuthenticatedSessionDescriptorWithoutConnectSid: userAuth } = authResp;


            if ("uuid" in params) {

                await dbSemasim.addOrUpdateUa({
                    "instance": `"<urn:uuid:${params.uuid}>"`,
                    "userEmail": userAuth.shared.email,
                    "platform": params.platform,
                    "pushToken": params.push_token,
                    "messagesEnabled": true
                });

            }

            if (!await stripe.isUserSubscribed(userAuth)) {

                const error = new Error("User does not have mobile subscription");

                webApi.errorHttpCode.set(error, webApi.httpCodes.PAYMENT_REQUIRED);

                throw error;

            }

            const config: object = {};
            let endpointCount = 0;
            let contactCount = 0;

            for (
                const { sim, friendlyName, password, towardSimEncryptKeyStr, ownership, phonebook, reachableSimState }
                of await dbSemasim.getUserSims(userAuth)
            ) {

                if (ownership.status === "SHARED NOT CONFIRMED") {
                    continue;
                }

                config[`nat_policy_${endpointCount}`] = {
                    "ref": `nat_policy_${endpointCount}`,
                    "stun_server": deploy.isTurnEnabled() ?
                        `${deploy.getBaseDomain()}` :
                        "external_stun.semasim.com",
                    "protocols": "stun,ice"
                };

                //TODO: It's dirty to have this here, do we even need XML anymore?
                const safeFriendlyName = substitute4BytesChar(friendlyName.replace(/"/g, `\\"`));

                /** 
                 * UserInfos does not need to be transmitted to the GW when
                 * registering the SIP contact ( but it's ok if they are )
                 * Those infos are used by the UA.
                 * */
                config[`proxy_${endpointCount}`] = {
                    "reg_proxy": `<sip:${deploy.getBaseDomain()};transport=TLS>`,
                    "reg_route": `sip:${deploy.getBaseDomain()};transport=TLS;lr`,
                    "reg_expires": `${21601}`,
                    "reg_identity": `"${safeFriendlyName}" <sip:${sim.imsi}@${deploy.getBaseDomain()};transport=TLS>`,
                    "contact_parameters": [
                        gwMisc.RegistrationParams.build({
                            "userEmail": userAuth.shared.email,
                            "towardUserEncryptKeyStr": userAuth.towardUserEncryptKeyStr,
                            "messagesEnabled": true
                        }),
                        mobile.UserSimInfos.buildContactParam({
                            "iso": sim.country ? sim.country.iso : undefined,
                            "number": sim.storage.number || undefined,
                            towardSimEncryptKeyStr
                        })
                    ].join(";"),
                    "reg_sendregister": !!reachableSimState ? "1" : "0",
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


