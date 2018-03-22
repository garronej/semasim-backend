import {declarationGatewaySocketApi as apiDeclaration} from "../../../../semasim-gateway";
import { sipLibrary, types as gwTypes } from "../../../../semasim-gateway";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import * as store from "./store";
import * as dbSemasim from "../../../dbSemasim";
import * as remoteApi from "./remoteApiCaller";
import * as clientSideSockets from "../clientSideSockets/index_sipProxy";
import * as pushNotifications from "../../../pushNotifications";

export const handlers: sipLibrary.api.Server.Handlers = {};

(() => {

    const methodName = apiDeclaration.notifySimOnline.methodName;
    type Params = apiDeclaration.notifySimOnline.Params;
    type Response = apiDeclaration.notifySimOnline.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
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
        ),
        "handler": async (params, fromSocket) => {

            let {
                imsi, storageDigest, password, simDongle
            } = params;

            let currentSocket= store.byImsi.get(imsi);

            if (currentSocket) {

                if (currentSocket !== fromSocket) {
                    throw new Error("Hacked gateway");
                }

            } else {

                let { rejectedSims } =await clientSideSockets.remoteApi.notifyRouteFor({ 
                    "sims": [ imsi ] 
                });

                if( !!rejectedSims.length ){
                    throw new Error("Hacked gateway");
                }

                store.bindToSim(imsi, fromSocket);

            }

            let resp = await dbSemasim.setSimOnline(
                imsi, password, fromSocket.remoteAddress, simDongle
            );

            let evtUsableDongle = remoteApi.waitForUsableDongle.__waited.get(simDongle.imei);

            if (evtUsableDongle) {

                (async () => {

                    let found = await remoteApi.getSipPasswordAndDongle(imsi);

                    if (!found) {
                        return;
                    }

                    evtUsableDongle.post({
                        "dongle": found.dongle,
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

            let isStorageUpToDate: boolean;

            if (resp.storageDigest === storageDigest) {
                isStorageUpToDate = true;
            } else {
                isStorageUpToDate = false;
                //TODO: sync SIM storage
            }

            await pushNotifications.send(
                resp.uasRegisteredToSim,
                (!isStorageUpToDate || resp.passwordStatus === "RENEWED") ?
                    "RELOAD CONFIG" : undefined
            );

            return { "status": "OK" };

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.notifySimOffline.methodName;
    type Params = apiDeclaration.notifySimOffline.Params;
    type Response = apiDeclaration.notifySimOffline.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": async ({ imsi }, fromSocket) => {

            let currentSocket= store.byImsi.get(imsi);

            if ( currentSocket !== fromSocket) {
                throw new Error("Hacked Client");
            }

            store.unbindFromSim(imsi, fromSocket);

            clientSideSockets.remoteApi.notifyLostRouteFor({ "sims": [ imsi ] });

            await dbSemasim.setSimOffline(imsi);

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();


//TODO: this should be handled on client connection
(() => {

    const methodName = apiDeclaration.notifyNewOrUpdatedUa.methodName;
    type Params = apiDeclaration.notifyNewOrUpdatedUa.Params;
    type Response = apiDeclaration.notifyNewOrUpdatedUa.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => 
            gwTypes.misc.sanityChecks.ua(params)
        ,
        "handler": async ua => {

            await dbSemasim.addOrUpdateUa(ua);

            return undefined;

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.wakeUpContact.methodName;
    type Params = apiDeclaration.wakeUpContact.Params;
    type Response = apiDeclaration.wakeUpContact.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            gwTypes.misc.sanityChecks.contact(params.contact)
        ),
        "handler": async ({ contact }) => {

            switch (contact.uaSim.ua.platform) {
                case "iOS":

                    let prReached= clientSideSockets.remoteApi.qualifyContact(contact);

                    let reachableWithoutPush = await Promise.race([
                        new Promise<false>(resolve => setTimeout(() => resolve(false), 750)),
                        prReached
                    ]);

                    if (reachableWithoutPush) {
                        return "REACHABLE";
                    }

                    let prIsSendPushSuccess = pushNotifications.send(contact.uaSim.ua);

                    if (await prReached) {

                        return "REACHABLE";

                    } else {

                        return (await prIsSendPushSuccess) ?
                            "PUSH_NOTIFICATION_SENT" : "UNREACHABLE";

                    }

                case "android":

                    if (await clientSideSockets.remoteApi.qualifyContact(contact)) {

                        return "REACHABLE";

                    } else {

                        return (await pushNotifications.send(contact.uaSim.ua)) ?
                            "PUSH_NOTIFICATION_SENT" : "UNREACHABLE";

                    }

                case "other":

                    return (await clientSideSockets.remoteApi.qualifyContact(contact)) ?
                        "REACHABLE" : "UNREACHABLE";

            }

        }
    };

    handlers[methodName] = handler;

})();

(() => {

    const methodName = apiDeclaration.forceContactToReRegister.methodName;
    type Params = apiDeclaration.forceContactToReRegister.Params;
    type Response = apiDeclaration.forceContactToReRegister.Response;

    let handler: sipLibrary.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            gwTypes.misc.sanityChecks.contact(params.contact)
        ),
        "handler": async ({ contact }) => {

            if (contact.uaSim.ua.platform !== "android") {

                await clientSideSockets.remoteApi.destroyClientSocket(contact);

            }

            return pushNotifications.send(contact.uaSim.ua)

        }
    };

    handlers[methodName] = handler;


})();
