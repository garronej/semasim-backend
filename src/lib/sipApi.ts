import {
    sipApiFramework as framework,
    sipLibrary,
    sipApiClientGateway as sipApiGateway,
    sipApiClientBackend as _,
    Contact
} from "../semasim-gateway";
import * as firebaseFunctions from "../tools/firebaseFunctions";
import * as applePushKitFunctions from "../tools/applePushKitFunctions";
import { 
    gatewaySockets, 
    clientSockets
} from "./sipProxy";

import { c } from "./_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipApi");


export function startListening(gatewaySocket: sipLibrary.Socket) {

    let { android, apple }= c.pushNotificationCredentials;

    firebaseFunctions.init(android.pathToServiceAccount);

    applePushKitFunctions.init({ "token": apple.token });

    framework.startListening(gatewaySocket).attach(
        async ({ method, params, sendResponse }) => {

            try {

                debug(`${method}: params: ${JSON.stringify(params,null,2)}...`);

                let response = await handlers[method](params, gatewaySocket);

                debug(`...${method}: response: ${JSON.stringify(response, null, 2)}`);

                sendResponse(response);

            } catch (error) {

                debug(`Unexpected error: ${error.message}`.red);

                gatewaySocket.destroy();

            }

        }
    );

}

/** Record methodName => handler */
const handlers: Record<string, (params: any, gatewaySocket: sipLibrary.Socket) => Promise<any>> = {};

(() => {

    let methodName = _.claimDongle.methodName;
    type Params = _.claimDongle.Params;
    type Response = _.claimDongle.Response;

    handlers[methodName] = async function(
        params: Params, 
        gatewaySocket: sipLibrary.Socket
    ): Promise<Response> {

        let { imei } = params;
        let candidateGatewaySocket = gatewaySocket;
        let currentGatewaySocket = gatewaySockets.get(imei);

        let grant= ()=> {

            if( candidateGatewaySocket !== currentGatewaySocket ){
                gatewaySockets.set(imei, candidateGatewaySocket);
            }

            return { "isGranted": true };
        };


        if (!currentGatewaySocket || currentGatewaySocket === candidateGatewaySocket) {
            return grant();
        }

        let currentResp: sipApiGateway.isDongleConnected.Response;

        try{
            currentResp = await sipApiGateway.isDongleConnected.makeCall(currentGatewaySocket, imei);
        }catch{
            debug("Current gateway did not respond. Grant access to candidate".red);
            return grant();
        }

        if (currentResp.isConnected) {
            debug("Attempt to claim a dongle already connected elsewhere. Deny access".red);
            return { "isGranted": false };
        }

        let candidateResp: sipApiGateway.isDongleConnected.Response;

        try{
            candidateResp = await sipApiGateway.isDongleConnected.makeCall(candidateGatewaySocket, imei);
        }catch{
            debug("Candidate gateway did not behave the way it was supposed. Deny access".red);
            return { "isGranted": false };
        }

        if (candidateResp.isConnected) {
            return grant();
        }

        if (candidateResp.lastConnection.getTime() > currentResp.lastConnection.getTime()) {
            return grant();
        }else{
            debug("Dongle has been more recently connected to the current socket. Deny access".red);
            return { "isGranted": false };
        }

    };

})();

(() => {

    let methodName = _.wakeUpContact.methodName;
    type Params = _.wakeUpContact.Params;
    type Response = _.wakeUpContact.Response;

    handlers[methodName] = async function (
        params: Params,
        gatewaySocket: sipLibrary.Socket
    ): Promise<Response> {

        let { contact } = params;

        if (contact.uaEndpoint.ua.pushToken && contact.uaEndpoint.ua.pushToken.type === "apple") {

            let prReached = qualifyContact(contact, 10000);

            //TODO await just a little bit to prevent sending push if socket is active.

            let isSuccess = await sendPushNotification(contact.uaEndpoint.ua);

            if (await prReached) return { "status": "REACHABLE" };

            return { "status": isSuccess ? "PUSH_NOTIFICATION_SENT" : "UNREACHABLE" };

        } else {

            let reached = await qualifyContact(contact);

            if (reached) return { "status": "REACHABLE" };

            let isSuccess = await sendPushNotification(contact.uaEndpoint.ua);

            return { "status": isSuccess ? "PUSH_NOTIFICATION_SENT" : "UNREACHABLE" };

        }

    };

})();

(() => {

    let methodName = _.sendPushNotification.methodName;
    type Params = _.sendPushNotification.Params;
    type Response = _.sendPushNotification.Response;

    handlers[methodName] = async function (
        params: Params,
        gatewaySocket: sipLibrary.Socket
    ): Promise<Response> {

        let { ua } = params;

        let isPushNotificationSent = await sendPushNotification(ua);

        return { isPushNotificationSent };

    };

})();

/** Map connectionId => last qualify result */
const qualifyPending = new Map<number, Promise<boolean>>();

qualifyPending.set = function set(connectionId, promiseResult) {

    let self: typeof qualifyPending = this;

    promiseResult.then(() => self.delete(connectionId));

    return Map.prototype.set.call(self, connectionId, promiseResult);

}


//TODO: May throw error!
export function qualifyContact(
    contact: Contact,
    timeout = 2500
): Promise<boolean> {

    let connectionId = contact.connectionId;

    let promiseResult = qualifyPending.get(connectionId);

    if (promiseResult) return promiseResult;

    promiseResult = (async () => {

        let clientSocket = clientSockets.get(connectionId);

        if (!clientSocket) {
            debug("no client socket to qualify");
            return false;
        }

        let fromTag = `794ee9eb-${Date.now()}`;
        let callId = `138ce538-${Date.now()}`;
        let cSeqSequenceNumber = Math.floor(Math.random() * 2000);

        let imei = contact.uaEndpoint.endpoint.dongle.imei;

        let sipRequest = sipLibrary.parse([
            `OPTIONS ${contact.uri} SIP/2.0`,
            `From: <sip:${imei}@${c.shared.domain}>;tag=${fromTag}`,
            `To: <${contact.uri}>`,
            `Call-ID: ${callId}`,
            `CSeq: ${cSeqSequenceNumber} OPTIONS`,
            "Supported: path",
            "Max-Forwards: 70",
            "User-Agent: Semasim-backend",
            "Content-Length:  0",
            "\r\n"
        ].join("\r\n")) as sipLibrary.Request;

        //TODO: should be set to [] already :(
        sipRequest.headers.via = [];

        let branch = clientSocket.addViaHeader(sipRequest)

        debug(`(backend) ${sipRequest.method} ${imei}`.blue);
        clientSocket.write(sipRequest);

        try {

            let sipResponse = await clientSocket.evtResponse.attachOnceExtract(
                ({ headers }) => headers.via[0].params["branch"] === branch,
                timeout, () => { }
            );

            debug(`(client ${connectionId}): ${sipResponse.status} ${sipResponse.reason} for qualify ${imei}`.yellow);

            return true;

        } catch (error) {

            return false;

        }

    })();

    qualifyPending.set(connectionId, promiseResult);

    return promiseResult;

}


/** Map uaInstance => Response to last push */
const pushPending = new Map<string, Promise<boolean>>();

pushPending.set = function set(key, promiseResult) {

    let self: typeof pushPending = this;

    setTimeout(() => self.delete(key), 10000);

    return Map.prototype.set.call(self, key, promiseResult);

}

function sendPushNotification(ua: Contact.UaEndpoint.Ua): Promise<boolean> {

    let promiseResult = pushPending.get(ua.instance);

    if (promiseResult) {
        debug("use cache");
        return promiseResult;
    }

    promiseResult = (async () => {

        if (!ua.pushToken) return false;

        let { type, token } = ua.pushToken;

        switch (type) {
            case "google":
            case "firebase":

                try {

                    await firebaseFunctions.sendPushNotification(token);

                    return true;

                } catch (error) {

                    debug(`Error firebase ${error.message}`.red);

                    return false;

                }
            case "apple":

                try {

                    await applePushKitFunctions.sendPushNotification(token, c.pushNotificationCredentials.apple.appId);

                    return true;

                } catch (error) {

                    debug(`Error apple push kit ${error.message}`.red);

                    return false;

                }
            default:
                debug(`Can't send push notification to ua`.red);
                return false;
        }

    })();

    pushPending.set(ua.instance, promiseResult);

    return promiseResult;

}
