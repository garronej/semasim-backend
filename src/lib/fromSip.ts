import { AGIChannel } from "ts-async-agi";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import { pjsip } from "./pjsip";
import { diagnostics } from "./diagnostics";

import { gain } from "./fromDongle";

export const callContext= "from-sip-call";
export const messageContext= "from-sip-message";

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

        //await diagnostics(channel);

        let imei = channel.request.callerid;

        await _.setVariable("JITTERBUFFER(fixed)","2500,10000");

        await _.setVariable("AGC(rx)", gain);

        await _.exec("Dial", [`Dongle/i:${imei}/${channel.request.extension}`, "60"]);

    }

    export async function outOfCallMessage(sipPacket: OutOfCallMessage) {

        console.log(" FROM SIP DATA...");

        console.log({ sipPacket });

        switch (sipPacket['MESSAGE']['to'].match(/^(?:pj)?sip:([^@]+)/)![1]) {
            case "semasim":
                await outOfCallMessage.applicationData(sipPacket);
                break;
            default:
                await outOfCallMessage.sms(sipPacket);
                break;
        }

    }

    export namespace outOfCallMessage {

        export async function sms(sipPacket: OutOfCallMessage) {

            console.log("...MESSAGE");

            let body = Base64.decode(sipPacket['MESSAGE']['base-64-encoded-body']);

            let number = sipPacket.MESSAGE.to.match(/^(?:pj)?sip:(\+?[0-9]+)/)![1];

            let text = body;

            let imei = sipPacket.MESSAGE.from.match(/^<sip:([^@]+)/)![1];

            console.log({ number, imei, text });

            let outgoingMessageId: number;

            try {

                outgoingMessageId = await DongleExtendedClient.localhost().sendMessage(imei, number, text);

                //TODO respond with message id.

                console.log({ outgoingMessageId });

            } catch (error) {

                console.log("ERROR: Send message via dongle failed, retry later", error);

                outgoingMessageId = NaN;

            }

            let sendDate= new Date();

            let contacts = await pjsip.getEndpointContacts(imei);

            //TODO: send as well content of the message and date for other contacts

            console.log(`Forwarding Message send confirmation to ${contacts.length} endpoints...`);

            for (let contact of contacts) {

                await DongleExtendedClient.localhost().ami.messageSend(
                    `pjsip:${contact}`,
                    number,
                    `"${text}" ${isNaN(outgoingMessageId)?"SEND ERROR":`SENT\nOUTGOING MESSAGE ID: ${outgoingMessageId}`}`,
                    {
                        "True-Content-Type": "text/plain;charset=UTF-8",
                        "Semasim-Message-Type": "Send-Status",
                        "Send-Status_Is-Send": `${!isNaN(outgoingMessageId)}`,
                        "Send-Status_Send-Date": sendDate.toISOString(),
                        "Send-Status_Outgoing-Message-ID": `${outgoingMessageId}`,
                        "Send-Status_Request-Call-ID": sipPacket.MESSAGE_DATA["Call-ID"],
                    }
                );

                console.log(`...forwarded to contact ${contact}`);

            }


            /*
            //with chan_sip
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
            */



        }

        export async function applicationData(sipPacket: OutOfCallMessage) {

            console.log("...APPLICATION DATA!");

        }

    }

}
