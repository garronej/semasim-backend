require("rejection-tracker").main(__dirname, "..", "..");

import { DongleExtendedClient, DongleActive } from "chan-dongle-extended-client";
import * as fromSip from "./fromSip";
import * as fromDongle from "./fromDongle";
import * as admin from "./admin";
import * as agi from "./agi";
import * as inbound from "./sipProxy/inbound";

import * as _debug from "debug";
let debug = _debug("_main");

debug("Started !");

//TODO: every call to dongleExtendedClient may throw error.

let scripts: agi.Scripts= {};

let phoneNumberAsteriskExtensionPattern = "_[+0-9].";

scripts[admin.callContext] = {};
scripts[admin.callContext][phoneNumberAsteriskExtensionPattern] = fromSip.call;

scripts[fromDongle.context] = {};
scripts[fromDongle.context][phoneNumberAsteriskExtensionPattern] = fromDongle.call;

agi.startServer(scripts);

const dongleClient = DongleExtendedClient.localhost();

async function onNewActiveDongle(dongle: DongleActive) {

    debug("onNewActiveDongle", dongle);

    await admin.setDevicePresence(dongle.imei, "NOT_INUSE");

    await admin.enableDevicePresenceNotification(dongle.imei);

    let password= dongle.iccid.substring(dongle.iccid.length - 4);

    await admin.dbAsterisk.addOrUpdateEndpoint(dongle.imei, password);

}



(async function findActiveDongle() {

    for (let activeDongle of await dongleClient.getActiveDongles())
        onNewActiveDongle(activeDongle);

})();

dongleClient.evtNewActiveDongle.attach(onNewActiveDongle);

dongleClient.evtActiveDongleDisconnect.attach(async dongle => {

    debug("onDongleDisconnect", dongle);

    await admin.setDevicePresence(dongle.imei, "ONHOLD");

});



admin.getEvtNewContact().attach(contact => {

    debug("New contact", admin.Contact.pretty(contact));

});

(async function initVoidDialplanForMessage() {

    let ami = DongleExtendedClient.localhost().ami;

    let matchAllExt = "_.";

    await ami.dialplanExtensionRemove(matchAllExt, admin.messageContext);

    await ami.dialplanExtensionAdd(admin.messageContext, matchAllExt, 1, "Hangup");


})();

inbound.start();

admin.evtMessage.attach(({ contact, message }) => fromSip.message(contact, message));

dongleClient.evtNewMessage.attach(
    ({ imei, ...message }) => fromDongle.sms(imei, message)
);