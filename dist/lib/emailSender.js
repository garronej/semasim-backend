"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailValidationSafe = exports.emailValidation = exports.passwordRenewalRequestSafe = exports.passwordRenewalRequest = exports.sharingRequestSafe = exports.sharingRequest = void 0;
const AWS = require("aws-sdk");
const i = require("../bin/installer");
const deploy_1 = require("../deploy");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");
const pages_1 = require("../frontend/pages");
const tools_1 = require("../frontend/tools");
const phone_number_1 = require("phone-number");
const logger_1 = require("../tools/logger");
const watch = require("node-watch");
const noThrow_1 = require("../tools/noThrow");
const debug = logger_1.logger.debugFactory();
exports.sharingRequest = (() => {
    const templateName = "sharing-request";
    return function (simOwnerEmail, userSim, message, targetUsers) {
        /*
        Prepend "SIM" if not present in the friendly name already.
        Example:
        "Word 2" -> "SIM Work 2"
        "SIM Work 2" stays unchanged.
        */
        const simFriendlyName = [
            !userSim.friendlyName.toLowerCase().match(/SIM\s/) ? "SIM " : "",
            userSim.friendlyName
        ].join("");
        /*
        prettyNumber:
        Formatted number or undefined:
        Example: +33 6 36 78 63 85

        simOwnerName example: nikola.tesla@gmail.com => Nikola Tesla
        */
        return Promise.all(targetUsers.map(({ email, isRegistered }) => send(email, `SIM card sharing request for ${simFriendlyName}`, ejsRenderTemplate(templateName, {
            simFriendlyName,
            "prettyNumber": !!userSim.sim.storage.number ?
                phone_number_1.phoneNumber.prettyPrint(phone_number_1.phoneNumber.build(userSim.sim.storage.number, userSim.sim.country ? userSim.sim.country.iso : undefined))
                : undefined,
            "gatewayLocation": [
                userSim.gatewayLocation.city || userSim.gatewayLocation.subdivisions || "",
                userSim.gatewayLocation.countryIso || ""
            ].join(" "),
            "ownerName": simOwnerEmail
                .split("@")[0]
                .split(/[\s-_\.]/)
                .filter(s => !!s)
                .map(s => `${s.charAt(0).toUpperCase()}${s.slice(1)}`)
                .join(" "),
            "isTargetUserRegistered": isRegistered,
            message,
            "url": tools_1.urlGetParameters.buildUrl([
                `https://web.${deploy_1.deploy.getBaseDomain()}`,
                isRegistered ?
                    pages_1.availablePages.PageName.login :
                    pages_1.availablePages.PageName.register
            ].join("/"), { email })
        }), simOwnerEmail))).then(() => { });
    };
})();
exports.sharingRequestSafe = noThrow_1.buildNoThrowProxyFunction(exports.sharingRequest);
exports.passwordRenewalRequest = (() => {
    const templateName = "password-renewal";
    return function (email, token) {
        return send(email, "Semasim password renewal request", ejsRenderTemplate(templateName, {
            "url": tools_1.urlGetParameters.buildUrl(`https://web.${deploy_1.deploy.getBaseDomain()}/${pages_1.availablePages.PageName.login}`, {
                email,
                "renew_password_token": token
            })
        }));
    };
})();
exports.passwordRenewalRequestSafe = noThrow_1.buildNoThrowProxyFunction(exports.passwordRenewalRequest);
exports.emailValidation = (() => {
    const templateName = "email-validation";
    return function (email, activationCode) {
        return send(email, `${activationCode} is the Semasim activation code`, ejsRenderTemplate(templateName, {
            "code": activationCode,
            "url": tools_1.urlGetParameters.buildUrl(`https://web.${deploy_1.deploy.getBaseDomain()}/${pages_1.availablePages.PageName.login}`, {
                email,
                "email_confirmation_code": activationCode
            })
        }));
    };
})();
exports.emailValidationSafe = noThrow_1.buildNoThrowProxyFunction(exports.emailValidation);
function ejsRenderTemplate(templateName, data) {
    return ejs.render(ejsRenderTemplate.getTemplate(templateName), data);
}
(function (ejsRenderTemplate) {
    ejsRenderTemplate.templateCache = {};
    /** Get template, cache them, reload them if changed on disk */
    function getTemplate(templateName) {
        if (templateName in ejsRenderTemplate.templateCache) {
            return ejsRenderTemplate.templateCache[templateName];
        }
        const templatePath = path.join(i.module_dir_path, "res", "mail-templates", `${templateName}.ejs`);
        const read = () => ejsRenderTemplate.templateCache[templateName] = fs.readFileSync(templatePath).toString("utf8");
        watch(templatePath, { "persistent": false }, () => {
            debug(`${templateName} updated`);
            read();
        });
        read();
        return getTemplate(templateName);
    }
    ejsRenderTemplate.getTemplate = getTemplate;
    ;
})(ejsRenderTemplate || (ejsRenderTemplate = {}));
async function send(destEmail, subject, body, senderEmail) {
    if (send.ses === undefined) {
        AWS.config.update({ "region": "eu-west-1" });
        AWS.config.credentials = new AWS.SharedIniFileCredentials({
            "profile": "ses",
            "filename": deploy_1.deploy.sesCredentialsFilePath
        });
        send.ses = new AWS.SES({ "apiVersion": "2012-10-17" });
    }
    const params = {
        /*
        Fall in the "Promotion" section
        "Source": `"${!!senderEmail ? senderEmail.split("@")[0] : "Semasim"}" <${contactEmail}>`,
        const contactEmail= "contact@semasim.com";
        */
        "Source": `${!!senderEmail ? senderEmail.split("@")[0] : "semasim-team"}@semasim.com`,
        "Destination": { "ToAddresses": [destEmail] },
        "Message": {
            "Subject": {
                "Charset": "UTF-8",
                "Data": subject
            },
            "Body": {
                "Html": {
                    "Charset": "UTF-8",
                    "Data": body
                }
            }
        }
    };
    if (!!senderEmail) {
        params["ReplyToAddresses"] = [senderEmail];
    }
    await send.ses.sendEmail(params).promise();
}
(function (send) {
    send.ses = undefined;
})(send || (send = {}));
