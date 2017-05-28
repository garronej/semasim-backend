import { AGIChannel } from "ts-async-agi";

import { gain, jitterBuffer } from "../fromDongle";

import * as _debug from "debug";
let debug = _debug("_fromSip/call");



export async function call(channel: AGIChannel) {

    let _ = channel.relax;

    debug("FROM SIP CALL!");

    let imei = channel.request.callerid;

    await _.setVariable(`JITTERBUFFER(${jitterBuffer.type})`, jitterBuffer.params);

    await _.setVariable("AGC(rx)", gain);

    await _.exec("Dial", [`Dongle/i:${imei}/${channel.request.extension}`]);

    debug("call terminated");


}