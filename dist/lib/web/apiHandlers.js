"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const frontend_1 = require("../../frontend");
const dbSemasim = require("../dbSemasim");
const dbWebphone = require("../dbWebphone");
const load_balancer_1 = require("../../load-balancer");
const sessionManager = require("./sessionManager");
const emailSender = require("../emailSender");
const pushNotifications = require("../pushNotifications");
const deploy_1 = require("../../deploy");
const stripe = require("../stripe");
const geoiplookup_1 = require("../../tools/geoiplookup");
const mobile = require("../../mobile");
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
            gateway_1.misc.isValidEmail(params.email) &&
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
                emailSender.emailValidation(email, accountCreationResp.activationCode);
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
            gateway_1.misc.isValidEmail(params.email) &&
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
            gateway_1.misc.isValidEmail(params.email) &&
            typeof params.secret === "string"),
        "handler": async ({ email, secret }, req) => {
            req.res;
            const resp = await dbSemasim.authenticateUser(email, secret);
            if (resp.status === "SUCCESS") {
                sessionManager.authenticateSession(req, resp.authenticatedSessionDescriptor);
                return { "status": "SUCCESS" };
            }
            return resp;
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
            gateway_1.misc.isValidEmail(params.email)),
        "handler": async ({ email }) => {
            const token = await dbSemasim.setPasswordRenewalToken(email);
            if (token !== undefined) {
                await emailSender.passwordRenewalRequest(email, token);
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
            gateway_1.misc.isValidEmail(params.email) &&
            typeof params.newSecret === "string" &&
            typeof params.newTowardUserEncryptKeyStr === "string" &&
            typeof params.newEncryptedSymmetricKey === "string" &&
            typeof params.token === "string"),
        "handler": async ({ email, newSecret, newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token }) => {
            const renewPasswordResult = await dbSemasim.renewPassword(email, newSecret, newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token);
            if (!renewPasswordResult.wasTokenStillValid) {
                return false;
            }
            await dbWebphone.deleteAllUserInstance(renewPasswordResult.user);
            dbSemasim.getUserUa(email)
                .then(uas => pushNotifications.send(uas, { "type": "RELOAD CONFIG" }));
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
{
    const { methodName } = apiDeclaration.linphonerc;
    const substitute4BytesChar = (str) => Array.from(str)
        .map(c => Buffer.from(c, "utf8").length <= 3 ? c : "?")
        .join("");
    const toIni = (config) => Object.keys(config).map(keySection => [
        `[${keySection}]`,
        ...(Object.keys(config[keySection])
            .map(keyEntry => `${keyEntry}=${config[keySection][keyEntry]}`))
    ].join("\n")).join("\n\n");
    const handler = {
        "needAuth": false,
        "contentType": "text/plain; charset=utf-8",
        "sanityCheck": params => {
            try {
                return (gateway_1.misc.isValidEmail(params.email) &&
                    typeof params.secret === "string" &&
                    !("uuid" in params) ||
                    ("uuid" in params &&
                        gateway_1.misc.sanityChecks.platform(params.platform) &&
                        typeof params.push_token === "string"));
            }
            catch (_a) {
                return false;
            }
        },
        "handler": async (params) => {
            const authResp = await dbSemasim.authenticateUser(params.email, params.secret);
            switch (authResp.status) {
                case "RETRY STILL FORBIDDEN": {
                    const error = new Error("Account temporally locked");
                    load_balancer_1.webApi.errorHttpCode.set(error, load_balancer_1.webApi.httpCodes.LOCKED);
                    throw error;
                }
                case "NOT VALIDATED YET":
                case "NO SUCH ACCOUNT":
                case "WRONG PASSWORD": {
                    const error = new Error("User not authenticated");
                    load_balancer_1.webApi.errorHttpCode.set(error, load_balancer_1.webApi.httpCodes.UNAUTHORIZED);
                    throw error;
                }
                case "SUCCESS": break;
            }
            const { authenticatedSessionDescriptor } = authResp;
            if ("uuid" in params) {
                await dbSemasim.addOrUpdateUa({
                    "instance": `"<urn:uuid:${params.uuid}>"`,
                    "userEmail": authenticatedSessionDescriptor.shared.email,
                    "platform": params.platform,
                    "pushToken": params.push_token,
                    "messagesEnabled": true
                });
            }
            if (!await stripe.isUserSubscribed(authenticatedSessionDescriptor)) {
                const error = new Error("User does not have mobile subscription");
                load_balancer_1.webApi.errorHttpCode.set(error, load_balancer_1.webApi.httpCodes.PAYMENT_REQUIRED);
                throw error;
            }
            const config = {};
            let endpointCount = 0;
            let contactCount = 0;
            for (const { sim, friendlyName, password, towardSimEncryptKeyStr, ownership, phonebook, isOnline } of await dbSemasim.getUserSims(authenticatedSessionDescriptor)) {
                if (ownership.status === "SHARED NOT CONFIRMED") {
                    continue;
                }
                config[`nat_policy_${endpointCount}`] = {
                    "ref": `nat_policy_${endpointCount}`,
                    "stun_server": deploy_1.deploy.isTurnEnabled() ?
                        `${deploy_1.deploy.getBaseDomain()}` :
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
                    "reg_proxy": `<sip:${deploy_1.deploy.getBaseDomain()};transport=TLS>`,
                    "reg_route": `sip:${deploy_1.deploy.getBaseDomain()};transport=TLS;lr`,
                    "reg_expires": `${21601}`,
                    "reg_identity": `"${safeFriendlyName}" <sip:${sim.imsi}@${deploy_1.deploy.getBaseDomain()};transport=TLS>`,
                    "contact_parameters": [
                        gateway_1.misc.RegistrationParams.build({
                            "userEmail": authenticatedSessionDescriptor.shared.email,
                            "towardUserEncryptKeyStr": authenticatedSessionDescriptor.towardUserEncryptKeyStr,
                            "messagesEnabled": true
                        }),
                        mobile.UserSimInfos.buildContactParam({
                            "iso": sim.country ? sim.country.iso : undefined,
                            "number": sim.storage.number || undefined,
                            towardSimEncryptKeyStr
                        })
                    ].join(";"),
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
                        "url": `"${safeContactName} (proxy_${endpointCount})" <sip:${contact.number_raw}@${deploy_1.deploy.getBaseDomain()}>`,
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
    exports.handlers[methodName] = handler;
}
