import { DongleExtendedClient } from "chan-dongle-extended-client";
import { SyncEvent } from "ts-events-extended";

export interface SipData {
    'MESSAGE': {
        'to': string;
        'from': string;
        'base-64-encoded-body': string;
    };
    'MESSAGE_DATA': {
        'Via': string;
        'To': string;
        'From': string;
        'Call-ID': string;
        'CSeq': string;
        'Allow': string;
        'Content-Type': string;
        'User-Agent': string;
        'Authorization': string;
        'Content-Length': string;
    };
};

export const evtFromSipData = new SyncEvent<SipData>();

const dialplanContext = "from-sip-data";

const ami= DongleExtendedClient.localhost().ami;

(async function initDialplan() {


    const variables = [
        "MESSAGE(to)",
        "MESSAGE(from)",
        "MESSAGE_DATA(Via)",
        "MESSAGE_DATA(To)",
        "MESSAGE_DATA(From)",
        "MESSAGE_DATA(Call-ID)",
        "MESSAGE_DATA(CSeq)",
        "MESSAGE_DATA(Allow)",
        "MESSAGE_DATA(Content-Type)",
        "MESSAGE_DATA(User-Agent)",
        "MESSAGE_DATA(Authorization)",
        "MESSAGE_DATA(Content-Length)"
    ];

    const extension = "_.";
    let priority = 1;


    await ami.removeExtension(extension, dialplanContext);

    for (let variable of variables)
        await ami.addDialplanExtension(
            extension,
            priority++,
            `NoOp(${variable}===\${${variable}})`,
            dialplanContext
        );

    await ami.addDialplanExtension(
        extension,
        priority++,
        `NoOp(MESSAGE(base-64-encoded-body)===\${BASE64_ENCODE(\${MESSAGE(body)})})`,
        dialplanContext
    );


    await ami.addDialplanExtension(
        extension,
        priority,
        "Hangup()",
        dialplanContext
    );

})();


ami.evt.attach(
    ({ event, context, priority }) => (
        event === "Newexten" &&
        context === dialplanContext &&
        priority === "1"
    ),
    async newExten => {

        let variables: any = {};

        let uniqueId = newExten.uniqueid;

        while (true) {

            let { application, appdata } = newExten;

            if (application === "Hangup") break;

            let match: RegExpMatchArray | null;

            if (
                application === "NoOp" &&
                (match = appdata.match(/^([^\(]+)(?:\(([^\)]+)\))?===(.*)$/))
            ) {

                let variable = match[1];

                let value = match[3];

                let key: string;

                if (key = match[2]) {

                    let key = match[2];

                    variables[variable] || (variables[variable] = {});

                    variables[variable][key] = value;

                } else variables[variable] = value;

            }

            newExten = await ami.evt.waitFor(
                ({ uniqueid }) => uniqueid === uniqueId
            );

        }

        console.log("new message: ", { variables });

        evtFromSipData.post(variables);

    }
);