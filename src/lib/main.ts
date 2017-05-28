require("rejection-tracker").main(__dirname, "..", "..");

import { DongleExtendedClient } from "chan-dongle-extended-client";
import * as fromSip from "./fromSip";
import * as fromDongle from "./fromDongle";
import * as pjsip from "./pjsip";
import * as agi from "./agi";

import * as _debug from "debug";
let debug = _debug("_main");

//TODO periodically check if message can be sent


debug("Started!");


let scripts: agi.Scripts= {};

let phoneNumberAsteriskExtensionPattern= "_[+0-9].";

scripts[pjsip.callContext]= {};
scripts[pjsip.callContext][phoneNumberAsteriskExtensionPattern]= fromSip.call;

scripts[fromDongle.context]= {};
scripts[fromDongle.context][phoneNumberAsteriskExtensionPattern]= fromDongle.call;

agi.startServer(scripts);


const dongleClient = DongleExtendedClient.localhost();

dongleClient.evtNewMessage.attach(
    ({ imei, ...message }) => fromDongle.sms(imei, message)
);

dongleClient.evtMessageStatusReport.attach(
    ({ imei, ...statusReport }) => fromDongle.statusReport(imei, statusReport)
);

let dongleEvtHandlers = {
    "onDongleDisconnect": async (imei: string) => {

        debug("onDongleDisconnect", { imei });

        await pjsip.setDevicePresence(imei, "ONHOLD");

    },
    "onNewActiveDongle": async (imei: string) => {

        debug("onNewActiveDongle");

        await pjsip.setDevicePresence(imei, "NOT_INUSE");

        await initEndpoint(imei);


    },
    "onRequestUnlockCode": async (imei: string) => {

        debug("onRequestUnlockCode");

        await pjsip.setDevicePresence(imei, "UNAVAILABLE");

        await initEndpoint(imei);

    }
};

async function initEndpoint(endpoint: string) {

    await pjsip.enableDevicePresenceNotification(endpoint);
    await pjsip.addOrUpdateEndpoint(endpoint);

}


(async function findConnectedDongles() {


    let activeDongles = (await dongleClient.getActiveDongles()).map(({ imei }) => imei);

    let lockedDongles = (await dongleClient.getLockedDongles()).map(({ imei }) => imei);

    let disconnectedDongles = (await pjsip.queryEndpoints()).filter(imei =>
        [...activeDongles, ...lockedDongles].indexOf(imei) < 0
    );

    debug({ activeDongles, lockedDongles, disconnectedDongles });

    for (let imei of activeDongles) dongleEvtHandlers.onNewActiveDongle(imei);

    for (let imei of lockedDongles) dongleEvtHandlers.onRequestUnlockCode(imei);

    for (let imei of disconnectedDongles) initEndpoint(imei);



})();

dongleClient.evtDongleDisconnect.attach(({ imei }) => dongleEvtHandlers.onDongleDisconnect(imei));
dongleClient.evtNewActiveDongle.attach(({ imei }) => dongleEvtHandlers.onNewActiveDongle(imei));
dongleClient.evtRequestUnlockCode.attach(({ imei }) => dongleEvtHandlers.onRequestUnlockCode(imei));



pjsip.getEvtNewContact().attach(({ endpoint, contact }) => {

    //TODO Send initialization information.

    debug("New contact", { endpoint, contact });

});


//TODO: Include contact information in the packet
pjsip.getEvtPacketSipMessage().attach(sipPacket => fromSip.message(sipPacket));
