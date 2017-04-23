import { AGIChannel } from "ts-async-agi";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";

export interface OutOfCallMessage {
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

export namespace fromSip {

    export async function call(channel: AGIChannel) {

        let _ = channel.relax;

        console.log("FROM SIP CALL!");

        await _.answer();

        await _.streamFile("hello-world");

    }

    export async function outOfCallMessage(sipPacket: OutOfCallMessage) {

        console.log(" FROM SIP DATA...");

        switch( sipPacket['MESSAGE']['to'].match(/^sip:([^@]+)/)![1] ){
            case "application-data": 
                await outOfCallMessage.applicationData(sipPacket);
                break;
            default:
                await outOfCallMessage.sms(sipPacket);
                break;
        }

    }

    export namespace outOfCallMessage {

        export async function sms(sipPacket: OutOfCallMessage) {

            console.log("...MESSAGE!");

            let body = Base64.decode(sipPacket['MESSAGE']['base-64-encoded-body']);

            let number = sipPacket.MESSAGE.to.match(/^sip:(\+?[0-9]+)/)![1];

            let text = body;

            console.log({ text });

            let imei = "358880032664586";

            let messageId: number;

            try {

                messageId = await DongleExtendedClient.localhost().sendMessage(imei, number, text);

                //TODO respond with message id.

                console.log({ messageId });

            } catch (error) {

                console.log("ERROR: Send message via dongle failed, retry later", error);

                messageId= NaN;

            }

            await DongleExtendedClient.localhost().ami.postAction({
                "action": "MessageSend",
                "to": `SIP:${"alice"}`,
                "from": `<semasim>`,
                "base64body": Base64.encode(JSON.stringify({
                    "Call-ID": sipPacket.MESSAGE_DATA["Call-ID"],
                    "messageId": messageId
                })),
                //"variable": "Content-Type=application/json;charset=UTF-8,Semasim-Event=status-report"
                "variable": "Content-Type=text/plain;charset=UTF-8,Semasim-Event=send-confirmation"
            });

        }

        export async function applicationData(sipPacket: OutOfCallMessage) {

            console.log("...APPLICATION DATA!");

        }

    }

}