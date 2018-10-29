"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const gateway_1 = require("../../gateway");
const dcSanityChecks = require("chan-dongle-extended-client/dist/lib/sanityChecks");
const dbSemasim = require("../dbSemasim");
const pushNotifications = require("../pushNotifications");
const backendToGateway_1 = require("../../sip_api_declarations/backendToGateway");
const backendConnections = require("../toBackend/connections");
const gatewayConnections = require("../toGateway/connections");
const uaRemoteApiCaller = require("../toUa/remoteApiCaller");
const remoteApiCaller = require("./remoteApiCaller");
const backendRemoteApiCaller = require("../toBackend/remoteApiCaller");
const logger = require("logger");
const debug = logger.debugFactory();
exports.handlers = {};
{
    const methodName = backendToGateway_1.apiDeclaration.notifySimOnline.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            dcSanityChecks.md5(params.storageDigest) &&
            typeof params.password === "string" &&
            typeof params.replacementPassword === "string" &&
            params.simDongle instanceof Object &&
            dcSanityChecks.imei(params.simDongle.imei) &&
            (params.simDongle.isVoiceEnabled === undefined ||
                typeof params.simDongle.isVoiceEnabled === "boolean") &&
            typeof params.simDongle.model === "string" &&
            typeof params.simDongle.firmwareVersion === "string"),
        "handler": (params, fromSocket) => __awaiter(this, void 0, void 0, function* () {
            const { imsi, storageDigest, password, replacementPassword, simDongle } = params;
            {
                /*
                In this block is enforced a security rule:

                A sim card can only be at one place at the time.
                If a gateway declare that it is the route for a sim
                altho we already have an other gateway that have
                made the same claim we can assume that at least one
                of them is lying.

                As we don't have a solution to check that a gateway
                have indeed access to a given sim we chose to trust
                the fist gateway that declare holding a sim and
                reject every other as long as the socket connection
                to the fist gateway is open.

                It is not a perfect solution as an attacker could
                create a fake connection claiming to be the route
                for a given sim and doing so he would provide the
                sim from going online.

                NOTE: If we receive this call from a connection
                that already is the route for the sim it is not
                a bug nor an attack, it is triggered by reNotifySimOnline
                in order to make a gateway renew the SIP password
                when a user is no longer allowed to use a given sim.

                NOTE: A socket connection can be closed on the
                gateway and take some time to be detected as closed
                on the server. ( TODO: test by unplugging network cable)
                Thanks to the ts-sip keep alive mechanism we are sure
                that a dead connection will not remain open forever
                but the PING is only sent periodically.
                As a consequence a gateway could disconnect then reconnect
                some second after an be rejected by the server
                because it still consider the old connection as active.
                This is not too much of an issue as the gateway will
                re attempt to connect periodically and the server will
                eventually close the old connection but it could take some
                time depending on the keep alive interval set.
                */
                //TODO: see what happen with imei.
                const socket = gatewayConnections.getBindedToImsi(imsi);
                if ((!!socket && socket !== fromSocket) ||
                    !!backendConnections.getBindedToImsi(imsi)) {
                    throw new Error("Attack detected");
                }
            }
            //TODO: not very pretty, we evaluated that already...
            if (gatewayConnections.getBindedToImsi(imsi) !== fromSocket) {
                gatewayConnections.bindToImsi(imsi, fromSocket);
            }
            const dbResp = yield dbSemasim.setSimOnline(imsi, password, replacementPassword, fromSocket.remoteAddress, simDongle);
            (() => __awaiter(this, void 0, void 0, function* () {
                if (!dbResp.isSimRegistered) {
                    gatewayConnections.addImei(fromSocket, simDongle.imei);
                    const dongle = yield remoteApiCaller.getDongle(simDongle.imei, fromSocket);
                    if (!dongle) {
                        return;
                    }
                    uaRemoteApiCaller.notifyDongleOnLan(dongle, fromSocket.remoteAddress);
                }
                else {
                    let hasInternalSimStorageChanged = dbResp.storageDigest !== storageDigest;
                    if (hasInternalSimStorageChanged) {
                        hasInternalSimStorageChanged = false;
                        const dongle = (yield remoteApiCaller.getDongle(simDongle.imei, fromSocket));
                        if (!dongle) {
                            /*
                            Can happen only when the dongle is connected and immediately disconnected
                            The gateway should notify sim offline.
                            We return here to prevent sending push notifications.
                            */
                            return;
                        }
                        yield dbSemasim.updateSimStorage(imsi, dongle.sim.storage);
                    }
                    pushNotifications.send(dbResp.uasRegisteredToSim.filter(({ platform }) => platform !== "web"), (hasInternalSimStorageChanged || dbResp.passwordStatus !== "UNCHANGED") ?
                        { "type": "RELOAD CONFIG" } :
                        { "type": "SIM CONNECTIVITY", "isOnline": "1", imsi });
                    uaRemoteApiCaller.notifySimOnline({
                        imsi,
                        hasInternalSimStorageChanged,
                        "password": (() => {
                            switch (dbResp.passwordStatus) {
                                case "UNCHANGED":
                                case "WAS DIFFERENT": return password;
                                case "PASSWORD REPLACED": return replacementPassword;
                            }
                            ;
                        })(),
                        "simDongle": simDongle,
                        "gatewayLocation": dbResp.gatewayLocation
                    }, dbResp.uasRegisteredToSim);
                }
            }))().catch(error => {
                debug(error);
                fromSocket.destroy(`Made the triggered actions from setSimOnline throw`);
            });
            return !dbResp.isSimRegistered ?
                ({ "status": "NOT REGISTERED" }) :
                dbResp.passwordStatus === "PASSWORD REPLACED" ?
                    ({ "status": "REPLACE PASSWORD", "allowedUas": dbResp.uasRegisteredToSim }) :
                    ({ "status": "OK" });
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToGateway_1.apiDeclaration.notifyLockedDongle.methodName;
    const handler = {
        "sanityCheck": params => dcSanityChecks.dongleLocked(params),
        "handler": (dongleLocked, fromSocket) => {
            gatewayConnections.addImei(fromSocket, dongleLocked.imei);
            uaRemoteApiCaller.notifyDongleOnLan(dongleLocked, fromSocket.remoteAddress);
            return Promise.resolve(undefined);
        }
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToGateway_1.apiDeclaration.notifyDongleOffline.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            ("imsi" in params) ?
            dcSanityChecks.imsi(params.imsi) :
            dcSanityChecks.imei(params.imei)),
        "handler": (params, fromSocket) => __awaiter(this, void 0, void 0, function* () {
            if ("imei" in params) {
                const { imei } = params;
                gatewayConnections.deleteImei(fromSocket, imei);
            }
            else {
                const { imsi } = params;
                if (gatewayConnections.getBindedToImsi(imsi) !== fromSocket) {
                    throw new Error("Attack detected");
                }
                //NOTE: sim will be set offline in the db
                gatewayConnections.unbindFromImsi(imsi, fromSocket);
            }
            return undefined;
        })
    };
    exports.handlers[methodName] = handler;
}
//TODO: this should be handled on client connection, REALLY DO IT.
{
    const methodName = backendToGateway_1.apiDeclaration.notifyNewOrUpdatedUa.methodName;
    const handler = {
        "sanityCheck": params => gateway_1.misc.sanityChecks.ua(params),
        "handler": ua => dbSemasim.addOrUpdateUa(ua)
            .then(() => undefined)
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToGateway_1.apiDeclaration.wakeUpContact.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.misc.sanityChecks.contact(params.contact)),
        "handler": ({ contact }) => __awaiter(this, void 0, void 0, function* () {
            const pushPayload = {
                "type": "WAKE UP",
                "imsi": contact.uaSim.imsi
            };
            const prIsReached = backendRemoteApiCaller.qualifyContact(contact);
            switch (contact.uaSim.ua.platform) {
                case "iOS": {
                    const isReachableWithoutPush = yield Promise.race([
                        new Promise(resolve => setTimeout(() => resolve(false), 750)),
                        prIsReached
                    ]);
                    if (isReachableWithoutPush) {
                        return "REACHABLE";
                    }
                    const prPushNotificationSent = pushNotifications.send([contact.uaSim.ua], pushPayload);
                    const isReached = yield prIsReached;
                    if (isReached) {
                        return "REACHABLE";
                    }
                    else {
                        yield prPushNotificationSent;
                        return "PUSH_NOTIFICATION_SENT";
                    }
                }
                case "android": {
                    if (yield prIsReached) {
                        return "REACHABLE";
                    }
                    else {
                        yield pushNotifications.send([contact.uaSim.ua], pushPayload);
                        return "PUSH_NOTIFICATION_SENT";
                    }
                }
                case "web": {
                    return (yield prIsReached) ? "REACHABLE" : "UNREACHABLE";
                }
            }
        })
    };
    exports.handlers[methodName] = handler;
}
{
    const methodName = backendToGateway_1.apiDeclaration.forceContactToReRegister.methodName;
    const handler = {
        "sanityCheck": params => (params instanceof Object &&
            gateway_1.misc.sanityChecks.contact(params.contact)),
        "handler": ({ contact }) => __awaiter(this, void 0, void 0, function* () {
            /*
             * NOTE IMPLEMENTATION IOS:
             *
             * Until commit 53957ba1e4344593caf42feba24df48520c2f954 we
             * destroyed the asterisk socket.
             * Should be handled client side.
             *
             */
            yield pushNotifications.send([contact.uaSim.ua], { "type": "RE REGISTER ON NEW CONNECTION" });
            return true;
        })
    };
    exports.handlers[methodName] = handler;
}