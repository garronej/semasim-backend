import { 
    DongleExtendedClient, 
    StatusReport, 
    Message
} from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as admin from "../admin";
import * as inbound from "../sipProxy/inbound";

import * as _debug from "debug";
let debug = _debug("_fromDongle/message");


export async function sms(
    imei: string,
    { number, date, text }: Message
) {

    debug("FROM DONGLE MESSAGE");

    await admin.dbSemasim.addNotificationAsUndelivered({
        "endpoint": imei,
        "date": Date.now(),
        "payload": JSON.stringify({number, date, text})
    });

    //TODO: See edge case when dongle send a message and immediately disconnect, maybe send imsi in dongle-extended
    //let { imsi } = (await DongleExtendedClient.localhost().getActiveDongle(imei))!;

    let name = await DongleExtendedClient.localhost().getContactName(imei, number);

    debug({ number, date, text, name });

    let targetContacts= (await admin.dbAsterisk.queryContacts()).filter(({endpoint})=> endpoint === imei);


    for( let contact of targetContacts){

        let received= await admin.sendMessage(contact, number, {}, text, name);

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
