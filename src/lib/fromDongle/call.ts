import { AGIChannel } from "ts-async-agi";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as pjsip from "../pjsip";

//import { diagnostics } from "./diagnostics";

export const gain = "4000";

//TODO: Read from config file
export const context = "from-dongle";
export const outboundExt = "outbound";

export const jitterBuffer = {
    type: "fixed",
    params: "2500,10000"
};


export async function call(channel: AGIChannel) {

    console.log("... FROM DONGLE CALL");

    switch (channel.request.extension) {
        case outboundExt:
            await call.outbound(channel);
            break;
        default:
            await call.inbound(channel);
            break;
    }

}

export namespace call {

    export async function inbound(channel: AGIChannel) {

        console.log("... INBOUND !");

        let _ = channel.relax;

        /*
 
        channel.request.extension = "1234";
 
        await diagnostics(channel);
 
        if( channel.isHangup ) return;
 
        */

        /*

        let gain = "4000";

        console.log({ gain });

        console.log("AGC, answer after, no play, gain 4000, rx undefined");

        await _.setVariable("AGC(tx)", gain);

        */

        let imei = (await _.getVariable("DONGLEIMEI"))!;

        console.log({ imei });

        let contactsToDial_ = await _.getVariable(`PJSIP_DIAL_CONTACTS(${imei})`);

        console.log({ contactsToDial_ });

        let contactsToDial = (await pjsip.getAvailableContactsOfEndpoint(imei)).map(contact => `PJSIP/${contact}`).join("&");

        if (!contactsToDial) {

            console.log("No contact to dial!");

            return;

        }

        console.log({ contactsToDial });

        await _.exec("Dial", [contactsToDial, "", `b(${context}^${outboundExt}^${1})`]);


        /*
        //With chan_sip
        await _.exec("Dial", [`SIP/${to}`, "10"]);
        */

    }


    export async function outbound(channel: AGIChannel) {

        let _ = channel.relax;

        console.log("OUTBOUND !");

        await _.setVariable(`JITTERBUFFER(${jitterBuffer.type})`, jitterBuffer.params);

        await _.setVariable("AGC(rx)", gain);


    }
}









