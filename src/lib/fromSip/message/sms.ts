import { DongleExtendedClient } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as pjsip from "../../pjsip";
import * as fromDongle from "../../fromDongle";
import * as sip from "../../sipProxy/sip";
import * as inbound from "../../sipProxy/inbound";
import { flowTokenKey } from "../../sipProxy/shared";


import * as _debug from "debug";
let debug = _debug("_fromSip/sms");

const statusReportTimeout = 15000;

export async function sms(fromContact: string, sipRequest: sip.Request) {

    debug("...SMS!");

    let text = sipRequest.content;

    let number = sip.parseUri(sipRequest.headers.to.uri).user!;

    //TODO: this is only a fix
    if (!number.match(/^[\+0]/))
        number = `+${number}`;

    console.log("after reformating",{ number });

    let imei = sip.parseUriWithEndpoint(fromContact).endpoint;

    let outgoingMessageId: number = NaN;

    let info_message: string = "";

    let imsi: string = "";

    let isSent: boolean | undefined = await (async () => {

        let dongle = await DongleExtendedClient.localhost().getActiveDongle(imei);

        if (!dongle) {

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

    debug("SMS: ", { number, imei, text, info_message });

    let name = await DongleExtendedClient.localhost().getContactName(imei, number);

    console.log("confirmation", { name, number });

    inbound.sendMessage(
        fromContact,
        number,
        {},
        isSent ? "✓" : info_message,
        name
    );


    /*


    //TODO: dongle on connect should access the database and send message not sent
    if (!isSent) return;

    let statusReportText = "NO STATUS REPORT RECEIVED";

    try {

        let statusReport = await DongleExtendedClient
            .localhost()
            .evtMessageStatusReport
            .waitFor(({ messageId }) => messageId === outgoingMessageId, statusReportTimeout);

        if (statusReport.isDelivered)
            statusReportText = "✓✓";
        else
            statusReportText = `${statusReport.status}`;

    } catch (error) {

        debug("No status report received in time");

    }
    
    inbound.sendMessage(
        senderContact.pjsipUri,
        imei,
        {},
        statusReportText,
        name
    );

    */

}

