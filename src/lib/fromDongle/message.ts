import { 
    DongleExtendedClient, 
    StatusReport, 
    Message
} from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as pjsip from "../pjsip";

import * as _debug from "debug";
let debug = _debug("_fromDongle/message");


export async function sms(
    imei: string,
    { number, date, text }: Message
) {

    debug("FROM DONGLE MESSAGE");

    //TODO: See edge case when dongle send a message and immediately disconnect
    let { imsi } = (await DongleExtendedClient.localhost().getActiveDongle(imei))!;

    debug({ imsi, number, date, text });

    await pjsip.sendMessage(
        await pjsip.getAvailableContactsOfEndpoint(imei),
        number,
        { imsi, "date": `${date.toISOString()}` },
        text,
        "sms"
    );

}

export async function statusReport(
    imei: string,
    statusReport: StatusReport
) {

    debug("FROM DONGLE STATUS REPORT!");

    let { messageId, dischargeTime, isDelivered, status, recipient } = statusReport;

    let body = (() => {

        if (isDelivered) return "✓✓";

        if (!status) return "NO STATUS REPORT RECEIVED";

        return `SMS STATUS REPORT: ${status}`;

    })();

    debug({ statusReport, body});

    let headers = {
        "outgoing_sms_id": `${messageId}`,
        "is_delivered": `${isDelivered}`,
        "status": `${status}`,
        "discharge_time": isNaN(dischargeTime.getTime())?`${dischargeTime}`:dischargeTime.toISOString()
    };

    await pjsip.sendMessage(
        await pjsip.getAvailableContactsOfEndpoint(imei),
        recipient,
        headers,
        body,
        "sms_status_report"
    );


}
