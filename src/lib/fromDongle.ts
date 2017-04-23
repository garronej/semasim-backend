import { AGIChannel } from "ts-async-agi";
import { DongleExtendedClient, StatusReport, Message } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";




export namespace fromDongle {

    export interface DongleIdentifier {
        name: string;
        provider: string;
        imei: string;
        imsi: string;
        number: string;
    }

    export async function sms(imei: string, message: Message) {

        console.log("FROM DONGLE MESSAGE !");

        console.log({ imei, message });

        /* 
        TODO: Check peer online,
        store message
        */

        let to = "alice";

        await DongleExtendedClient.localhost().ami.postAction({
            "action": "MessageSend",
            "to": `SIP:${to}`,
            "from": `"contact_name" <${message.number}>`,
            "base64body": Base64.encode(message.text),
            "variable": "Content-Type=text/plain;charset=UTF-8"
        });


    }

    export async function statusReport(imei: string, statusReport: StatusReport) {

        console.log("FROM DONGLE STATUS REPORT!");

        console.log({ imei, statusReport });

        let to= "alice";

        await DongleExtendedClient.localhost().ami.postAction({
            "action": "MessageSend",
            "to": `SIP:${to}`,
            "from": `<semasim>`,
            "base64body": Base64.encode(JSON.stringify(statusReport)),
            //"variable": "Content-Type=application/json;charset=UTF-8,Semasim-Event=status-report"
            "variable": "Content-Type=text/plain;charset=UTF-8,Semasim-Event=status-report"
        });


    }

    export async function call(channel: AGIChannel) {

        console.log("... FROM DONGLE CALL!");

        let _ = channel.relax;

        let dongle = {
            "name": await _.getVariable("DONGLENAME"),
            "provider": await _.getVariable("DONGLEPROVIDER"),
            "imei": await _.getVariable("DONGLEIMEI"),
            "imsi": await _.getVariable("DONGLEIMSI"),
            "number": await _.getVariable("DONGLENUMBER")
        } as fromDongle.DongleIdentifier;

        console.log({ dongle });

        let to= "alice";

        await _.exec("Dial", [`SIP/${to}`, "10"]);

        /*
        await _.answer();

        await _.streamFile("hello-world");
        */


    }


}