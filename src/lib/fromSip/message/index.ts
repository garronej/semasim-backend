import * as pjsip from "../../pjsip";

import { sms } from "./sms";


export async function message(sipPacket: pjsip.PacketSipMessage) {

    console.log(" FROM SIP MESSAGE...");

    //console.log({ sipPacket });

    //TODO make a better mask for incoming message extension
    switch ( sipPacket.to ) {
        default:
            await sms(sipPacket);
            break;
    }
}
