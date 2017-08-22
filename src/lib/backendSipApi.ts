import * as sipApiFramework from "./tools/sipApiFramework";
import * as sipLibrary from "./tools/sipLibrary";
import { Contact } from "./sipContacts";
import * as firebaseFunctions from "./tools/firebaseFunctions";
import { gatewaySockets, qualifyContact } from "./backendSipProxy";
import { getBackendSocket } from "./gatewaySipProxy";
import * as gatewaySipApi from "./gatewaySipApi";
import * as c from "./_constants";

import * as _debug from "debug";
let debug = _debug("_backendSipApi");

export function startListening(gatewaySocket: sipLibrary.Socket) {

    firebaseFunctions.init(c.serviceAccount);

    let evt = sipApiFramework.startListening(gatewaySocket);

    evt.attach(
        async ({ method, payload, sendResponse }) => {

            let response: Record<string, any>={};

            switch (method) {
                case claimDongle.methodName:
                    response= await claimDongle.handle(payload as claimDongle.Request, gatewaySocket)
                    break;
                case wakeUpUserAgent.methodName:
                    response= await wakeUpUserAgent.handle(payload as wakeUpUserAgent.Request);
                    break;
            }

            sendResponse(response);

        }
    );

}

export namespace claimDongle {

    export const methodName = "claimDongle";

    export interface Request {
        imei: string;
    }

    export interface Response {
        isGranted: boolean;
    }

    export async function handle(
        { imei }: Request,
        candidateGatewaySocket: sipLibrary.Socket
    ): Promise<Response> {

        let currentGatewaySocket = gatewaySockets.get(imei);

        if (!currentGatewaySocket) {
            gatewaySockets.add(imei, candidateGatewaySocket);
            return { "isGranted": true };
        }

        if( currentGatewaySocket === candidateGatewaySocket ){
            return { "isGranted": true };
        }

        let currentResp= await gatewaySipApi.isDongleConnected.run(currentGatewaySocket, imei );

        if( currentResp.isConnected ){
            debug("Attack attempt, we refuse to associate socket to this dongle");
            return { "isGranted": false };
        }

        let candidateResp= await gatewaySipApi.isDongleConnected.run(candidateGatewaySocket, imei);

        if( candidateResp.isConnected ){
            gatewaySockets.add(imei, candidateGatewaySocket);
            return { "isGranted": true };
        }


        if( candidateResp.lastConnectionTimestamp > currentResp.lastConnectionTimestamp ){
            gatewaySockets.add(imei, candidateGatewaySocket);
            return { "isGranted": true };
        }

        return { "isGranted": false };

    }

    export async function run(
        imei: string,
    ): Promise<boolean> {

        let payload: Request = { imei };

        let { isGranted }= await sipApiFramework.sendRequest(await getBackendSocket(), methodName, payload) as Response;

        return isGranted;

    }


}


export namespace wakeUpUserAgent {

    export const methodName = "wakeUpUserAgent";

    export interface Request {
        contactOrContactUri: Contact | string;
    }

    export interface Response {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
    }

    export async function handle(
        { contactOrContactUri }: Request,
    ): Promise<Response> {

        debug("wakeUpUserAgent");

        if (typeof contactOrContactUri !== "string") {

            let contact = contactOrContactUri;

            let reached = await qualifyContact(contact);

            if (reached) {
                debug("Directly reachable");
                return { "status": "REACHABLE" };
            }

        }

        let { pushType, pushToken } = Contact.readPushInfos(contactOrContactUri);

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


    }

    export async function run(
        contactOrContactUri: Contact | string
    ): Promise<Response["status"]> {

        debug("Run wakeUpUserAgent");

        let payload: Request = { contactOrContactUri };

        let { status } = await sipApiFramework.sendRequest(await getBackendSocket(), methodName, payload) as Response;

        debug(`Status: ${status}`);

        return status;

    }

}
