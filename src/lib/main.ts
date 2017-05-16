require("rejection-tracker").main(__dirname, "..","..");

import { DongleExtendedClient } from "chan-dongle-extended-client";
import * as fromSip from "./fromSip";
import * as fromDongle from "./fromDongle";
import * as pjsip from "./pjsip";
import * as agi from "./agi";


console.log("AGI Server is running");

agi.startServer(async channel => {

    let _ = channel.relax;

    console.log("AGI REQUEST...");

    switch (channel.request.context) {
        case fromDongle.context:
            await fromDongle.call(channel);
            break;
        case fromSip.callContext:
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


(async function findConnectedDonglesAndCreateEndpoints() {

    for (let { imei } of await dongleClient.getActiveDongles())
        await pjsip.addEndpoint(imei);

    for (let { imei } of await dongleClient.getLockedDongles())
        await pjsip.addEndpoint(imei);

})();


dongleClient.evtNewActiveDongle.attach(
    ({ imei }) => { 
        
        pjsip.addEndpoint(imei); 

        //TODO send unsent message for imei


    }
);

//TODO periodically check if message can be sent

dongleClient.evtRequestUnlockCode.attach(
    ({ imei }) => pjsip.addEndpoint(imei)
);


pjsip.getEvtNewContact().attach( ({endpoint, contact }) => {

    //TODO Send initialization information.

    console.log("New contact", { endpoint, contact });

});


pjsip.getEvtPacketSipMessage().attach( sipPacket => fromSip.message(sipPacket) );

