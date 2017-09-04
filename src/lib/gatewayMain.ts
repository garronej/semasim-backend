require("rejection-tracker").main(__dirname, "..", "..");

import { SyncEvent } from "ts-events-extended";
import * as runExclusive from "run-exclusive";
import { DongleExtendedClient, DongleActive } from "chan-dongle-extended-client";
import * as agi from "../tools/agiClient";
import { 
    wakeUpContact, 
    WakeUpContactTracer, 
    wakeUpAllContacts, 
    getEvtNewContact, 
    getEvtExpiredContact,
    Contact 
} from "./sipContacts";
import * as backendSipApi from "./backendSipApi";
import * as db from "./dbInterface";
import * as gatewaySipProxy from "./gatewaySipProxy";
import * as sipInstantMessaging from "./sipInstantMessaging";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_gatewayMain");

debug("Starting semasim gateway !");

let scripts: agi.Scripts= {};

scripts[c.sipCallContext] = {};
scripts[c.sipCallContext][c.phoneNumber] = async (channel: agi.AGIChannel)=> {

    let _ = channel.relax;

    debug("FROM SIP CALL!");

    let imei = channel.request.callerid;

    await _.setVariable(`JITTERBUFFER(${c.jitterBuffer.type})`, c.jitterBuffer.params);

    await _.setVariable("AGC(rx)", c.gain);

    await _.exec("Dial", [`Dongle/i:${imei}/${channel.request.extension}`]);

    //TODO: Increase volume on TX

    debug("call terminated");

};


scripts[c.dongleCallContext] = {};
scripts[c.dongleCallContext][c.phoneNumber] = async (channel: agi.AGIChannel)=> { 

    debug(`Call from ${channel.request.callerid} !`);

    let _ = channel.relax;

    let imei = (await _.getVariable("DONGLEIMEI"))!;

    let wakeUpAllContactsPromise= wakeUpAllContacts(imei, 9000);

    let name = await DongleExtendedClient.localhost().getContactName(imei, channel.request.callerid);

    //await _.setVariable("CALLERID(name-charset)", "utf8");
    await _.setVariable("CALLERID(name)", name || "");

    let dialString = (await wakeUpAllContactsPromise)
    .reachableContacts
    .map(({ uri }) => `PJSIP/${imei}/${uri}`).join("&");

    debug({ dialString });

    if (!dialString) {

        debug("No contact to dial!");

        return;

    }

    debug("Dialing...");

    let failure= await agi.dialAndGetOutboundChannel(
        channel,
        dialString,
        async (outboundChannel) => {

            let _ = outboundChannel.relax;

            await _.setVariable(`JITTERBUFFER(${c.jitterBuffer.type})`, c.jitterBuffer.params);

            await _.setVariable("AGC(rx)", c.gain);

            //TODO: Increase volume on TX

        }
    );

    if( failure ){

        debug("TODO: send 'this contact tried to reach you without leaving a message");

    }


    debug("Call ended");

}

agi.startServer(scripts);

const dongleClient = DongleExtendedClient.localhost();

async function onNewActiveDongle(dongle: DongleActive) {

    debug("onNewActiveDongle", dongle);

    await db.semasim.addDongleAndSim(dongle.imei, dongle.iccid);

    let password= dongle.iccid.substring(dongle.iccid.length - 4);

    await db.asterisk.addOrUpdateEndpoint(dongle.imei, password);

    sendDonglePendingMessages(dongle.imei);

}



(async function findActiveDongleAndStartSipProxy() {

    for (let activeDongle of await dongleClient.getActiveDongles())
        await onNewActiveDongle(activeDongle);

    gatewaySipProxy.start();

})();

dongleClient.evtNewActiveDongle.attach(async dongle=> {

    await onNewActiveDongle(dongle);

    backendSipApi.claimDongle.run(dongle.imei);

});

dongleClient.evtActiveDongleDisconnect.attach(async dongle => {

    debug("onDongleDisconnect", dongle);

});



getEvtNewContact().attach(async contact => {

    //debug("New contact", Contact.pretty(contact));
    debug("New contact", Contact.readInstanceId(contact));

    let isNew= await db.semasim.addUaInstance(Contact.buildUaInstancePk(contact))

    if( isNew ){

        debug("TODO: it's a new UA, send initialization messages");

    }

    senPendingSipMessagesToReachableContact(contact);


});

getEvtExpiredContact().attach(async contactUri => {

    debug("Expired contact: ", contactUri);

    await backendSipApi.wakeUpUserAgent.run(contactUri);

});



sipInstantMessaging.start();

const sendDonglePendingMessages = runExclusive.build(
    async (imei: string) => {

        let messages = await db.semasim.getUnsentMessageOfDongleSim(imei);

        for (let { pk, sender, to_number, text } of messages) {

            let sentMessageId: number;

            try {

                sentMessageId = await dongleClient.sendMessage(imei, to_number, text);

                if (isNaN(sentMessageId)) throw new Error("Send message failed");

            } catch (error) {

                debug(`Error sending message: ${error.message}`);

                continue;

            }

            await db.semasim.setMessageToGsmSentId(pk, sentMessageId);

            await db.semasim.addMessageTowardSip(
                to_number, 
                `---Message send, sentMessageId: ${sentMessageId}---`, 
                new Date(), 
                { "uaInstance": sender }
            );

            notifyNewSipMessagesToSend();

        }

    }
);

const senPendingSipMessagesToReachableContact = runExclusive.build(
    async (contact: Contact) => {

        let messages = await db.semasim.getUndeliveredMessagesOfUaInstance(
            Contact.buildUaInstancePk(contact)
        );

        for (let message of messages) {

            debug(`Sending: ${JSON.stringify(message.text)} from ${message.from_number}`);

            let received: boolean;

            try {

                received = await sipInstantMessaging.sendMessage(
                    contact, 
                    message.from_number, 
                    {}, 
                    message.text
                );

            } catch (error) {
                debug("error:", error.message);
                break;
            }

            if (!received) {
                debug("Not, received, break!");
                break;
            }

            await db.semasim.setMessageTowardSipDelivered(Contact.buildUaInstancePk(contact), message.creation_timestamp);

        }

    }
);


async function notifyNewSipMessagesToSend() {

    (await db.asterisk.queryContacts()).forEach(async contact => {

        let messages = await db.semasim.getUndeliveredMessagesOfUaInstance(
            Contact.buildUaInstancePk(contact)
        );

        if (!messages.length) return;

        try {

            let evtTracer: WakeUpContactTracer= new SyncEvent();

            wakeUpContact(contact, 0, evtTracer);

            let status= await evtTracer.waitFor();

            if( status !== "REACHABLE" ) return; 

            await senPendingSipMessagesToReachableContact(contact);

        } catch (error) { return; }

    });

}


sipInstantMessaging.evtMessage.attach(
    async ({ fromContact, toNumber, text }) => {

        debug("FROM SIP MESSAGE", { toNumber, text });

        await db.semasim.addMessageTowardGsm(
            toNumber, 
            text, 
            Contact.buildUaInstancePk(fromContact)
        );

        sendDonglePendingMessages(fromContact.endpoint);

    }
);

dongleClient.evtNewMessage.attach(
    async ({ imei, number, text, date }) => {

        debug("FROM DONGLE MESSAGE", { text });

        await db.semasim.addMessageTowardSip(
            number, 
            text, 
            date, 
            { "allUaInstanceOfImei": imei }
        );

        notifyNewSipMessagesToSend();

    }
);

dongleClient.evtMessageStatusReport.attach(
    async ({ imei, messageId, isDelivered, dischargeTime, recipient, status }) => {

        debug("FROM DONGLE STATUS REPORT", status);

        let resp = await db.semasim.getSenderAndTextOfSentMessageToGsm(imei, messageId);

        if (!resp) return;

        let { sender, text } = resp;

        await db.semasim.addMessageTowardSip(
            recipient, 
            `---STATUS REPORT FOR MESSAGE ID ${messageId}: ${status}---`, 
            dischargeTime, 
            { "uaInstance": sender }
        );

        await db.semasim.addMessageTowardSip(
            recipient, 
            `YOU:\n${text}`, 
            new Date(dischargeTime.getTime() + 1), 
            { "allUaInstanceOfEndpointOtherThan": sender }
        );

        notifyNewSipMessagesToSend();

    }
);
