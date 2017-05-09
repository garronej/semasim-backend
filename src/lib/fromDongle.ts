import { AGIChannel } from "ts-async-agi";
import { DongleExtendedClient, StatusReport, Message } from "chan-dongle-extended-client";
import { Base64 } from "js-base64";
import { pjsip } from "./pjsip";
import { diagnostics } from "./diagnostics";

export const gain= "4000";
export const context= "from-dongle";
export const outboundExt= "outbound";

export namespace fromDongle {


    export async function sms(imei: string, message: Message) {

        console.log("FROM DONGLE MESSAGE");

        console.log({ imei, message });

        /* 
        TODO: Check peer online,
        store message
        */

        let contacts = await pjsip.getAvailableEndpointContacts(imei);

        console.log(`Forwarding message to ${contacts.length} endpoints...`);

        for (let contact of contacts) {

            await DongleExtendedClient.localhost().ami.messageSend(
                `pjsip:${contact}`,
                message.number,
                message.text,
                {
                    "True-Content-Type": "text/plain;charset=UTF-8",
                    "Semasim-Message-Type": "SMS",
                }
            );

            console.log(`...forwarded to contact ${contact}`);

        }

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

        console.log({ imei, statusReport });

        let { messageId, dischargeTime, isDelivered, status } = statusReport;

        let contacts = await pjsip.getAvailableEndpointContacts(imei);

        console.log(`Forwarding status report to ${contacts.length} endpoints...`);

        for (let contact of contacts) {

            statusReport.dischargeTime;
            statusReport.isDelivered;
            statusReport.messageId;
            statusReport.status;

            await DongleExtendedClient.localhost().ami.messageSend(
                `pjsip:${contact}`,
                statusReport.recipient,
                `OUTGOING MESSAGE ID: ${messageId}, STATUS: ${status}`, 
                {
                    "True-Content-Type": "text/plain;charset=UTF-8",
                    "Semasim-Message-Type": "Status-Report",
                    "Status-Report_Discharge-Time": dischargeTime.toISOString(),
                    "Status-Report_Outgoing-Message-ID": `${messageId}`,
                    "Status-Report_Is-Delivered": `${isDelivered}`,
                    "Status-Report_Status": status
                }
            );

            console.log(`...forwarded to contact ${contact}`);

        }


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

    export async function call(channel: AGIChannel) {

        console.log("... FROM DONGLE CALL");

        switch( channel.request.extension ){
            case outboundExt:
                await call.outbound(channel);
                break;
            default:
                await call.inbound(channel);
                break;
        }

    }

    export namespace call {

        export async function inbound(channel: AGIChannel) {

            console.log("... INBOUND !");

            let _ = channel.relax;

            /*
    
            channel.request.extension = "1234";
    
            await diagnostics(channel);
    
            if( channel.isHangup ) return;
    
            */

            /*

            let gain = "4000";

            console.log({ gain });

            console.log("AGC, answer after, no play, gain 4000, rx undefined");

            await _.setVariable("AGC(tx)", gain);

            */

            let imei = (await _.getVariable("DONGLEIMEI"))!;

            console.log({ imei });

            let contactsToDial_ = await _.getVariable(`PJSIP_DIAL_CONTACTS(${imei})`);

            console.log({ contactsToDial_ });

            let contactsToDial = (await pjsip.getAvailableEndpointContacts(imei)).map(contact => `PJSIP/${contact}`).join("&");

            if (!contactsToDial) {

                console.log("No contact to dial!");

                return;

            }

            console.log({ contactsToDial });

            await _.exec("Dial", [contactsToDial,"", `b(${context}^${outboundExt}^${1})`]);


            /*
            //With chan_sip
            await _.exec("Dial", [`SIP/${to}`, "10"]);
            */

        }


        export async function outbound(channel: AGIChannel) {

            let _= channel.relax;

            console.log("OUTBOUND !");

            await _.setVariable("JITTERBUFFER(fixed)", "2500,10000");

            await _.setVariable("AGC(rx)", gain);


        }



    }


}




