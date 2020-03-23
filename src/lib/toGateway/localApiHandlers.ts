import { api_decl_backendToGateway as apiDeclaration, sanityChecks  } from "../../gateway";
import * as sip from "ts-sip";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import * as dbSemasim from "../dbSemasim";
import * as pushNotifications from "../pushNotifications";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as backendConnections from "../toBackend/connections";
import * as gatewayConnections from "../toGateway/connections";
import * as uaRemoteApiCaller from "../toUa/remoteApiCaller";
import * as remoteApiCaller from "./remoteApiCaller";
import * as backendRemoteApiCaller from "../toBackend/remoteApiCaller";
import * as logger from "logger";

const debug = logger.debugFactory();

export const handlers: sip.api.Server.Handlers = {};

{

    const methodName = apiDeclaration.notifySimOnline.methodName;
    type Params = apiDeclaration.notifySimOnline.Params;
    type Response = apiDeclaration.notifySimOnline.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            dcSanityChecks.imsi(params.imsi) &&
            dcSanityChecks.md5(params.storageDigest) &&
            typeof params.password === "string" &&
            typeof params.replacementPassword === "string" &&
            params.simDongle instanceof Object &&
            dcSanityChecks.imei(params.simDongle.imei) &&
            (
                params.simDongle.isVoiceEnabled === undefined ||
                typeof params.simDongle.isVoiceEnabled === "boolean"
            ) &&
            typeof params.simDongle.model === "string" &&
            typeof params.simDongle.firmwareVersion === "string" &&
            typeof params.isGsmConnectivityOk === "boolean" &&
            typeof params.cellSignalStrength === "string"
        ),
        "handler": async (params, fromSocket) => {

            const { 
                imsi, 
                storageDigest, 
                password, 
                replacementPassword, 
                towardSimEncryptKeyStr, 
                simDongle,
                isGsmConnectivityOk,
                cellSignalStrength
            } = params;

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

                if (
                    (!!socket && socket !== fromSocket) ||
                    !!backendConnections.getBindedToImsi(imsi)
                ) {

                    throw new Error("Attack detected");

                }

            }

            //TODO: not very pretty, we evaluated that already...
            if (gatewayConnections.getBindedToImsi(imsi) !== fromSocket) {

                gatewayConnections.bindToImsi(imsi, fromSocket);

            }

            const dbResp = await dbSemasim.setSimOnline(
                imsi,
                password,
                replacementPassword,
                towardSimEncryptKeyStr,
                fromSocket.remoteAddress,
                simDongle,
                isGsmConnectivityOk,
                cellSignalStrength
            );

            (async () => {

                if (!dbResp.isSimRegistered) {

                    gatewayConnections.addImei(fromSocket, simDongle.imei);

                    const dongle = await remoteApiCaller.getDongle(simDongle.imei, fromSocket);

                    if (!dongle) {
                        return;
                    }

                    uaRemoteApiCaller.notifyDongleOnLan({
                        dongle, 
                        "gatewayAddress": fromSocket.remoteAddress
                    });

                } else {

                    let hasInternalSimStorageChanged = dbResp.storageDigest !== storageDigest;

                    if (hasInternalSimStorageChanged) {

                        hasInternalSimStorageChanged = false;

                        const dongle = (await remoteApiCaller.getDongle(simDongle.imei, fromSocket)
                        ) as dcTypes.Dongle.Usable | undefined;

                        if (!dongle) {

                            /*
                            Can happen only when the dongle is connected and immediately disconnected
                            The gateway should notify sim offline. 
                            We return here to prevent sending push notifications.
                            */
                            return;

                        }

                        await dbSemasim.updateSimStorage(imsi, dongle.sim.storage);

                    }

                    uaRemoteApiCaller.notifyUserSimChange({
                        "params": {
                            "type": "IS NOW REACHABLE",
                            imsi,
                            hasInternalSimStorageChanged,
                            "password": (() => {
                                switch (dbResp.passwordStatus) {
                                    case "UNCHANGED":
                                    case "WAS DIFFERENT": return password;
                                    case "PASSWORD REPLACED": return replacementPassword;
                                };
                            })(),
                            simDongle,
                            "gatewayLocation": dbResp.gatewayLocation,
                            isGsmConnectivityOk,
                            cellSignalStrength

                        },
                        "uas": dbResp.uasOfUsersThatHaveAccessToTheSim
                    });


                }


            })().catch(error => {

                debug(error);

                fromSocket.destroy(`Made the triggered actions from setSimOnline throw`);

            });

            return !dbResp.isSimRegistered ?
                ({ "status": "NOT REGISTERED" }) :
                dbResp.passwordStatus === "PASSWORD REPLACED" ?
                    ({ 
                        "status": "REPLACE PASSWORD", 
                        "allowedUas": dbResp.uasOfUsersThatHaveAccessToTheSim
                            .map(({ instance, userEmail }) => ({ instance, userEmail })) 
                    }) :
                    ({ "status": "OK" })
                ;

        }
    };

    handlers[methodName] = handler;

}

{
    
    const { methodName } = apiDeclaration.notifyGsmConnectivityChange;
    type Params = apiDeclaration.notifyGsmConnectivityChange.Params;
    type Response = apiDeclaration.notifyGsmConnectivityChange.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.imsi === "string" &&
            typeof params.isGsmConnectivityOk === "boolean"
        ),
        "handler": async ({imsi, isGsmConnectivityOk }) => {

            const dbResp= await dbSemasim.changeSimGsmConnectivityOrSignal(
                imsi, 
                { isGsmConnectivityOk }
            );

            if( !dbResp.isSimRegistered ){
                return undefined;
            }

            uaRemoteApiCaller.notifyUserSimChange({
                "params": { 
                    "type": "CELLULAR CONNECTIVITY CHANGE", 
                    imsi, 
                    isGsmConnectivityOk 
                }, 
                "uas": dbResp.uasOfUsersThatHaveAccessToSim 
            });

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{
    
    const { methodName } = apiDeclaration.notifyCellSignalStrengthChange;
    type Params = apiDeclaration.notifyCellSignalStrengthChange.Params;
    type Response = apiDeclaration.notifyCellSignalStrengthChange.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.imsi === "string" &&
            typeof params.cellSignalStrength === "string"
        ),
        "handler": async ({imsi, cellSignalStrength }) => {

            const dbResp= await dbSemasim.changeSimGsmConnectivityOrSignal(
                imsi, 
                { cellSignalStrength }
            );

            if( !dbResp.isSimRegistered ){
                return undefined;
            }

            uaRemoteApiCaller.notifyUserSimChange({
                "params": { 
                    "type": "CELLULAR SIGNAL STRENGTH CHANGE", 
                    imsi, 
                    cellSignalStrength
                }, 
                "uas": dbResp.uasOfUsersThatHaveAccessToSim 
            });

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName }= apiDeclaration.notifyLockedDongle;
    type Params = apiDeclaration.notifyLockedDongle.Params;
    type Response = apiDeclaration.notifyLockedDongle.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => dcSanityChecks.dongleLocked(params),
        "handler": (dongleLocked, fromSocket) => {

            gatewayConnections.addImei(fromSocket, dongleLocked.imei);

            uaRemoteApiCaller.notifyDongleOnLan({
                "dongle": dongleLocked, 
                "gatewayAddress": fromSocket.remoteAddress
            });

            return Promise.resolve(undefined);

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName }= apiDeclaration.notifyDongleOffline;
    type Params = apiDeclaration.notifyDongleOffline.Params;
    type Response = apiDeclaration.notifyDongleOffline.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
                ("imsi" in params) ?
                dcSanityChecks.imsi(params.imsi) :
                dcSanityChecks.imei(params.imei)
        ),
        "handler": async (params, fromSocket) => {

            if ("imei" in params) {

                const { imei } = params;

                gatewayConnections.deleteImei(fromSocket, imei);

            } else {

                const { imsi } = params;

                if (gatewayConnections.getBindedToImsi(imsi) !== fromSocket) {
                    throw new Error("Attack detected");
                }

                //NOTE: sim will be set offline in the db
                gatewayConnections.unbindFromImsi(imsi, fromSocket);

            }

            return undefined;

        }
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.notifyOngoingCall;
    type Params = apiDeclaration.notifyOngoingCall.Params;
    type Response = apiDeclaration.notifyOngoingCall.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            typeof params.ongoingCallId === "string" &&
            (params.from === "DONGLE" || params.from === "SIP") &&
            dcSanityChecks.imsi(params.imsi) &&
            typeof params.number === "string" &&
            params.uasInCall instanceof Array &&
            params.uasInCall.filter(uaRef => !sanityChecks.uaRef(uaRef)).length === 0 &&
            typeof params.isTerminated === "boolean"
        ),
        "handler": async ({ ongoingCallId, from, imsi, number, uasInCall, isTerminated }) => {

            const uasOfUsersThatHaveAccessToTheSim = await dbSemasim.createUpdateOrDeleteOngoingCall(
                ongoingCallId,
                imsi,
                number,
                from,
                isTerminated,
                uasInCall
            );

            uasOfUsersThatHaveAccessToTheSim.forEach(ua =>
                uaRemoteApiCaller.notifyUserSimChange({
                    "params": {
                        "type": "ONGOING CALL",
                        imsi,
                        ...(isTerminated ? ({
                            "isTerminated": true,
                            ongoingCallId
                        }) : ({
                            "isTerminated": false,
                            "ongoingCall": {
                                ongoingCallId,
                                from,
                                number,
                                "isUserInCall": !!uasInCall
                                    .find(({ userEmail }) => userEmail === ua.userEmail),
                                "otherUserInCallEmails": uasInCall
                                    .map(({ userEmail }) => userEmail).filter(email => email !== ua.userEmail)
                            }
                        }))
                    },
                    "uas": [ua]
                })
            );

            return undefined;

        }
    };

    handlers[methodName] = handler;

}


{

    const { methodName } = apiDeclaration.seeIfSipContactIsReachableElseSendWakeUpPushNotification;
    type Params = apiDeclaration.seeIfSipContactIsReachableElseSendWakeUpPushNotification.Params;
    type Response = apiDeclaration.seeIfSipContactIsReachableElseSendWakeUpPushNotification.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": sanityChecks.contact,
        "handler": contact => new Promise<Response>(resolve =>
            backendRemoteApiCaller.qualifyContact(contact)
                .then(isReachable => {

                    resolve({ isReachable });

                    if (isReachable) {
                        return;
                    }

                    pushNotifications.sendSafe(
                        [contact.uaSim.ua],
                        {
                            "type": "WAKE UP",
                            "imsi": contact.uaSim.imsi
                        }
                    );


                })
        )
    };

    handlers[methodName] = handler;

}

{

    const { methodName } = apiDeclaration.sendWakeUpPushNotifications;
    type Params = apiDeclaration.sendWakeUpPushNotifications.Params;
    type Response = apiDeclaration.sendWakeUpPushNotifications.Response;

    const handler: sip.api.Server.Handler<Params, Response> = {
        "sanityCheck": params => (
            params instanceof Object &&
            params.uas instanceof Array &&
            params.uas.every(sanityChecks.ua) &&
            dcSanityChecks.imsi(params.imsi)
        ),
        "handler": ({ uas, imsi }) => {

            pushNotifications.sendSafe(
                uas,
                {
                    "type": "WAKE UP",
                    imsi
                }
            );

            return Promise.resolve(undefined);

        }
    };

    handlers[methodName] = handler;

}
