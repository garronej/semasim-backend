import {
    sipApiFramework as framework,
    sipLibrary,
    sipApiClientGateway as sipApiGateway,
    sipApiClientBackend as _,
    Contact
} from "../semasim-gateway";
import * as pushSender from "../tools/pushSender";
import { 
    gatewaySockets, 
    clientSockets
} from "./sipProxy";

import { c } from "./_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipApi");


export function startListening(gatewaySocket: sipLibrary.Socket) {

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
        params: Params
    ): Promise<Response> {

        let { contact } = params;

        let platform= figureOutPushPlatform(contact.uaEndpoint.ua.pushToken);

        if( !platform ){

            debug("no platform");

            let isReachable = await qualifyContact(contact);

            return { "status": isReachable ? "REACHABLE" : "UNREACHABLE" };

        }

        let pushToken = contact.uaEndpoint.ua.pushToken!;

        switch (platform) {
            case "iOS":

                debug("platform iOS...");

                let prReached = qualifyContact(contact);

                let reachableWithoutPush = await Promise.race([
                    new Promise<false>(resolve => setTimeout(() => resolve(false), 750)),
                    prReached
                ]);

                if (reachableWithoutPush) {

                    debug("...reachable without push");

                    return { "status": "REACHABLE" };

                }

                let prIsSendPushSuccess = sendPushNotification(pushToken);

                let reachable = await prReached;

                if (reachable) {

                    debug("...reachable with push");

                    return { "status": "REACHABLE" };

                } else {

                    debug("... push notification sent");

                    return { "status": (await prIsSendPushSuccess) ? "PUSH_NOTIFICATION_SENT" : "UNREACHABLE" };

                }

            case "android":

                let reached = await qualifyContact(contact);

                if (reached) return { "status": "REACHABLE" };

                let isSendPushSuccess = await sendPushNotification(pushToken);

                return { "status": isSendPushSuccess ? "PUSH_NOTIFICATION_SENT" : "UNREACHABLE" };
        }


    };

})();

(()=>{

    let methodName = _.forceContactToReRegister.methodName;
    type Params = _.forceContactToReRegister.Params;
    type Response = _.forceContactToReRegister.Response;

    handlers[methodName] = async function (
        params: Params
    ): Promise<Response> {

        let { contact } = params;

        let pushToken= contact.uaEndpoint.ua.pushToken;

        let platform = figureOutPushPlatform(pushToken);

        if( platform !== "android" ){

            let clientSocket= clientSockets.get(contact.connectionId);

            if( clientSocket ){

                clientSocket.destroy();

            }

        }

        let isPushNotificationSent = await sendPushNotification(pushToken);

        return { isPushNotificationSent };

    };

})();

(() => {

    let methodName = _.sendPushNotification.methodName;
    type Params = _.sendPushNotification.Params;
    type Response = _.sendPushNotification.Response;

    handlers[methodName] = async function (
        params: Params
    ): Promise<Response> {

        let { ua } = params;

        let isPushNotificationSent = await sendPushNotification(ua.pushToken);

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
): Promise<boolean> | false {

    debug("qualify contact...");

    let connectionId = contact.connectionId;

    let clientSocket = clientSockets.get(connectionId);

    if (!clientSocket){

        debug("...No client connection qualify failed");

        return false;
    }

    let promiseResult = qualifyPending.get(connectionId);

    if (promiseResult){

        debug("...qualify pending for this contact");

        return promiseResult;

    }

    promiseResult = (async () => {

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

        let branch = clientSocket.addViaHeader(sipRequest);

        debug(`(backend) ${sipRequest.method} ${imei}`.blue);
        clientSocket.write(sipRequest);

        try {

            let sipResponse = await Promise.race([
                new Promise<never>((_, reject) =>
                    clientSocket!.evtClose.attachOnce(sipRequest, () =>
                        reject(new Error("Socket disconnected before receiving response to qualify"))
                    )
                ),
                clientSocket.evtResponse.attachOnceExtract(
                    ({ headers }) => headers.via[0].params["branch"] === branch,
                    timeout, () => clientSocket!.evtClose.detach(sipRequest)
                )
            ]);

            debug("...qualify success");

            debug(`(client ${connectionId}): ${sipResponse.status} ${sipResponse.reason} for qualify ${imei}`.yellow);

            return true;

        } catch (error) {

            debug(`...qualify failed ${error.message}`);

            if (!clientSocket.evtClose.postCount) {
                clientSocket.destroy();
            }

            return false;

        }

    })();

    qualifyPending.set(connectionId, promiseResult);

    return promiseResult;

}



function figureOutPushPlatform(
    pushToken: Contact.UaEndpoint.Ua.PushToken | undefined
): pushSender.Platform | undefined | null {

    if (!pushToken) return null;

    let { type } = pushToken;

    switch (pushToken.type) {
        case "google":
        case "firebase":
            return "android";
        case "apple":
            return "iOS";
        default:
            return undefined;
    }

}

namespace pushPending {

    const map = new Map<string, Promise<boolean>>();

    export function get(
        pushToken: Contact.UaEndpoint.Ua.PushToken
    ) {
        return map.get(pushToken.token);
    }

    export function set(
        pushToken: Contact.UaEndpoint.Ua.PushToken,
        prIsSent: Promise<boolean>
    ) {

        let { token } = pushToken;

        switch (figureOutPushPlatform(pushToken)!) {
            case "android":
                setTimeout(() => map.delete(token), 10000);
                break;
            case "iOS":
                prIsSent.then(() => map.delete(token));
                break;
        }

        map.set(token, prIsSent);

    }

}

function sendPushNotification(
    pushToken: Contact.UaEndpoint.Ua.PushToken | undefined
): Promise<boolean> {

    let platform = figureOutPushPlatform(pushToken);

    if (!platform) return Promise.resolve(false);

    let prIsSent = pushPending.get(pushToken!);

    if (prIsSent) return prIsSent;

    prIsSent = (async () => {

        try {

            await pushSender.send(platform, pushToken!.token);

        } catch{

            return false;

        }

        return true;

    })();

    pushPending.set(pushToken!, prIsSent);

    return prIsSent;

}

