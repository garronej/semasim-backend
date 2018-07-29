import { apiDeclaration } from "../../../sip_api_declarations/gatewaySockets";
import { types as gwTypes } from "../../../semasim-gateway";
import * as sipLibrary from "ts-sip";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import * as store from "./store";
import * as dbSemasim from "../../dbSemasim";
import * as remoteApi from "./remoteApiCaller";
import * as clientSideSockets_remoteApi from "../clientSideSockets/remoteApiCaller";
import * as pushNotifications from "../../pushNotifications";
import { SyncEvent } from "ts-events-extended";
import * as web from "../../clientSide/web";
import { types as dcTypes } from "chan-dongle-extended-client";

export const handlers: sipLibrary.api.Server.Handlers = {};

/** Will cause the socket to be destroyed */
const abortIfSocketClosed = (fromSocket: sipLibrary.Socket, whileDoingWhat: string) => {

    if (fromSocket.evtClose.postCount !== 0) {

        throw new Error(`Socket has closed while ${whileDoingWhat}`);

    }

};


(() => {

    const methodName = apiDeclaration.notifySimOnline.methodName;
    type Params = apiDeclaration.notifySimOnline.Params;
    type Response = apiDeclaration.notifySimOnline.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            dcSanityChecks.md5(params.storageDigest) &&
            typeof params.password === "string" &&
            params.simDongle instanceof Object &&
            dcSanityChecks.imei(params.simDongle.imei) &&
            (
                params.simDongle.isVoiceEnabled === undefined ||
                typeof params.simDongle.isVoiceEnabled === "boolean"
            ) &&
            typeof params.simDongle.model === "string" &&
            typeof params.simDongle.firmwareVersion === "string"
        ),
        "handler": async (params, fromSocket) => {

            const {
                imsi, storageDigest, password, simDongle
            } = params;


            const currentSocket = store.byImsi.get(imsi);

            if (!!currentSocket) {

                if (currentSocket !== fromSocket) {
                    throw new Error("Hacked gateway");
                }

            } else {

                store.bindToSim(imsi, fromSocket);

                const { rejectedSims } = await clientSideSockets_remoteApi.notifyRouteFor({
                    "sims": [imsi]
                });

                if (!!rejectedSims.length) {

                    store.unbindFromSim(imsi, fromSocket);

                    //NOTE: Will close the socket.
                    throw new Error("Hacked gateway, notify sim online");

                }

                abortIfSocketClosed(fromSocket,"notifying route for sim");

            }

            const resp = await dbSemasim.setSimOnline(
                imsi, password, fromSocket.remoteAddress, simDongle
            );

            abortIfSocketClosed(fromSocket,"setting SIM online");

            const evtUsableDongle = waitForUsableDongle.__waited.get(simDongle.imei);

            if (evtUsableDongle) {

                (async () => {

                    const dongle_password = await remoteApi.getSipPasswordAndDongle(imsi);

                    if (!dongle_password) {
                        return;
                    }

                    evtUsableDongle.post({
                        "dongle": dongle_password.dongle,
                        "simOwner": resp.isSimRegistered ?
                            (await dbSemasim.getSimOwner(imsi)) : undefined
                    });

                })();

            }

            if (!resp.isSimRegistered) {
                return { "status": "NOT REGISTERED" };
            }

            if (resp.passwordStatus === "NEED RENEWAL") {
                return {
                    "status": "NEED PASSWORD RENEWAL",
                    "allowedUas": resp.uasRegisteredToSim
                };
            }

            let wasStorageUpToDate: boolean;

            if (resp.storageDigest === storageDigest) {
                wasStorageUpToDate = true;
            } else {

                wasStorageUpToDate = false;

                const dongle_password = await remoteApi.getSipPasswordAndDongle(imsi);

                abortIfSocketClosed(fromSocket,"getting sim password and dongle");

                if (!dongle_password) {

                    /*
                    Should happen only when the dongle is connected and immediately disconnected
                    The gateway should notify sim offline. 
                    We return here to prevent sending push notifications.
                    */
                    return { "status": "OK" };

                }

                await dbSemasim.updateSimStorage(imsi, dongle_password.dongle.sim.storage);

                abortIfSocketClosed(fromSocket,"updating sim storage");

            }

            await pushNotifications.send(
                resp.uasRegisteredToSim,
                (!wasStorageUpToDate || resp.passwordStatus === "RENEWED") ?
                    "RELOAD CONFIG" : undefined
            );

            abortIfSocketClosed(
                fromSocket,
                `sending push notification to ${resp.uasRegisteredToSim.filter(({ platform }) => platform !== "web").length} devices`
            );

            return { "status": "OK" };

        }
    };

    handlers[methodName] = handler;

})();

export async function waitForUsableDongle(
    imei: string,
    timeout: number
): Promise<waitForUsableDongle.EventData> {

    const evt = new SyncEvent<waitForUsableDongle.EventData>();

    waitForUsableDongle.__waited.set(imei, evt);

    let out: waitForUsableDongle.EventData | Error;

    try {

        out = await evt.waitFor(timeout);

    } catch (error) {

        out = error;

    }

    waitForUsableDongle.__waited.delete(imei);

    if (out instanceof Error) {
        throw out;
    } else {
        return out;
    }

}

export namespace waitForUsableDongle {

    export type EventData = {
        dongle: dcTypes.Dongle.Usable;
        simOwner: web.Auth | undefined;

    };

    export const __waited = new Map<string, SyncEvent<EventData>>();

}

(() => {

    const methodName = apiDeclaration.notifySimOffline.methodName;
    type Params = apiDeclaration.notifySimOffline.Params;
    type Response = apiDeclaration.notifySimOffline.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": async ({ imsi }, fromSocket) => {

            let currentSocket = store.byImsi.get(imsi);

            if (currentSocket !== fromSocket) {
                throw new Error("Hacked Client notify sim offline");
            }

            store.unbindFromSim(imsi, fromSocket);

            clientSideSockets_remoteApi.notifyLostRouteFor({ "sims": [imsi] });

            await dbSemasim.setSimsOffline([imsi]);

            abortIfSocketClosed(fromSocket, "settingSimOffline");

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();


//TODO: this should be handled on client connection, REALLY DO IT.
(() => {

    const methodName = apiDeclaration.notifyNewOrUpdatedUa.methodName;
    type Params = apiDeclaration.notifyNewOrUpdatedUa.Params;
    type Response = apiDeclaration.notifyNewOrUpdatedUa.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params =>
            gwTypes.misc.sanityChecks.ua(params)
        ,
        "handler": async (ua, fromSocket) => {

            await dbSemasim.addOrUpdateUa(ua);

            abortIfSocketClosed(fromSocket, "adding or updating UA");

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.wakeUpContact.methodName;
    type Params = apiDeclaration.wakeUpContact.Params;
    type Response = apiDeclaration.wakeUpContact.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            gwTypes.misc.sanityChecks.contact(params.contact)
        ),
        "handler": async ({ contact }, fromSocket) => {

            switch (contact.uaSim.ua.platform) {
                case "iOS": return await (async () => {

                    const prIsReached = clientSideSockets_remoteApi.qualifyContact(contact);

                    const isReachableWithoutPush = await Promise.race([
                        new Promise<false>(resolve => setTimeout(() => resolve(false), 750)),
                        prIsReached
                    ]);

                    abortIfSocketClosed(fromSocket, "trying to qualify IOS device ( with short timeout )");

                    if (isReachableWithoutPush) {
                        return "REACHABLE";
                    }

                    let prIsSendPushSuccess = pushNotifications.send(contact.uaSim.ua);

                    const isReached = await prIsReached;

                    abortIfSocketClosed(fromSocket, "trying to qualify IOS device");

                    if (isReached) {

                        return "REACHABLE";

                    } else {

                        const isSendPushSuccess = await prIsSendPushSuccess;

                        abortIfSocketClosed(fromSocket, "sending push notification (IOS)");

                        return isSendPushSuccess ? "PUSH_NOTIFICATION_SENT" : "UNREACHABLE";

                    }

                })();
                case "android": return await (async () => {

                    const isReached = await clientSideSockets_remoteApi.qualifyContact(contact);

                    abortIfSocketClosed(fromSocket, "trying to qualify Android device");

                    if (isReached) {

                        return "REACHABLE";

                    } else {

                        const isSendPushSuccess = await pushNotifications.send(contact.uaSim.ua);

                        abortIfSocketClosed(fromSocket, "sending push notification (Android)");

                        return isSendPushSuccess ? "PUSH_NOTIFICATION_SENT" : "UNREACHABLE";

                    }

                })();
                case "web": return await (async () => {

                    const isReached = await clientSideSockets_remoteApi.qualifyContact(contact);

                    abortIfSocketClosed(fromSocket, "trying to qualify Web client");

                    return isReached ? "REACHABLE" : "UNREACHABLE";


                })();
            }

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.forceContactToReRegister.methodName;
    type Params = apiDeclaration.forceContactToReRegister.Params;
    type Response = apiDeclaration.forceContactToReRegister.Response;

    const handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            gwTypes.misc.sanityChecks.contact(params.contact)
        ),
        "handler": async ({ contact }, fromSocket) => {

            if (contact.uaSim.ua.platform !== "android") {

                await clientSideSockets_remoteApi.destroyClientSocket(contact);

                abortIfSocketClosed(fromSocket, `Destroying ${contact.uaSim.ua.platform} socket (forcing contact to re register)`);

            }

            const isSendPushSuccess= pushNotifications.send(contact.uaSim.ua)

            abortIfSocketClosed(fromSocket, `Sending ${contact.uaSim.ua.platform} push notification (forcing to re register)`);

            return isSendPushSuccess;

        }
    };

    handlers[methodName] = handler;

})();
