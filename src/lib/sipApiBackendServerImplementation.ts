import { SyncEvent } from "ts-events-extended";
import { sipApi, sipLibrary, types as gwTypes } from "../semasim-gateway";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import apiDeclaration = sipApi.backendDeclaration;
import protocol = sipApi.protocol;
import * as sipProxy from "./sipProxy";
import * as db from "./db";
import * as utils from "./utils";
import * as sipApiGateway from "./sipApiGatewayClientImplementation";
import { Session } from "./web";

const handlers: protocol.Server.Handlers = {};
let sanityChecks: protocol.Server.SanityChecks = {};

const server = new protocol.Server(handlers, sanityChecks);

export function startListening(gatewaySocket: sipLibrary.Socket ){

    gatewaySocket.misc["evtNewActiveDongle"]= new SyncEvent();

    server.startListening(gatewaySocket);

}

export function getEvtNewActiveDongle(
    gatewaySocket: sipLibrary.Socket
): SyncEvent<{
    dongle: dcTypes.Dongle.Usable;
    simOwner: Session["auth"] | undefined;
}> {
    return gatewaySocket.misc["evtNewActiveDongle"];
}

(() => {

    const methodName = apiDeclaration.notifySimOnline.methodName;
    type Params = apiDeclaration.notifySimOnline.Params;
    type Response = apiDeclaration.notifySimOnline.Response;

    sanityChecks[methodName] = (params: Params) => (
        params instanceof Object &&
        dcSanityChecks.imsi(params.imsi) && 
        typeof params.storageDigest === "string" &&
        typeof params.password === "string" &&
        params.simDongle instanceof Object &&
        dcSanityChecks.imei(params.simDongle.imei) &&
        (
            params.simDongle.isVoiceEnabled === undefined ||
            typeof params.simDongle.isVoiceEnabled === "boolean"
        ) &&
        typeof params.simDongle.model === "string" &&
        typeof params.simDongle.firmwareVersion === "string"
    );

    handlers[methodName] = async (params: Params, fromSocket): Promise<Response> => {

        let {
            imsi, storageDigest, password, simDongle
        } = params;

        let currentSocket = sipProxy.gatewaySockets.getSimRoute(imsi);

        if (currentSocket) {

            if (currentSocket !== fromSocket) {
                throw new Error("Hacked gateway");
            }

        } else {

            sipProxy.gatewaySockets.setSimRoute(fromSocket, imsi);

        }

        let resp= await db.setSimOnline(
            imsi, password, fromSocket.remoteAddress, simDongle
        );

        let evtNewActiveDongle = getEvtNewActiveDongle(fromSocket);

        if (evtNewActiveDongle.getHandlers().length) {

            (async () => {

                let dongle = (await sipApiGateway.getDongles(fromSocket))
                    .find(dongle => (
                        dcTypes.Dongle.Usable.match(dongle) &&
                        dongle.sim.imsi === imsi
                    )) as dcTypes.Dongle.Usable | undefined;

                if (dongle) {

                    evtNewActiveDongle.post({
                        dongle,
                        "simOwner": resp.isSimRegistered ?
                            (await db.getSimOwner(imsi)) : undefined
                    });

                }

            })();

        }

        if (!resp.isSimRegistered) {

            utils.simPassword.store(fromSocket, imsi, password);

            return { "status": "NOT REGISTERED" };

        }

        if (resp.passwordStatus === "NEED RENEWAL") {

            return {
                "status": "NEED PASSWORD RENEWAL",
                "allowedUas": resp.uasRegisteredToSim
            };

        }

        let isStorageUpToDate: boolean;

        if (resp.storageDigest === storageDigest) {
            isStorageUpToDate= true;
        }else{
            isStorageUpToDate= false;
            //TODO: sync SIM storage
        }

        await utils.sendPushNotification.toUas(
            resp.uasRegisteredToSim,
            ( !isStorageUpToDate || resp.passwordStatus === "RENEWED") ? 
                "RELOAD CONFIG" : undefined
        )

        return { "status": "OK" };

    };

})();


(() => {

    const methodName = apiDeclaration.notifySimOffline.methodName;
    type Params = apiDeclaration.notifySimOffline.Params;
    type Response = apiDeclaration.notifySimOffline.Response;

    sanityChecks[methodName] = (params: Params) => (
        params instanceof Object &&
        dcSanityChecks.imsi(params.imsi)
    );

    handlers[methodName] = async (params: Params, fromSocket): Promise<Response> => {

        let { imsi } = params;

        let currentSocket = sipProxy.gatewaySockets.getSimRoute(imsi);

        if( !currentSocket || currentSocket !== fromSocket ){
            throw new Error("Hacked Client");
        }

        sipProxy.gatewaySockets.removeSimRoute(imsi);

        await db.setSimOffline(imsi);

        return;

    };

})();

//TODO: this should be handled on client connection
(() => {

    const methodName = apiDeclaration.notifyNewOrUpdatedUa.methodName;
    type Params = apiDeclaration.notifyNewOrUpdatedUa.Params;
    type Response = apiDeclaration.notifyNewOrUpdatedUa.Response;

    sanityChecks[methodName] = (params: Params) =>
        gwTypes.misc.sanityChecks.ua(params);

    handlers[methodName] = async (params: Params, fromSocket): Promise<Response> => {

        let ua = params;

        await db.addOrUpdateUa(ua);

        return;

    };

})();

(() => {

    const methodName = apiDeclaration.wakeUpContact.methodName;
    type Params = apiDeclaration.wakeUpContact.Params;
    type Response = apiDeclaration.wakeUpContact.Response;

    sanityChecks[methodName] = (params: Params) => (
        params instanceof Object &&
        gwTypes.misc.sanityChecks.contact(params.contact)
    );

    handlers[methodName] = async (params: Params, fromSocket): Promise<Response> => {

        let { contact } = params;

        switch (contact.uaSim.ua.platform) {
            case "iOS":

                let prReached = utils.qualifyContact(contact);

                let reachableWithoutPush = await Promise.race([
                    new Promise<false>(resolve => setTimeout(() => resolve(false), 750)),
                    prReached
                ]);

                if (reachableWithoutPush) {
                    return "REACHABLE";
                }

                let prIsSendPushSuccess = utils.sendPushNotification(contact.uaSim.ua);

                if (await prReached) {

                    return "REACHABLE";

                } else {

                    return (await prIsSendPushSuccess) ?
                        "PUSH_NOTIFICATION_SENT" : "UNREACHABLE";

                }

            case "android":

                if (await utils.qualifyContact(contact)) {

                    return "REACHABLE";

                } else {

                    return (await utils.sendPushNotification(contact.uaSim.ua)) ?
                        "PUSH_NOTIFICATION_SENT" : "UNREACHABLE";


                }

            case "other":

                return (await utils.qualifyContact(contact)) ?
                    "REACHABLE" : "UNREACHABLE";

        }

    };

})();

(() => {

    const methodName = apiDeclaration.forceContactToReRegister.methodName;
    type Params = apiDeclaration.forceContactToReRegister.Params;
    type Response = apiDeclaration.forceContactToReRegister.Response;

    sanityChecks[methodName] = (params: Params) => (
        params instanceof Object &&
        gwTypes.misc.sanityChecks.contact(params.contact)
    );

    handlers[methodName] = async (params: Params, fromSocket): Promise<Response> => {

        let { contact } = params;

        if (contact.uaSim.ua.platform !== "android") {

            let clientSocket = sipProxy.clientSockets.get(contact.connectionId);

            if (clientSocket) {

                clientSocket.destroy();

            }

        }

        return utils.sendPushNotification(contact.uaSim.ua);

    };

})();
