import {
    sipApiFramework as framework,
    sipLibrary,
    sipApiClientGateway as sipApiGateway,
    sipApiClientBackend as _
} from "../semasim-gateway";
import * as firebaseFunctions from "../tools/firebaseFunctions";
import { gatewaySockets, qualifyContact } from "./sipProxy";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_sipApi");

export function startListening(gatewaySocket: sipLibrary.Socket) {

    firebaseFunctions.init(c.serviceAccount);

    framework.startListening(gatewaySocket).attach(
        async ({ method, params, sendResponse }) => {

            try {

                let response = await handlers[method](params, gatewaySocket);

                sendResponse(response);

            } catch (error) {

                debug("Unexpected error: ", error.message);

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

        debug(`handle ${methodName}`);

        let { imei } = params;
        let candidateGatewaySocket = gatewaySocket;

        let currentGatewaySocket = gatewaySockets.get(imei);

        if (!currentGatewaySocket) {
            gatewaySockets.add(imei, candidateGatewaySocket);
            return { "isGranted": true };
        }

        if (currentGatewaySocket === candidateGatewaySocket) {
            return { "isGranted": true };
        }

        let currentResp: sipApiGateway.isDongleConnected.Response;

        try{

            currentResp = await sipApiGateway.isDongleConnected.makeCall(currentGatewaySocket, imei);

        }catch(error){

            debug("Gateway did not behave the way it is supposed to");

            return { "isGranted": true };

        }

        if (currentResp.isConnected) {
            debug("Attack attempt, we refuse to associate socket to this dongle");
            return { "isGranted": false };
        }

        let candidateResp = await sipApiGateway.isDongleConnected.makeCall(candidateGatewaySocket, imei);

        if (candidateResp.isConnected) {
            gatewaySockets.add(imei, candidateGatewaySocket);
            return { "isGranted": true };
        }


        if (candidateResp.lastConnectionTimestamp > currentResp.lastConnectionTimestamp) {
            gatewaySockets.add(imei, candidateGatewaySocket);
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

        debug(`handle ${methodName}`);

        let { contact } = params;

        let reached = await qualifyContact(contact);

        if (reached) {
            debug("Directly reachable");
            return { "status": "REACHABLE" };
        }

        let { pushType, pushToken } = contact.pushInfos;

        switch (pushType) {
            case "google":
            case "firebase":

                try {

                    let response = await firebaseFunctions.sendPushNotification(pushToken!);

                    debug({ response });

                    return { "status": "PUSH_NOTIFICATION_SENT" };

                } catch (error) {

                    debug("Error firebase", error);

                    return { "status": "UNREACHABLE" };

                }

            default:
                debug("Can't send push notification for this contact");
                return { "status": "UNREACHABLE" };
        }


    };

})();


