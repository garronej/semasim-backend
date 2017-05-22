"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./dbInterface"));
__export(require("./endpointsContacts"));
__export(require("./message"));
__export(require("./presence"));
//pjsip.getContacts().then(contacts => console.log(JSON.stringify(contacts, null, 2)));
/*
DongleExtendedClient.localhost().ami.evt.attach(managerEvt => {
    if (managerEvt.event === "UserEvent") return;

    console.log({ managerEvt });
});
*/
/*
DongleExtendedClient.localhost().ami.evt.attach(
    managerEvt => managerEvt.event === "ContactStatus",
    contactStatus => console.log({ contactStatus })
);
*/
/*
DongleExtendedClient.localhost().ami.evt.attach(
    managerEvt => managerEvt.event === "PeerStatus",
    peerStatusEvt => console.log( { peerStatusEvt })
);


DongleExtendedClient.localhost().ami.evt.attach(
    managerEvt => managerEvt.event === "DeviceStateChange",
    deviceStatusEvt => console.log( { deviceStatusEvt })
);
*/
/*

DongleExtendedClient.localhost().ami.evt.attach(
    managerEvt => managerEvt.event === "ChallengeSent",
    async challengeSendEvt => {

        try {

            await DongleExtendedClient.localhost().ami.evt.waitFor(
                managerEvt => (
                    managerEvt.event === "SuccessfulAuth" &&
                    challengeSendEvt.sessionid === managerEvt.sessionid
                ),
                500
            );

            console.log(`${challengeSendEvt.accountid} successfully authenticated`);

        } catch (timeoutError) {

            console.log(`${challengeSendEvt.accountid} authentication failed`);
        }


    }
);

*/
//# sourceMappingURL=index.js.map