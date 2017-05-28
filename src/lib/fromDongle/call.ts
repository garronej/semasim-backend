import { AGIChannel } from "ts-async-agi";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as pjsip from "../pjsip";
import * as agi from "../agi";

import * as _debug from "debug";
let debug = _debug("_fromDongle/call");



export const gain = `${4000}`;


/*
export const jitterBuffer = {
    type: "fixed",
    params: "2500,10000"
};
*/

export const jitterBuffer = {
    type: "adaptive",
    params: "default"
};


/*
export const jitterBuffer = {
    type: "fixed",
    params: "default"
};
*/


export async function call(channel: AGIChannel) {

    debug(`Call from ${channel.request.callerid}`);

    let _ = channel.relax;

    /*

    console.log("AGC, answer after, no play, gain 4000, rx undefined");

    await _.setVariable("AGC(tx)", gain);

    */


    let imei = (await _.getVariable("DONGLEIMEI"))!;

    //await _.setVariable("CALLERID(name-charset)", "utf8");

    await _.setVariable(
        "CALLERID(name)",
        `"${(await pjsip.getContactName(imei, channel.request.callerid)) || channel.request.callerid}"`
    );


    /*
    let contactsToDial_ = await _.getVariable(`PJSIP_DIAL_CONTACTS(${imei})`);
    console.log({ contactsToDial_ });
    */

    let contactsToDial = (await pjsip.getAvailableContactsOfEndpoint(imei))
        .map(contact => `PJSIP/${contact}`)
        .join("&");

    if (!contactsToDial) {

        debug("No contact to dial!");

        return;

    }

    debug({ contactsToDial });


    debug("Dial...");

    await agi.dialAndGetOutboundChannel(
        channel,
        contactsToDial,
        async (outboundChannel) => {

            let _ = outboundChannel.relax;

            debug("...OUTBOUND PJSIP channel!");

            debug("set jitterbuffer", jitterBuffer);
            await _.setVariable(`JITTERBUFFER(${jitterBuffer.type})`, jitterBuffer.params);

            debug("set automatic gain control rx", { gain });
            await _.setVariable("AGC(rx)", gain);

        }
    );

    debug("Call ended");


}
