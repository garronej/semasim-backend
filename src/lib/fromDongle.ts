import { AGIChannel } from "ts-async-agi";

export async function fromDongle(channel: AGIChannel) {

    console.log("...FROM DONGLE...");

    let _ = channel.relax;

    let dongle = {
        "name": await _.getVariable("DONGLENAME"),
        "provider": await _.getVariable("DONGLEPROVIDER"),
        "imei": await _.getVariable("DONGLEIMEI"),
        "imsi": await _.getVariable("DONGLEIMSI"),
        "number": await _.getVariable("DONGLENUMBER")
    } as fromDongle.DongleIdentifier;

    console.log({ dongle });

    switch (channel.request.extension) {
        case "reassembled-sms":
            await fromDongle.message(dongle, channel);
            break;
        case "sms-status-report":
            await fromDongle.statusReport(dongle, channel);
            break;
        default:
            await fromDongle.call(dongle, channel);
            break;
    }

}

export namespace fromDongle {

    export interface DongleIdentifier {
        name: string;
        provider: string;
        imei: string;
        imsi: string;
        number: string;
    }

    export async function message(dongle: DongleIdentifier, channel: AGIChannel) {

        console.log("...MESSAGE !");

        let _ = channel.relax;

        let message = {
            "date": new Date((await _.getVariable("SMS_DATE"))!),
            "number": (await _.getVariable("SMS_NUMBER"))!,
            "text": await (async function () {

                let textSplitCount = parseInt((await _.getVariable("SMS_TEXT_SPLIT_COUNT"))!);

                let reassembledSms = "";

                for (let i = 0; i < textSplitCount; i++)
                    reassembledSms += await _.getVariable(`SMS_TEXT_P${i}`);

                return decodeURI(reassembledSms);

            })()
        };

        console.log({ message });

        /* 
        TODO: Check peer online,
        store message
        */


        let to = "alice";

        await _.setVariable("MESSAGE(body)", `"${message.text.replace(/"/g,"''")}"`);

        await _.exec("MessageSend", ["SIP:alice", `"contact_name" <${message.number}>`]);

        console.log("MESSAGE_SEND_STATUS", await _.getVariable("MESSAGE_SEND_STATUS"));


    }

    export async function statusReport(dongle: DongleIdentifier, channel: AGIChannel) {

        console.log("...STATUS REPORT!");

    }

    export async function call(dongle: DongleIdentifier, channel: AGIChannel) {

        console.log("...CALL!");

        let _ = channel.relax;

        await _.answer();

        await _.streamFile("hello-world");


    }


}