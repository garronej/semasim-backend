
import * as AWS from "aws-sdk";
import * as i from "../bin/installer";
import * as path from "path";
import * as ejs from "ejs";
import * as fs from "fs";
import { types as feTypes } from "../semasim-frontend";
import * as sessionManager from "./web/sessionManager";
import { phoneNumber } from "phone-number";

export const sharingRequest = (() => {

    const templateName = "sharing-request";

    type Data= {
        simFriendlyName: string;
        prettyNumber?: string;
        gatewayLocation: string;
        ownerName: string;
        targetUserEmail: string;
        isTargetUserRegistered: boolean;
        message: string;
    };

    return function (
        user: sessionManager.Auth,
        userSim: feTypes.UserSim.Owned,
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
        Pretty number in national format or undefined: 
        Example: +33 6 36 78 63 85
        */
        const prettyNumber = !!userSim.sim.storage.number ?
            phoneNumber.prettyPrint(
                phoneNumber.build(
                    userSim.sim.storage.number,
                    userSim.sim.country ? userSim.sim.country.iso : undefined
                ),
                "LOCAL"
            )
            : undefined
            ;

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
            .join(" ")
            ;

        return Promise.all(
            targetUsers.map(({ email, isRegistered }) => send(
                user.email,
                email,
                `SIM card sharing request for ${simFriendlyName}`,
                ejsRenderTemplate<Data>(
                    templateName,
                    {
                        simFriendlyName,
                        prettyNumber,
                        gatewayLocation,
                        ownerName,
                        "targetUserEmail": email,
                        "isTargetUserRegistered": isRegistered,
                        message
                    }
                )
            ))
        ).then(() => { });

    };


})();

function ejsRenderTemplate<T>(templateName: string, data: T): string{

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

        fs.watch(templatePath, { "persistent": false }, () => read());

        read();

        return getTemplate(templateName);

    };

}

async function send(
    senderEmail: string,
    destEmail: string,
    subject: string,
    body: string
): Promise<void> {

    if (send.ses === undefined) {

        AWS.config.update({ "region": "eu-west-1" });

        AWS.config.credentials = new AWS.SharedIniFileCredentials({
            "profile": "ses",
            "filename": i.awsCredentialsFilePath
        });

        send.ses = new AWS.SES({ "apiVersion": "2012-10-17" });

    }

    const [senderName, senderDomain] = senderEmail.split("@");

    const params: AWS.SES.Types.SendEmailRequest = {
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

    await send.ses.sendEmail(params).promise();

}

namespace send {
    export let ses: AWS.SES | undefined = undefined;
}
