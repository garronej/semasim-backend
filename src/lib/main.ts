require("rejection-tracker").main(__dirname, "..", "..");

import { DongleExtendedClient } from "chan-dongle-extended-client";
import * as fromSip from "./fromSip";
import * as fromDongle from "./fromDongle";
import * as pjsip from "./pjsip";
import * as agi from "./agi";
import * as inbound from "./sipProxy/inbound";

import * as _debug from "debug";
let debug = _debug("_main");


debug("Started !!");

//TODO: every call to dongleExtendedClient may throw error.


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


let dongleEvtHandlers = {
    "onActiveDongleDisconnect": async (imei: string) => {

        debug("onDongleDisconnect", { imei });

        await pjsip.setDevicePresence(imei, "ONHOLD");

    },
    "onNewActiveDongle": async (imei: string) => {

        debug("onNewActiveDongle");

        await pjsip.setDevicePresence(imei, "NOT_INUSE");

        await initEndpoint(imei, true);


    },
    "onRequestUnlockCode": async (imei: string) => {

        debug("onRequestUnlockCode");

        await pjsip.setDevicePresence(imei, "UNAVAILABLE");

        await initEndpoint(imei, true);

    }
};

async function initEndpoint(endpoint: string, isDongleConnected: boolean) {

    await pjsip.enableDevicePresenceNotification(endpoint);
    await pjsip.addOrUpdateEndpoint(endpoint, isDongleConnected);

}


(async function findConnectedDongles() {


    let activeDongles = (await dongleClient.getActiveDongles()).map(({ imei }) => imei);

    let lockedDongles = (await dongleClient.getLockedDongles()).map(({ imei }) => imei);

    let knownDisconnectedDongles = (await pjsip.queryEndpoints())
    .map(({endpoint})=> endpoint)
    .filter(imei =>
        [...activeDongles, ...lockedDongles].indexOf(imei) < 0
    );

    debug({ activeDongles, lockedDongles, knownDisconnectedDongles });

    for (let imei of activeDongles) dongleEvtHandlers.onNewActiveDongle(imei);

    for (let imei of lockedDongles) dongleEvtHandlers.onRequestUnlockCode(imei);

    for (let imei of knownDisconnectedDongles) initEndpoint(imei, false);



})();

dongleClient.evtActiveDongleDisconnect.attach(({ imei }) => dongleEvtHandlers.onActiveDongleDisconnect(imei));
dongleClient.evtNewActiveDongle.attach(({ imei }) => dongleEvtHandlers.onNewActiveDongle(imei));
dongleClient.evtRequestUnlockCode.attach(({ imei }) => dongleEvtHandlers.onRequestUnlockCode(imei));

pjsip.getEvtNewContact().attach( contact => {

    //TODO Send initialization information.

    debug("New contact", contact );

});


(async function initVoidDialplanForMessage() {

    let ami = DongleExtendedClient.localhost().ami;

    let matchAllExt = "_.";

    await ami.dialplanExtensionRemove(matchAllExt, pjsip.messageContext);

    await ami.dialplanExtensionAdd(pjsip.messageContext, matchAllExt, 1, "Hangup");


})();

pjsip.truncateContacts().then( ()=> inbound.start() );
//pjsip.truncateContacts();


inbound.evtIncomingMessage.attach(({ contact, message }) => fromSip.message(contact, message));
