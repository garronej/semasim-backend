"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const frontend_1 = require("../../frontend");
const dbSemasim = require("../dbSemasim");
const webApi_1 = require("../../tools/webApi");
const sessionManager = require("./sessionManager");
const localApiHandlers_1 = require("../toUa/localApiHandlers");
const emailSender = require("../emailSender");
const pushNotifications = require("../pushNotifications");
const deploy_1 = require("../../deploy");
const gateway_1 = require("../../gateway");
exports.handlers = {};
//TODO: regexp for password once and for all!!!
//TODO: regexp for friendly name!!!
//TODO: set some reasonable max length for text messages... maybe set max packet length
{
    const methodName = frontend_1.webApiDeclaration.registerUser.methodName;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.misc.isValidEmail(params.email) &&
            typeof params.password === "string"),
        "handler": ({ email, password }, _session, remoteAddress) => __awaiter(this, void 0, void 0, function* () {
            email = email.toLowerCase();
            const accountCreationResp = yield dbSemasim.createUserAccount(email, password, remoteAddress);
            if (!accountCreationResp) {
                return "EMAIL NOT AVAILABLE";
            }
            yield dbSemasim.addOrUpdateUa({
                "instance": localApiHandlers_1.getUserWebUaInstanceId(accountCreationResp.user),
                "userEmail": email,
                "platform": "web",
                "pushToken": "",
                "software": "JsSIP"
            });
            if (accountCreationResp.activationCode !== null) {
                emailSender.emailValidation(email, accountCreationResp.activationCode);
                return "CREATED";
            }
            else {
                return "CREATED NO ACTIVATION REQUIRED";
            }
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = frontend_1.webApiDeclaration.validateEmail.methodName;
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
    const methodName = frontend_1.webApiDeclaration.loginUser.methodName;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.misc.isValidEmail(params.email) &&
            typeof params.password === "string"),
        "handler": ({ email, password }, session) => __awaiter(this, void 0, void 0, function* () {
            const resp = yield dbSemasim.authenticateUser(email, password);
            if (resp.status === "SUCCESS") {
                sessionManager.setAuth(session, {
                    "user": resp.user,
                    "email": email.toLowerCase()
                });
            }
            return resp;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = frontend_1.webApiDeclaration.logoutUser.methodName;
    const handler = {
        "needAuth": true,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => params === undefined,
        "handler": (_params, session) => {
            sessionManager.setAuth(session, undefined);
            return undefined;
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = frontend_1.webApiDeclaration.sendRenewPasswordEmail.methodName;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.misc.isValidEmail(params.email)),
        "handler": ({ email }) => __awaiter(this, void 0, void 0, function* () {
            const token = yield dbSemasim.setPasswordRenewalToken(email);
            if (token !== undefined) {
                yield emailSender.passwordRenewalRequest(email, token);
            }
            return token !== undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = frontend_1.webApiDeclaration.renewPassword.methodName;
    const handler = {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.misc.isValidEmail(params.email) &&
            typeof params.newPassword === "string" &&
            typeof params.token === "string"),
        "handler": ({ email, newPassword, token }) => __awaiter(this, void 0, void 0, function* () {
            const wasTokenStillValid = yield dbSemasim.renewPassword(email, token, newPassword);
            if (wasTokenStillValid) {
                dbSemasim.getUserUa(email)
                    .then(uas => pushNotifications.send(uas, { "type": "RELOAD CONFIG" }));
            }
            return wasTokenStillValid;
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = "version";
    const handler = {
        "needAuth": false,
        "contentType": "text/plain; charset=utf-8",
        "sanityCheck": (params) => params instanceof Object,
        "handler": () => __awaiter(this, void 0, void 0, function* () { return Buffer.from(gateway_1.version, "utf8"); })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = "linphonerc";
    const hexToUtf8 = (hexStr) => Buffer.from(hexStr, "hex").toString("utf8");
    const substitute4BytesChar = (str) => Array.from(str)
        .map(c => Buffer.from(c, "utf8").length <= 3 ? c : "?")
        .join("");
    const toIni = (config) => Object.keys(config).map(keySection => [
        `[${keySection}]`,
        ...(Object.keys(config[keySection])
            .map(keyEntry => `${keyEntry}=${config[keySection][keyEntry]}`))
    ].join("\n")).join("\n\n");
    //text/plain
    const handler = {
        "needAuth": false,
        "contentType": "text/plain; charset=utf-8",
        "sanityCheck": params => {
            try {
                return (gateway_1.misc.isValidEmail(hexToUtf8(params.email_as_hex)) &&
                    !!hexToUtf8(params.password_as_hex) &&
                    !("uuid" in params) ||
                    ("uuid" in params &&
                        gateway_1.misc.sanityChecks.platform(params.platform) &&
                        !!hexToUtf8(params.password_as_hex)));
            }
            catch (_a) {
                return false;
            }
        },
        "handler": (params) => __awaiter(this, void 0, void 0, function* () {
            const email = hexToUtf8(params.email_as_hex).toLowerCase();
            const password = hexToUtf8(params.password_as_hex);
            const authResp = yield dbSemasim.authenticateUser(email, password);
            switch (authResp.status) {
                case "RETRY STILL FORBIDDEN": {
                    const error = new Error("Account temporally locked");
                    webApi_1.internalErrorCustomHttpCode.set(error, webApi_1.httpCodes.LOCKED);
                    throw error;
                }
                case "NOT VALIDATED YET":
                case "NO SUCH ACCOUNT":
                case "WRONG PASSWORD": {
                    const error = new Error("User not authenticated");
                    webApi_1.internalErrorCustomHttpCode.set(error, webApi_1.httpCodes.UNAUTHORIZED);
                    throw error;
                }
                case "SUCCESS": break;
            }
            if ("uuid" in params) {
                yield dbSemasim.addOrUpdateUa({
                    "instance": `"<urn:uuid:${params.uuid}>"`,
                    "userEmail": email,
                    "platform": params.platform,
                    "pushToken": hexToUtf8(params.push_token_as_hex),
                    //TODO: Remove this field from project.
                    "software": ""
                });
            }
            const p_email = `enc_email=${gateway_1.misc.urlSafeB64.enc(email)}`;
            const config = {};
            let endpointCount = 0;
            let contactCount = 0;
            for (const { sim, friendlyName, password, ownership, phonebook, isOnline } of yield dbSemasim.getUserSims({ "user": authResp.user, email })) {
                if (ownership.status === "SHARED NOT CONFIRMED") {
                    continue;
                }
                config[`nat_policy_${endpointCount}`] = {
                    "ref": `nat_policy_${endpointCount}`,
                    "stun_server": `${deploy_1.deploy.getBaseDomain()}`,
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
                    "reg_proxy": `<sip:${deploy_1.deploy.getBaseDomain()};transport=TLS>`,
                    "reg_route": `sip:${deploy_1.deploy.getBaseDomain()};transport=TLS;lr`,
                    "reg_expires": `${21601}`,
                    "reg_identity": `"${safeFriendlyName}" <sip:${sim.imsi}@semasim.com;transport=TLS>`,
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
                        "url": `"${safeContactName} (proxy_${endpointCount})" <sip:${contact.number_raw}@semasim.com>`,
                        "pol": "accept",
                        "subscribe": "0"
                    };
                    contactCount++;
                }
                endpointCount++;
            }
            return Buffer.from(toIni(config), "utf8");
        })
    };
    exports.handlers[methodName] = handler;
}
