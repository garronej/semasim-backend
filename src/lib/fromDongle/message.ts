import { 
    DongleExtendedClient, 
    StatusReport, 
    Message
} from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as pjsip from "../pjsip";


export async function sms(
    imei: string,
    { number, date, text }: Message
) {

    console.log("FROM DONGLE MESSAGE");

    console.log({ imei }, { number, date, text });

    let imsi: string | undefined = undefined;

    for (let dongle of await DongleExtendedClient.localhost().getActiveDongles()) {

        if (dongle.imei !== imei) continue;

        imsi = dongle.imsi;

        break;

    }


    let headers = {
        "imsi": `${imsi}`,
        "date": `${date.toISOString()}`
    };

    pjsip.sendMessage(imei, number, headers, text, "sms");
    


    /*
    //With chan_sip: 
    await DongleExtendedClient.localhost().ami.postAction({
        "action": "MessageSend",
        "to": `SIP:${to}`,
        "from": `<${message.number}>`,
        "base64body": Base64.encode(message.text)
        //"variable": "Content-Type=text/plain;charset=UTF-8"
    });
    */


}

export async function statusReport(imei: string, statusReport: StatusReport) {

    console.log("FROM DONGLE STATUS REPORT!");

    //console.log({ imei, statusReport });

    let { messageId, dischargeTime, isDelivered, status, recipient } = statusReport;

    //TODO look if mute status report is set

    let body = `SMS RECEPTION STATUS: ${status}`;

    let headers = {
        "content_type": "text/plain;charset=UTF-8",
        "outgoing_sms_id": `${messageId}`,
        "is_delivered": `${isDelivered}`,
        "status": `${status}`,
        "discharge_time": dischargeTime.toISOString()
    };


    pjsip.sendMessage( imei, recipient, headers, body, "sms_reception_status");

    /*
    //With chan_sip
    await DongleExtendedClient.localhost().ami.postAction({
        "action": "MessageSend",
        "to": `SIP:${to}`,
        "from": `<semasim>`,
        "base64body": Base64.encode(JSON.stringify(statusReport)),
        //"variable": "Content-Type=application/json;charset=UTF-8,Semasim-Event=status-report"
        "variable": "Content-Type=text/plain;charset=UTF-8,Semasim-Event=status-report"
    });
    */


}








