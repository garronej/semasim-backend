
import * as AWS from "aws-sdk";
import * as i from "../bin/installer";
import { deploy } from "../deploy";
import * as path from "path";
import * as ejs from "ejs";
import * as fs from "fs";
import * as types from "../frontend/types";
import { availablePages } from "../frontend/pages";
import { urlGetParameters } from "../frontend/tools";
import { phoneNumber } from "phone-number";
import * as logger from "logger";
import * as watch from "node-watch";
import { buildNoThrowProxyFunction } from "../tools/noThrow";

const debug = logger.debugFactory();


export const sharingRequest = (() => {

    const templateName = "sharing-request";

    type Data = {
        simFriendlyName: string;
        prettyNumber?: string;
        gatewayLocation: string;
        ownerName: string;
        isTargetUserRegistered: boolean;
        message: string;
        url: string;
    };

    return function (
        simOwnerEmail: string,
        userSim: types.UserSim.Owned,
        message: string,
        targetUsers: { email: string; isRegistered: boolean; }[]
    ): Promise<void> {

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
        return Promise.all(
            targetUsers.map(({ email, isRegistered }) => send(
                email,
                `SIM card sharing request for ${simFriendlyName}`,
                ejsRenderTemplate<Data>(
                    templateName,
                    {
                        simFriendlyName,
                        "prettyNumber": !!userSim.sim.storage.number ?
                            phoneNumber.prettyPrint(
                                phoneNumber.build(
                                    userSim.sim.storage.number,
                                    userSim.sim.country ? userSim.sim.country.iso : undefined
                                )
                            )
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
                        "url": urlGetParameters.buildUrl<availablePages.urlParams.Login | availablePages.urlParams.Register>(
                            [
                                `https://web.${deploy.getBaseDomain()}`,
                                isRegistered ?
                                    availablePages.PageName.login :
                                    availablePages.PageName.register

                            ].join("/"),
                            { email }
                        )

                    }
                ),
                simOwnerEmail
            ))
        ).then(() => { });

    };


})();

export const sharingRequestSafe= buildNoThrowProxyFunction(sharingRequest);

export const passwordRenewalRequest = (() => {

    const templateName = "password-renewal";

    type Data = {
        url: string;
    };

    return function (
        email: string,
        token: string
    ): Promise<void> {
        return send(
            email,
            "Semasim password renewal request",
            ejsRenderTemplate<Data>(
                templateName,
                {
                    "url": urlGetParameters.buildUrl<availablePages.urlParams.Login>(
                        `https://web.${deploy.getBaseDomain()}/${availablePages.PageName.login}`,
                        {
                            email,
                            "renew_password_token": token
                        }
                    )
                }
            )
        );

    };

})();

export const passwordRenewalRequestSafe =  buildNoThrowProxyFunction(passwordRenewalRequest);

export const emailValidation = (() => {

    const templateName = "email-validation";

    type Data = {
        code: string;
        url: string;
    };

    return function (
        email: string,
        activationCode: string
    ): Promise<void> {

        return send(
            email,
            `${activationCode} is the Semasim activation code`,
            ejsRenderTemplate<Data>(
                templateName,
                {
                    "code": activationCode,
                    "url": urlGetParameters.buildUrl<availablePages.urlParams.Login>(
                        `https://web.${deploy.getBaseDomain()}/${availablePages.PageName.login}`,
                        {
                            email,
                            "email_confirmation_code": activationCode
                        }
                    )
                }
            )
        );

    };

})();

export const emailValidationSafe = buildNoThrowProxyFunction(emailValidation);

function ejsRenderTemplate<T>(templateName: string, data: T): string {

    return ejs.render(
        ejsRenderTemplate.getTemplate(templateName),
        data
    );

}

namespace ejsRenderTemplate {

    export const templateCache: { [templateName: string]: string; } = {};

    /** Get template, cache them, reload them if changed on disk */
    export function getTemplate(templateName: string): string {

        if (templateName in templateCache) {
            return templateCache[templateName];
        }

        const templatePath = path.join(i.module_dir_path, "res", "mail-templates", `${templateName}.ejs`);

        const read = () => templateCache[templateName] = fs.readFileSync(templatePath).toString("utf8");

        watch(templatePath, { "persistent": false }, () => {

            debug(`${templateName} updated`);

            read();

        });

        read();

        return getTemplate(templateName);

    };

}

async function send(
    destEmail: string,
    subject: string,
    body: string,
    senderEmail?: string
): Promise<void> {

    if (send.ses === undefined) {

        AWS.config.update({ "region": "eu-west-1" });

        AWS.config.credentials = new AWS.SharedIniFileCredentials({
            "profile": "ses",
            "filename": deploy.sesCredentialsFilePath
        });

        send.ses = new AWS.SES({ "apiVersion": "2012-10-17" });

    }

    const params: AWS.SES.Types.SendEmailRequest = {
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

    if( !!senderEmail ){

        params["ReplyToAddresses"]= [senderEmail];

    }

    await send.ses.sendEmail(params).promise();

}

namespace send {
    export let ses: AWS.SES | undefined = undefined;
}
