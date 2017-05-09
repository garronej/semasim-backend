require("rejection-tracker").main(__dirname, "..","..");

import { 
    AsyncAGIServer, 
    AGIChannel, 
    ChannelStatus, 
} from "ts-async-agi";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import { SyncEvent } from "ts-events-extended";
import { 
    fromSip, 
    callContext as fromSipCallContext,
    messageContext as fromSipMessageContext
} from "./fromSip";
import { 
    fromDongle, 
    context as fromDongleContext, 
    outboundExt as fromDongleOutboundExt
} from "./fromDongle";
import { pjsip } from "./pjsip";

console.log("AGI Server is running");

const client= DongleExtendedClient.localhost();
const ami = client.ami;


(async function initDialplan() {

    let phoneNumberExt = "_[+0-9].";

    for (let context of [fromDongleContext, fromSipCallContext]) {

        await ami.removeExtension(phoneNumberExt, context);

        let i = 1;
        for (let action of ["AGI(agi:async)", "Hangup()"])
            await ami.addDialplanExtension(phoneNumberExt, i++, action, context);

    }


    let i = 1;
    for (let action of ["AGI(agi:async)", "Return()"])
        await ami.addDialplanExtension(fromDongleOutboundExt, i++, action, fromDongleContext);



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

    phoneNumberExt = "_.";
    let priority = 1;

    await ami.removeExtension(phoneNumberExt, fromSipMessageContext);

    for (let variable of variables)
        await ami.addDialplanExtension(
            phoneNumberExt,
            priority++,
            `NoOp(${variable}===\${${variable}})`,
            fromSipMessageContext
        );

    await ami.addDialplanExtension(
        phoneNumberExt,
        priority++,
        `NoOp(MESSAGE(base-64-encoded-body)===\${BASE64_ENCODE(\${MESSAGE(body)})})`,
        fromSipMessageContext
    );


    await ami.addDialplanExtension(
        phoneNumberExt,
        priority,
        "Hangup()",
        fromSipMessageContext
    );

})();


new AsyncAGIServer(async channel => {

    let _ = channel.relax;

    console.log("AGI REQUEST...");

    switch (channel.request.context) {
        case fromDongleContext:
            await fromDongle.call(channel);
            break;
        case fromSipCallContext:
            await fromSip.call(channel);
            break;
    }

    console.log("AGI Script Terminated");

}, ami.ami);

client.evtNewMessage.attach(
    ({ imei, ...message }) => fromDongle.sms(imei, message)
);

client.evtMessageStatusReport.attach(
    ({ imei, ...statusReport }) => fromDongle.statusReport(imei, statusReport)
);


ami.evt.attach(
    ({ event, context, priority }) => (
        event === "Newexten" &&
        context === fromSipMessageContext &&
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

        fromSip.outOfCallMessage(variables);

    }
);

(async function findConnectedDongles() {

    for (let { imei } of await client.getActiveDongles())
        await pjsip.addEndpoint(imei);

    for (let { imei } of await client.getLockedDongles())
        await pjsip.addEndpoint(imei);

})();


client.evtNewActiveDongle.attach(
    ({ imei }) => pjsip.addEndpoint(imei)
);

client.evtRequestUnlockCode.attach(
    ({ imei }) => pjsip.addEndpoint(imei)
);



/*

export enum DongleStatus {
    DISCONNECTED = 1,
    CONNECTED_AND_FREE = 2,
    CONNECTED_AND_BUSY = 3
}


export async function fromDongle_(channel: AGIChannel): Promise<void> {

    let _ = channel.relax;

    console.log("FROM DONGLE");

    console.log("callerId:", channel.request.callerid);


    let activeDongle = {
        "id": await _.getVariable("DONGLENAME"),
        "provider": await _.getVariable("DONGLEPROVIDER"),
        "imei": await _.getVariable("DONGLEIMEI"),
        "imsi": await _.getVariable("DONGLEIMSI"),
        "number": await _.getVariable("DONGLENUMBER")
    };

    console.log("activeDongle: ", activeDongle);

    let callerId = {
        "name": await _.getVariable("CALLERID(name)"),
        "num": await _.getVariable("CALLERID(num)"),
        "all": await _.getVariable("CALLERID(all)"),
        "ani": await _.getVariable("CALLERID(ani)"),
        "dnid": await _.getVariable("CALLERID(dnid)"),
        "rdnis": await _.getVariable("CALLERID(rdnis)"),
        "pres": await _.getVariable("CALLERID(pres)"),
        "ton": await _.getVariable("CALLERID(ton)")
    };

    console.log("CALLERID: ", callerId);

    let { extension } = channel.request;

    if (extension === "sms") {

        let sms64 = await _.getVariable("SMS_BASE64");

        console.log("SMS from chan dongle: ", await _.getVariable(`BASE64_DECODE(${sms64})`));

    } else if (extension === "reassembled-sms") {

        let sms = await _.getVariable("SMS");

        console.log("SMS: ", sms);

        let date = new Date((await _.getVariable("SMS_DATE"))!);

        console.log("SMS_NUMBER: ", await _.getVariable("SMS_NUMBER"));

        console.log("DATE: ", date.toUTCString());

        let textSplitCount = parseInt((await _.getVariable("SMS_TEXT_SPLIT_COUNT"))!);

        let reassembledSms = "";

        for (let i = 0; i < textSplitCount; i++)
            reassembledSms += await _.getVariable(`SMS_TEXT_P${i}`);

        console.log("SMS (REASSEMLED): ", decodeURI(reassembledSms));

    } else if (extension === "sms-status-report") {

        let statusReport = {
            "dischargeTime": await _.getVariable("STATUS_REPORT_DISCHARGE_TIME"),
            "isDelivered": await _.getVariable("STATUS_REPORT_IS_DELIVERED"),
            "id": await _.getVariable("STATUS_REPORT_ID"),
            "status": await _.getVariable("STATUS_REPORT_STATUS")
        };

        console.log("status report: ", statusReport);

    } else {

        await _.exec("DongleStatus", [activeDongle.id!, "DONGLE_STATUS"]);

        let dongleStatus = parseInt((await _.getVariable("DONGLE_STATUS"))!) as DongleStatus;

        console.log("Dongle status: ", DongleStatus[dongleStatus]);

        await _.exec("Dial", ["SIP/alice", "10"]);

    }
}

async function fromSip_(channel: AGIChannel): Promise<void> {

    console.log("FROM SIP");

    let _ = channel.relax;

    await _.answer();

    console.log(await _.streamFile("hello-world"));

    //exten = s,1,Dial(Dongle/${DONGLE}/${DEST_NUM})

}

*/

