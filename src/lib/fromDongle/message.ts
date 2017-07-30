import { 
    DongleExtendedClient, 
    StatusReport, 
    Message
} from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as pjsip from "../pjsip";
import * as inbound from "../sipProxy/inbound";

import * as _debug from "debug";
let debug = _debug("_fromDongle/message");


export async function sms(
    imei: string,
    { number, date, text }: Message
) {

    debug("FROM DONGLE MESSAGE");

    //TODO: See edge case when dongle send a message and immediately disconnect, maybe send imsi in dongle-extended
    let { imsi } = (await DongleExtendedClient.localhost().getActiveDongle(imei))!;

    let name = await DongleExtendedClient.localhost().getContactName(imei, number);

    debug({ imsi, number, date, text, name });

    let targetContacts= (await pjsip.queryContacts()).filter(({endpoint})=> endpoint === imei);


    for( let contact of targetContacts){

        let received= await inbound.sendMessage(contact, number, {}, text, name);

        debug("sending message to: ", { contact }, {received });


    }

    /*

    let contacts= await pjsip.queryContactsOfEndpoints(imei);

    for (let contact of contacts){

        debug({ contact });

        inbound.sendMessage(
            contact,
            number,
            { "message-type": "sms" },
            text,
            name
        ).then(isReceived=> debug("received", isReceived, contact));

    }

    */


}
