import { DongleExtendedClient } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import * as pjsip from "../../pjsip";


export async function sms(sipPacket: pjsip.PacketSipMessage) {

    console.log("...SMS!");

    let text = sipPacket.body;

    let number = sipPacket.to;

    let imei = sipPacket.from_endpoint

    console.log("SMS: ", { number, imei, text });

    let outgoingMessageId: number = NaN;

    let info_message: string = "";

    let imsi: string = "";

    //TODO ensure dongle activated for send

    let isSent: boolean | undefined = await (async () => {

        for( let dongle of await DongleExtendedClient.localhost().getActiveDongles() ){

            if( dongle.imei !== imei ) continue;

            imsi= dongle.imsi;

            break;

        }

        if( !imsi ){

            //Should not be allowed by client, cf presence state

            info_message = `MESSAGE NOT SEND, DONGLE NOT ACTIVE`;

            return undefined;

        }

        try {

            outgoingMessageId = await DongleExtendedClient.localhost().sendMessage(imei, number, text || " ");

        } catch (error) {

            info_message = `MESSAGE NOT SEND, INTERNAL ERROR, ${error.message}`;

            return false;
        }

        if (isNaN(outgoingMessageId)) {

            info_message = `MESSAGE NOT SEND, DONGLE ERROR`;

            return false;

        }

        info_message = ``;

        return true;


    })();

    let headers = {
        "outgoing_message_id": `${outgoingMessageId}`,
        "imsi": imsi,
        "is_sent": `${isSent}`,
        "date": (new Date()).toISOString(),
        "info_message": info_message
    };


    pjsip.sendMessage(
        sipPacket.from_endpoint,
        number,
        headers,
        text,
        "sms_send_status",
        sipPacket.headers.call_id, 
        info_message
    );


    //console.log("TODO store in DB: ", { messageType, headers, text, body });

    /*
    //with chan_sip
    await DongleExtendedClient.localhost().ami.postAction({
        "action": "MessageSend",
        "to": `SIP:${"alice"}`,
        "from": `<semasim>`,
        "base64body": Base64.encode(JSON.stringify({
            "Call-ID": sipPacket.MESSAGE_DATA["Call-ID"],
            "messageId": messageId
        })),
        //"variable": "Content-Type=application/json;charset=UTF-8,Semasim-Event=status-report"
        "variable": "Content-Type=text/plain;charset=UTF-8,Semasim-Event=send-confirmation"
    });
    */



}



