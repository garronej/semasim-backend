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
const AWS = require("aws-sdk");
const i = require("../bin/installer");
const deploy_1 = require("../deploy");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");
const phone_number_1 = require("phone-number");
const logger = require("logger");
const watch = require("node-watch");
const debug = logger.debugFactory();
exports.sharingRequest = (() => {
    const templateName = "sharing-request";
    return function (user, userSim, message, targetUsers) {
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
        Formatted number or undefined:
        Example: +33 6 36 78 63 85
        */
        const prettyNumber = !!userSim.sim.storage.number ?
            phone_number_1.phoneNumber.prettyPrint(phone_number_1.phoneNumber.build(userSim.sim.storage.number, userSim.sim.country ? userSim.sim.country.iso : undefined))
            : undefined;
        const gatewayLocation = [
            userSim.gatewayLocation.city || userSim.gatewayLocation.subdivisions || "",
            userSim.gatewayLocation.countryIso || ""
        ].join(" ");
        //example: nikola.tesla@gmail.com => Nikola Tesla
        const ownerName = user.email
            .split("@")[0]
            .split(/[\s-_\.]/)
            .filter(s => !!s)
            .map(s => `${s.charAt(0).toUpperCase()}${s.slice(1)}`)
            .join(" ");
        return Promise.all(targetUsers.map(({ email, isRegistered }) => send(user.email, email, `SIM card sharing request for ${simFriendlyName}`, ejsRenderTemplate(templateName, {
            "baseDomain": deploy_1.deploy.getBaseDomain(),
            simFriendlyName,
            prettyNumber,
            gatewayLocation,
            ownerName,
            "targetUserEmail": email,
            "isTargetUserRegistered": isRegistered,
            message
        })))).then(() => { });
    };
})();
exports.passwordRenewalRequest = (() => {
    const templateName = "password-renewal";
    return function (email, token) {
        return send("semasim@semasim.com", email, "Semasim password renewal request", ejsRenderTemplate(templateName, {
            "baseDomain": deploy_1.deploy.getBaseDomain(),
            email,
            token
        }));
    };
})();
exports.emailValidation = (() => {
    const templateName = "email-validation";
    return function (email, activationCode) {
        return send("semasim@semasim.com", email, `${activationCode} is the Semasim activation code`, ejsRenderTemplate(templateName, {
            "baseDomain": deploy_1.deploy.getBaseDomain(),
            email,
            "code": activationCode
        }));
    };
})();
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
function send(senderEmail, destEmail, subject, body) {
    return __awaiter(this, void 0, void 0, function* () {
        if (send.ses === undefined) {
            AWS.config.update({ "region": "eu-west-1" });
            AWS.config.credentials = new AWS.SharedIniFileCredentials({
                "profile": "ses",
                "filename": deploy_1.deploy.sesCredentialsFilePath
            });
            send.ses = new AWS.SES({ "apiVersion": "2012-10-17" });
        }
        const [senderName, senderDomain] = senderEmail.split("@");
        const params = {
            "Source": `${senderName}@semasim.com`,
            "ReplyToAddresses": [senderDomain !== "semasim.com" ? "joseph.garrone.gj@gmail.com" : senderEmail],
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
        yield send.ses.sendEmail(params).promise();
    });
}
(function (send) {
    send.ses = undefined;
})(send || (send = {}));
