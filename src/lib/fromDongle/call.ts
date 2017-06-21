import { AGIChannel } from "ts-async-agi";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as pjsip from "../pjsip";
import * as agi from "../agi";

import * as _debug from "debug";
let debug = _debug("_fromDongle/call");



export const gain = `${4000}`;


export const jitterBuffer = {
    //type: "fixed",
    //params: "2500,10000"
    //type: "fixed",
    //params: "default"
    type: "adaptive",
    params: "default"
};



export async function call(channel: AGIChannel) {

    debug(`Call from ${channel.request.callerid}`);

    let _ = channel.relax;

    let imei = (await _.getVariable("DONGLEIMEI"))!;

    let name = await DongleExtendedClient.localhost().getContactName(imei, channel.request.callerid);

    if (name) {
        //await _.setVariable("CALLERID(name-charset)", "utf8");
        await _.setVariable("CALLERID(name)", name);
    }

    let contactsToDial = await _.getVariable(`PJSIP_DIAL_CONTACTS(${imei})`);

    /*
    let contactsToDial = (await pjsip.getAvailableContactsOfEndpoint(imei))
        .map(contact => `PJSIP/${contact}`)
        .join("&");
    */

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
