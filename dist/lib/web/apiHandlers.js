"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const frontend_1 = require("../../frontend");
const dbSemasim = require("../dbSemasim");
const dbWebphoneData_1 = require("../dbWebphoneData");
const sessionManager = require("./sessionManager");
const emailSender = require("../emailSender");
const pushNotifications = require("../pushNotifications");
const deploy_1 = require("../../deploy");
const stripe = require("../stripe");
const geoiplookup_1 = require("../../tools/geoiplookup");
const apiDeclaration = require("../../web_api_declaration");
const gateway_1 = require("../../gateway");
exports.handlers = {};
//TODO: regexp for password once and for all!!!
//TODO: regexp for friendly name!!!
//TODO: set some reasonable max length for text messages... maybe set max packet length
{
    const { methodName } = apiDeclaration.registerUser;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.isValidEmail(params.email) &&
            typeof params.secret === "string" &&
            typeof params.towardUserEncryptKeyStr === "string" &&
            typeof params.encryptedSymmetricKey === "string"),
        "handler": async ({ email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey }, _session, remoteAddress) => {
            email = email.toLowerCase();
            const accountCreationResp = await dbSemasim.createUserAccount(email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey, remoteAddress);
            if (!accountCreationResp) {
                return "EMAIL NOT AVAILABLE";
            }
            if (accountCreationResp.activationCode !== null) {
                emailSender.emailValidationSafe(email, accountCreationResp.activationCode);
                return "CREATED";
            }
            else {
                return "CREATED NO ACTIVATION REQUIRED";
            }
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.validateEmail;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.isValidEmail(params.email) &&
            typeof params.activationCode === "string" &&
            params.activationCode.length === 4),
        "handler": ({ email, activationCode }) => dbSemasim.validateUserEmail(email, activationCode)
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.loginUser;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.isValidEmail(params.email) &&
            typeof params.secret === "string" &&
            (params.uaInstanceId === undefined ||
                typeof params.uaInstanceId === "string")),
        "handler": async (params, req) => {
            const resp = await dbSemasim.authenticateUser(params.email, params.secret);
            if (resp.status === "SUCCESS") {
                const { shared, user, towardUserEncryptKeyStr } = resp.webUaAuthenticatedSessionDescriptorWithoutConnectSid;
                const { encryptedSymmetricKey } = shared;
                const { connect_sid } = sessionManager.authenticateSession(req, {
                    user,
                    towardUserEncryptKeyStr,
                    "shared": {
                        "email": shared.email,
                        encryptedSymmetricKey,
                        "uaInstanceId": params.uaInstanceId !== undefined ?
                            params.uaInstanceId : shared.webUaInstanceId
                    }
                });
                return {
                    "status": "SUCCESS",
                    connect_sid,
                    "webUaInstanceId": params.uaInstanceId === undefined ? shared.webUaInstanceId : undefined,
                    encryptedSymmetricKey
                };
            }
            return resp;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.isUserLoggedIn;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": (_params, { session }) => Promise.resolve(sessionManager.isAuthenticated(session))
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.declareUa;
    const handler = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            (params.platform === "ios" || params.platform === "android") &&
            typeof params.pushNotificationToken === "string"),
        "handler": async ({ platform, pushNotificationToken }, { session }) => {
            if (!sessionManager.isAuthenticated(session))
                throw new Error("never");
            await dbSemasim.addOrUpdateUa({
                "instance": session.shared.uaInstanceId,
                "userEmail": session.shared.email,
                platform,
                "pushToken": pushNotificationToken
            });
            return undefined;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.logoutUser;
    const handler = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": (_params, { session }) => {
            sessionManager.eraseSessionAuthentication(session);
            return undefined;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.sendRenewPasswordEmail;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.isValidEmail(params.email)),
        "handler": async ({ email }) => {
            const token = await dbSemasim.setPasswordRenewalToken(email);
            if (token !== undefined) {
                emailSender.passwordRenewalRequestSafe(email, token);
            }
            return token !== undefined;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.renewPassword;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.isValidEmail(params.email) &&
            typeof params.newSecret === "string" &&
            typeof params.newTowardUserEncryptKeyStr === "string" &&
            typeof params.newEncryptedSymmetricKey === "string" &&
            typeof params.token === "string"),
        "handler": async ({ email, newSecret, newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token }) => {
            const renewPasswordResult = await dbSemasim.renewPassword(email, newSecret, newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token);
            if (!renewPasswordResult.wasTokenStillValid) {
                return false;
            }
            await dbWebphoneData_1.dbWebphoneData.deleteAllUserData(renewPasswordResult.user);
            {
                const uas = await dbSemasim.getUserUas(email);
                pushNotifications.sendSafe(uas, { "type": "RELOAD CONFIG" });
            }
            return true;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.getCountryIso;
    const handler = {
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
                if (!frontend_1.currencyLib.isValidCountryIso(countryIsoGuessed)) {
                    return undefined;
                }
                return countryIsoGuessed;
            })(),
            "location": await geoiplookup_1.geoiplookup(remoteAddress)
                .then(({ countryIso }) => countryIso)
                .catch(() => undefined)
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.getChangesRates;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": async () => {
            await frontend_1.currencyLib.convertFromEuro.refreshChangeRates();
            return frontend_1.currencyLib.convertFromEuro.getChangeRates();
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.getSubscriptionInfos;
    const handler = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": async (_params, { session }) => {
            if (!sessionManager.isAuthenticated(session))
                throw new Error("never");
            return stripe.getSubscriptionInfos(session);
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.subscribeOrUpdateSource;
    const handler = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            (params.sourceId === undefined ||
                typeof params.sourceId === "string")),
        "handler": async ({ sourceId }, { session }) => {
            if (!sessionManager.isAuthenticated(session))
                throw new Error("never");
            await stripe.subscribeUser(session, sourceId);
            return undefined;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.unsubscribe;
    const handler = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": async (_params, { session }) => {
            if (!sessionManager.isAuthenticated(session))
                throw new Error("never");
            await stripe.unsubscribeUser(session);
            return undefined;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.createStripeCheckoutSessionForShop;
    const handler = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => { /*TODO*/ return true; },
        "handler": async (params, { session }) => {
            const { cartDescription, shippingFormData, currency, success_url, cancel_url } = params;
            if (!sessionManager.isAuthenticated(session))
                throw new Error("never");
            return {
                "stripePublicApiKey": deploy_1.deploy.getStripeApiKeys().publicApiKey,
                "checkoutSessionId": await stripe.createCheckoutSessionForShop(session, cartDescription, shippingFormData, currency, success_url, cancel_url)
            };
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.createStripeCheckoutSessionForSubscription;
    const handler = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => { /*TODO*/ return true; },
        "handler": async ({ currency, success_url, cancel_url }, { session }) => {
            if (!sessionManager.isAuthenticated(session))
                throw new Error("never");
            return {
                "stripePublicApiKey": deploy_1.deploy.getStripeApiKeys().publicApiKey,
                "checkoutSessionId": await stripe.createCheckoutSessionForSubscription(session, currency, success_url, cancel_url)
            };
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const { methodName } = apiDeclaration.version;
    const handler = {
        "needAuth": false,
        "contentType": "text/plain; charset=utf-8",
        "sanityCheck": params => params instanceof Object,
        "handler": async () => Buffer.from(gateway_1.version, "utf8")
    };
    exports.handlers[methodName] = handler;
}
