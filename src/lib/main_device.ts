require("rejection-tracker").main(__dirname, "..", "..");

import { DongleExtendedClient, DongleActive } from "chan-dongle-extended-client";
import { SyncEvent } from "ts-events-extended";
import * as runExclusive from "run-exclusive";
import * as agi from "./agi";
import { wakeUpContact, WakeUpContactTracer, wakeUpAllContacts, getEvtNewContact, Contact } from "./endpointsContacts";
import * as db from "./dbInterface";
import * as inboundSipProxy from "./inboundSipProxy";
import * as sipMessages from "./sipMessages";

import * as c from "./constants";

import * as _debug from "debug";
let debug = _debug("_main");

debug("Started !");

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

    await sendDonglePendingMessages(dongle.imei);

}



(async function findActiveDongle() {

    for (let activeDongle of await dongleClient.getActiveDongles())
        onNewActiveDongle(activeDongle);

})();

dongleClient.evtNewActiveDongle.attach(onNewActiveDongle);

dongleClient.evtActiveDongleDisconnect.attach(async dongle => {

    //TODO send message to clients to inform
    debug("onDongleDisconnect", dongle);

});



getEvtNewContact().attach(async contact => {

    debug("New contact", Contact.pretty(contact));

    await db.semasim.addUaInstance(Contact.buildUaInstancePk(contact))

    senPendingSipMessagesToReachableContact(contact);

});


inboundSipProxy.start();

sipMessages.start();

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

            await db.semasim.addMessageTowardSip(to_number, "---Message Sent---", new Date(), { "uaInstance": sender });

            sendSipPendingMessages();

        }

    }
);

const senPendingSipMessagesToReachableContact = runExclusive.build(
    async (contact: Contact) => {

        let messages = await db.semasim.getUndeliveredMessagesOfUaInstance(
            Contact.buildUaInstancePk(contact)
        );

        for (let message of messages) {

            //DODO: the dongle can be disconnected and create unnecessary delay
            //let name = await dongleClient.getContactName(contact.endpoint, message.from_number);
            let name = undefined;

            let received: boolean;

            try {

                received = await sipMessages.sendMessage(contact, message.from_number, {}, message.text, name);

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


async function sendSipPendingMessages() {

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


sipMessages.evtMessage.attach(async ({ fromContact, toNumber, text }) => {

    debug("FROM SIP MESSAGE", { toNumber, text });

    let uaInstancePk = Contact.buildUaInstancePk(fromContact);

    await db.semasim.addMessageTowardGsm(toNumber, text, uaInstancePk);

    sendDonglePendingMessages(fromContact.endpoint);

});

dongleClient.evtNewMessage.attach(async ({ imei, number, text, date }) => {

    debug("FROM DONGLE MESSAGE");

    await db.semasim.addMessageTowardSip(number, text, date, { "allUaInstanceOfImei": imei });

    sendSipPendingMessages();

});

dongleClient.evtMessageStatusReport.attach(async ({ imei, messageId, isDelivered, dischargeTime, recipient, status }) => {

    let resp = await db.semasim.getSenderAndTextOfSentMessageToGsm(imei, messageId);

    if (!resp) return;

    let { sender, text } = resp;

    await db.semasim.addMessageTowardSip(recipient, `---${status}---`, dischargeTime, { "uaInstance": sender });
    await db.semasim.addMessageTowardSip(recipient, `YOU:\n${text}`, dischargeTime, { "allUaInstanceOfEndpointOtherThan": sender });

    sendSipPendingMessages();

});
