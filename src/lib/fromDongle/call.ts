import { AGIChannel } from "ts-async-agi";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as admin from "../admin";
import * as agi from "../agi";
import * as inbound from "../sipProxy/inbound";
//import * as firebase from "../sipProxy/firebase";
//import * as sip from "../sipProxy/sip";

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

    debug(`Call from ${channel.request.callerid} !`);

    let _ = channel.relax;

    //let imsi = (await _.getVariable("DONGLEIMSI"))!;
    //console.log({ imsi });

    let imei = (await _.getVariable("DONGLEIMEI"))!;

    debug({ imei });

    let name = await DongleExtendedClient.localhost().getContactName(imei, channel.request.callerid);

    debug({ name });


    //await _.setVariable("CALLERID(name-charset)", "utf8");
    await _.setVariable("CALLERID(name)", name || "");

    debug("Before database query");

    let contactsOfEndpoint = (await admin.queryContacts()).filter(({ endpoint }) => endpoint === imei);


    //TODO: Get the actual contacts to dial.
    let contactsReachable: admin.Contact[] = contactsOfEndpoint;


    //PJSIP/358880032664586/sip:358880032664586@172.31.27.145:5060;CtRt084ec2ed68c1d923=tcp:semasim.com
    let contactsToDial = contactsReachable.map(({ uri }) => `PJSIP/${imei}/${uri}`).join("&");

    //let contactsToDial = await _.getVariable(`PJSIP_DIAL_CONTACTS(${imei})`);

    debug({ contactsToDial });

    if (!contactsToDial) {

        debug("No contact to dial!");

        return;

    }

    debug("Dialing...");

    await agi.dialAndGetOutboundChannel(
        channel,
        //`PJSIP/${imei}`,
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
