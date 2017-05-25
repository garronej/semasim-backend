require("rejection-tracker").main(__dirname, "..","..");

import { DongleExtendedClient } from "chan-dongle-extended-client";
import * as fromSip from "./fromSip";
import * as fromDongle from "./fromDongle";
import * as pjsip from "./pjsip";
import * as agi from "./agi";

//TODO periodically check if message can be sent

console.log("Started");

agi.startServer(async channel => {

    console.log("AGI REQUEST...");

    switch (channel.request.context) {
        case fromDongle.context:
            await fromDongle.call(channel);
            break;
        case fromSip.callContext(channel.request.callerid):
            await fromSip.call(channel);
            break;
    }

    console.log("AGI Script Terminated");

});

const dongleClient = DongleExtendedClient.localhost();

dongleClient.evtNewMessage.attach(
    ({ imei, ...message }) => fromDongle.sms(imei, message)
);

dongleClient.evtMessageStatusReport.attach(
    ({ imei, ...statusReport }) => fromDongle.statusReport(imei, statusReport)
);

let dongleEvtHandlers = {
    "onDongleDisconnect": async (imei: string) => {

        console.log("onDongleDisconnect", { imei });

        await pjsip.setPresence(imei, "ONHOLD");

    },
    "onNewActiveDongle": async (imei: string) => {

        console.log("onNewActiveDongle");

        await pjsip.setPresence(imei, "NOT_INUSE");

        await initEndpoint(imei);


    },
    "onRequestUnlockCode": async (imei: string) => {

        console.log("onRequestUnlockCode");

        await pjsip.setPresence(imei, "UNAVAILABLE");

        await initEndpoint(imei);

    }
};

async function initEndpoint(endpoint: string) {

    await agi.initPjsipSideDialplan(endpoint);
    await pjsip.addOrUpdateEndpoint(endpoint);

}


(async function findConnectedDongles() {


    let activeDongles= (await dongleClient.getActiveDongles()).map(({imei})=> imei);

    let lockedDongles= (await dongleClient.getLockedDongles()).map(({imei})=> imei);

    let disconnectedDongles= (await pjsip.queryEndpoints()).filter( imei => 
        [ ...activeDongles, ...lockedDongles ].indexOf(imei) < 0
    );

    for( let imei of activeDongles ) dongleEvtHandlers.onNewActiveDongle(imei);

    for( let imei of lockedDongles ) dongleEvtHandlers.onRequestUnlockCode(imei);

    for( let imei of disconnectedDongles ) initEndpoint(imei);

    console.log( { activeDongles, lockedDongles, disconnectedDongles });


})();

dongleClient.evtDongleDisconnect.attach(({ imei }) => dongleEvtHandlers.onDongleDisconnect(imei));
dongleClient.evtNewActiveDongle.attach(({ imei }) => dongleEvtHandlers.onNewActiveDongle(imei));
dongleClient.evtRequestUnlockCode.attach(({ imei }) => dongleEvtHandlers.onRequestUnlockCode(imei));



pjsip.getEvtNewContact().attach(({ endpoint, contact }) => {

    //TODO Send initialization information.

    console.log("New contact", { endpoint, contact });

});


pjsip.getEvtPacketSipMessage().attach(sipPacket => fromSip.message(sipPacket));


(async function test() {

    await new Promise<void>(resolve => setTimeout(resolve, 1000));


    let res: any;

    let ami = DongleExtendedClient.localhost().ami;



    // UNKNOWN | NOT_INUSE | INUSE | BUSY | INVALID | UNAVAILABLE | RINGING | RINGINUSE | ONHOLD

    let state = "NOT_INUSE";

    console.log({ state });

    res = await ami.postAction({
        "action": "SetVar",
        "variable": "DEVICE_STATE(Custom:bob)",
        "value": state
    });

    console.log(res.message);

    res = await ami.postAction({
        "action": "GetVar",
        "variable": "DEVICE_STATE(Custom:bob)"
    });

    console.log({ res });


    //not_set | unavailable | available | away | xa | chat | dnd

    let presence = "available,value subtype,value message";

    console.log({ presence });

    res = await ami.postAction({
        "action": "SetVar",
        "variable": "PRESENCE_STATE(CustomPresence:bob)",
        "value": presence
    });

    console.log(res.message);

    res = await ami.postAction({
        "action": "GetVar",
        "variable": "PRESENCE_STATE(CustomPresence:bob,value)"
    });

    console.log({ res });

    res = await ami.postAction({
        "action": "GetVar",
        "variable": "PRESENCE_STATE(CustomPresence:bob,subtype)"
    });

    console.log({ res });

    res = await ami.postAction({
        "action": "GetVar",
        "variable": "PRESENCE_STATE(CustomPresence:bob,message)"
    });

    console.log({ res });


});


(async function test2() {

    await new Promise<void>(resolve => setTimeout(resolve, 1000));


    let res: any;

    let ami = DongleExtendedClient.localhost().ami;


    res = await ami.postAction({
        "action": "GetVar",
        "variable": "DEVICE_STATE(PJSIP/358880032664586)"

    });

    console.log({ res });


    res = await ami.postAction({
        "action": "GetVar",
        "variable": "PRESENCE_STATE(PJSIP/358880032664586,value)"
    });

    console.log({ res });


    res = await ami.postAction({
        "action": "GetVar",
        "variable": "PRESENCE_STATE(PJSIP/358880032664586,subtype)"
    });

    console.log({ res });


    res = await ami.postAction({
        "action": "GetVar",
        "variable": "PRESENCE_STATE(PJSIP/358880032664586,message)"
    });

    console.log({ res });



});


