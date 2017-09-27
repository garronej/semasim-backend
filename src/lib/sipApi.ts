import {
    sipApiFramework as framework,
    sipLibrary,
    sipApiClientGateway as sipApiGateway,
    sipApiClientBackend as _,
    Contact
} from "../semasim-gateway";
import * as firebaseFunctions from "../tools/firebaseFunctions";
import { 
    gatewaySockets, 
    clientSockets, 
    parseFlowToken 
} from "./sipProxy";

import { c } from "./_constants";

import "colors";

import * as _debug from "debug";
let debug = _debug("_sipApi");

export function startListening(gatewaySocket: sipLibrary.Socket) {

    firebaseFunctions.init(c.serviceAccount);

    framework.startListening(gatewaySocket).attach(
        async ({ method, params, sendResponse }) => {

            try {

                debug(`${method}: params: ${JSON.stringify(params)}...`);

                let response = await handlers[method](params, gatewaySocket);

                debug(`...${method}: response: ${JSON.stringify(response)}`);

                sendResponse(response);

            } catch (error) {

                debug(`Unexpected error: ${error.message}`.red);

                gatewaySocket.destroy();

            }

        }
    );

}

type Payload = Record<string, any>;

const handlers: Record<string, (params: Payload, gatewaySocket: sipLibrary.Socket) => Promise<Payload>> = {};

(() => {

    let methodName = _.claimDongle.methodName;
    type Params = _.claimDongle.Params;
    type Response = _.claimDongle.Response;

    handlers[methodName] = async (params: Params, gatewaySocket: sipLibrary.Socket): Promise<Response> => {

        let { imei } = params;
        let candidateGatewaySocket = gatewaySocket;

        let currentGatewaySocket = gatewaySockets.get(imei);

        if (!currentGatewaySocket) {
            gatewaySockets.set(imei, candidateGatewaySocket);
            return { "isGranted": true };
        }

        if (currentGatewaySocket === candidateGatewaySocket) {
            return { "isGranted": true };
        }

        let currentResp: sipApiGateway.isDongleConnected.Response;

        try{

            currentResp = await sipApiGateway.isDongleConnected.makeCall(currentGatewaySocket, imei);

        }catch(error){

            debug("Gateway did not behave the way it is supposed to".red);

            return { "isGranted": true };

        }

        if (currentResp.isConnected) {
            debug("Attack attempt, we refuse to associate socket to this dongle".red);
            return { "isGranted": false };
        }

        let candidateResp = await sipApiGateway.isDongleConnected.makeCall(candidateGatewaySocket, imei);

        if (candidateResp.isConnected) {
            gatewaySockets.set(imei, candidateGatewaySocket);
            return { "isGranted": true };
        }


        if (candidateResp.lastConnectionTimestamp > currentResp.lastConnectionTimestamp) {
            gatewaySockets.set(imei, candidateGatewaySocket);
            return { "isGranted": true };
        }

        return { "isGranted": false };

    };

})();

(() => {

    let methodName = _.wakeUpUserAgent.methodName;
    type Params = _.wakeUpUserAgent.Params;
    type Response = _.wakeUpUserAgent.Response;

    handlers[methodName] = async (params: Params, gatewaySocket: sipLibrary.Socket): Promise<Response> => {

        let { contact } = params;

        let reached = await qualifyContact(contact);

        if( reached ) return { "status": "REACHABLE" };

        let isSuccess= await sendPushNotification(contact);

        return { "status": isSuccess?"PUSH_NOTIFICATION_SENT":"UNREACHABLE" };

    };

})();

(() => {

    let methodName = _.forceReRegister.methodName;
    type Params = _.forceReRegister.Params;
    type Response = _.forceReRegister.Response;

    handlers[methodName] = async (params: Params, gatewaySocket: sipLibrary.Socket): Promise<Response> => {

        let { contact } = params;

        let isPushNotificationSent= await sendPushNotification(contact);

        return { isPushNotificationSent };

    };

})();

const qualifyPending = new Map<string, Promise<boolean>>();

qualifyPending.set = function set(connectionId, promiseResult) {

    let self: typeof qualifyPending = this;

    promiseResult.then(() => self.delete(connectionId));

    return Map.prototype.set.call(self, connectionId, promiseResult);

}

//TODO: May throw error!
export function qualifyContact(
    contact: Contact,
    timeout = 2000
): Promise<boolean> {

    let { connectionId } = parseFlowToken(contact.flowToken);

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

        let sipRequest = sipLibrary.parse([
            `OPTIONS ${contact.ps.uri} SIP/2.0`,
            `From: <sip:${contact.ps.endpoint}@${c.shared.domain}>;tag=${fromTag}`,
            `To: <${contact.ps.uri}>`,
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

        debug(`(backend) ${sipRequest.method} ${contact.ps.endpoint}`.blue);
        clientSocket.write(sipRequest);

        try {

            let sipResponse = await clientSocket.evtResponse.waitForExtract(
                ({ headers }) => headers.via[0].params["branch"] === branch,
                timeout
            );

            debug(`(client ${connectionId}): ${sipResponse.status} ${sipResponse.reason} for qualify ${contact.ps.endpoint}`.yellow);

            return true;

        } catch (error) {

            return false;

        }

    })();

    qualifyPending.set(connectionId, promiseResult);

    return promiseResult;

}


const pushPending= new Map<string, Promise<boolean>>();

pushPending.set= function set(key, promiseResult){

    let self: typeof pushPending= this;

    setTimeout(()=> self.delete(key), 4000);

    return Map.prototype.set.call(self, key, promiseResult);

}

function sendPushNotification(contact: Contact): Promise<boolean> {

    let key = JSON.stringify(contact.pushInfos);

    let promiseResult= pushPending.get(key);

    if ( promiseResult ){ 
        debug("use cache");
        return promiseResult;
    }

    promiseResult= (async ()=> {

        let { pushType, pushToken } = contact.pushInfos;

        switch (pushType) {
            case "google":
            case "firebase":

                try {

                    await firebaseFunctions.sendPushNotification(pushToken!);

                    return true;

                } catch (error) {

                    debug(`Error firebase ${error.message}`.red);

                    return false;

                }

            default:
                debug(`Can't send push notification for this contact ${contact.pretty}`.red);
                return false;
        }

        
    })();

    pushPending.set(key, promiseResult);

    return promiseResult;

}



