import { 
    AsyncAGIServer, 
    AGIChannel, 
    ChannelStatus, 
} from "ts-async-agi";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import { SipData, evtFromSipData } from "./evtFromSipData";
import { fromSip } from "./fromSip";
import { fromDongle } from "./fromDongle";

console.log("AGI Server is running");

const ami= DongleExtendedClient.localhost().ami;

(async function initDialplan() {

    let arr_extension_context = [
        ["_[+0-9].", "from-dongle"],
        ["reassembled-sms", "from-dongle"],
        ["sms-status-report", "from-dongle"],
        ["_[+0-9].", "from-sip-call"]
    ];

    for (let [extension, context] of arr_extension_context){

        await ami.removeExtension(extension, context);

        await ami.addDialplanExtension(
            extension, 1, "AGI(agi:async)", context
        );

        await ami.addDialplanExtension(
            extension, 2, "Hangup()", context
        );

    }

})();


new AsyncAGIServer(async channel => {

    let _= channel.relax;

    console.log("AGI REQUEST...");

    switch (channel.request.context) {
        case "from-dongle":
            await fromDongle(channel);
            break;
        case "from-sip-call":
            await fromSip.call(channel);
            break;
    }

    await _.hangup();

    console.log("Script returned");

}, ami.ami);

evtFromSipData.attach(data => fromSip.data(data));

export enum DongleStatus {
    DISCONNECTED = 1,
    CONNECTED_AND_FREE = 2,
    CONNECTED_AND_BUSY = 3
}


/*


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

