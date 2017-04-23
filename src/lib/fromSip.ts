import { AGIChannel } from "ts-async-agi";
import { SipData } from "./evtFromSipData";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";



export namespace fromSip {

    export async function call(channel: AGIChannel) {

        let _ = channel.relax;

        console.log("FROM SIP CALL!");

        await _.answer();

        await _.streamFile("hello-world");

    }

    export async function data(sipData: SipData) {

        console.log(" FROM SIP DATA...");

        let body= Base64.decode(sipData['MESSAGE']['base-64-encoded-body']);

        switch( sipData['MESSAGE']['to'].match(/^sip:([^@]+)/)![1] ){
            case "request": 
                await data.request(sipData, body);
                break;
            default:
                await data.message(sipData, body);
                break;
        }


    }

    export namespace data {

        export async function message(sipData: SipData, body: string) {

            console.log("...MESSAGE!");

            let number = sipData.MESSAGE.to.match(/^sip:(\+?[0-9]+)/)![1];

            let text = body;

            console.log({ text });

            let imei = "358880032664586";

            try {

                let messageId = await DongleExtendedClient.localhost().sendMessage(imei, number, text);

                //TODO respond with message id.

                console.log({ messageId });

            } catch (error) {

                console.log("ERROR: Send message via dongle failed, retry later", error);

            }



        }

        export async function request(sipData: SipData, body: string) {

            console.log("...REQUEST!");

        }

    }


}