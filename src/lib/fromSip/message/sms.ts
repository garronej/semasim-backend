import { DongleExtendedClient } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as pjsip from "../../pjsip";
import * as fromDongle from "../../fromDongle";


import * as _debug from "debug";
let debug = _debug("_fromSip/sms");

export async function sms(sipPacket: pjsip.PacketSipMessage) {

    debug("...SMS!");

    let text = sipPacket.body;

    let number = sipPacket.to;

    let imei = sipPacket.from_endpoint


    let outgoingMessageId: number = NaN;

    let info_message: string = "";

    let imsi: string = "";

    let isSent: boolean | undefined = await (async () => {

        let dongle = await DongleExtendedClient.localhost().getActiveDongle(imei);

        if (!dongle) {

            //TODO: Should not be allowed by client, cf presence state

            info_message = `MESSAGE NOT SEND, DONGLE NOT ACTIVE`;

            return undefined;

        }

        imsi = dongle.imsi;

        try {

            outgoingMessageId = await DongleExtendedClient
                .localhost()
                .sendMessage(imei, number, text);

        } catch (error) {

            info_message = `MESSAGE NOT SEND, INTERNAL ERROR, ${error.message}`;

            return false;

        }

        if (isNaN(outgoingMessageId)) {

            info_message = "MESSAGE NOT SEND, DONGLE ERROR";

            return false;

        }

        info_message = "MESSAGE SUCCESSFULLY SENT";

        return true;

    })();


    let headers = {
        "outgoing_message_id": `${outgoingMessageId}`,
        "imsi": imsi,
        "is_sent": `${isSent}`,
        "info_message": info_message
    };

    debug("SMS: ", { number, imei, text, headers });

    //TODO: is send fail the info message should be sent only to the contact

    let name = await DongleExtendedClient.localhost().getContactName(imei, number);

    pjsip.sendHiddenMessage(
        await pjsip.getAvailableContactsOfEndpoint(sipPacket.from_endpoint),
        number,
        headers,
        text,
        isSent ? "✓" : info_message,
        "sms_send_status",
        sipPacket.headers.call_id
    );

    if (!isSent) return;

    try {

        await DongleExtendedClient
            .localhost()
            .evtMessageStatusReport
            .waitFor(({ messageId }) => messageId === outgoingMessageId, 15000);

    } catch (error) {

        debug("no status report received");

        await fromDongle.statusReport(
            imei,
            {
                "messageId": outgoingMessageId,
                "dischargeTime": new Date(NaN),
                "isDelivered": false,
                "recipient": number,
                "status": ""
            }
        );

    }



}