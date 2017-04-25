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

        let imei = "358880032664586";

        await _.exec("Dial", [`Dongle/i:${imei}/${channel.request.extension}`, "30"]);


        /*
        await _.answer();

        await _.streamFile("hello-world");
        */


        //exten = s,1,Dial(Dongle/${DONGLE}/${DEST_NUM})

    }

    export async function outOfCallMessage(sipPacket: OutOfCallMessage) {

        console.log(" FROM SIP DATA...");

        console.log({ sipPacket });

        switch( sipPacket['MESSAGE']['to'].match(/^(?:pj)?sip:([^@]+)/)![1] ){
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

            console.log("...MESSAGE");

            let body = Base64.decode(sipPacket['MESSAGE']['base-64-encoded-body']);

            let number = sipPacket.MESSAGE.to.match(/^(?:pj)?sip:(\+?[0-9]+)/)![1];

            let text = body;

            console.log({ text });


            let from= sipPacket.MESSAGE.from.match(/^<sip:([^@]+)/)![1];

            console.log({from});

            //TODO 
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


            let contacts = (await getEndpointsContacts())[from] || [];

            //TODO: send as well content of the message and date for other contacts

            console.log(`Forwarding Message send confirmation to ${contacts.length} endpoints...`);

            for (let contact of contacts) {

                await DongleExtendedClient.localhost().ami.messageSend(
                    `pjsip:${contact}`,
                    `semasim`,
                    JSON.stringify({
                        "Call-ID": sipPacket.MESSAGE_DATA["Call-ID"],
                        "messageId": messageId
                    }), {
                        "True-Content-Type": "application/json;charset=UTF-8",
                        "Semasim-Event": "Send-Confirmation"
                    }
                );

                console.log(`...forwarded to contact ${contact}`);

            }


            /* with chan_sip
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

export async function getEndpointsContacts(): Promise<{ [endpoint: string]: string[] }> {

    let ami = DongleExtendedClient.localhost().ami;

    let out: { [endpoint: string]: string[]; } = {};

    ami.postAction({ "action": "PJSIPShowEndpoints" });

    let actionId = ami.lastActionId;

    while (true) {

        let evt = await ami.evt.waitFor(evt => evt.actionid === actionId);

        if (evt.event === "EndpointListComplete") break;

        let { objectname, contacts } = evt;

        out[objectname] = contacts.split(",");

        out[objectname].pop();

    }

    return out;

}