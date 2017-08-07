import * as apiOverSip from "./apiOverSip";
import * as sip from "./sip";
import { Contact } from "../admin";
import * as firebase from "../admin/firebase";
import { deviceSockets, qualifyContact } from "./outbound";
import { proxySocket } from "./inbound";

import * as _debug from "debug";
let debug = _debug("_sipProxy/outbound.api");

export function startListening(deviceSocket: sip.Socket) {

    let evt = apiOverSip.startListening(deviceSocket);

    evt.attach(
        async ({ method, payload, sendResponse }) => {

            let response: Record<string, any>={};

            switch (method) {
                case claimDongle.methodName:
                    claimDongle.handle(payload as claimDongle.Request, deviceSocket)
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

    export interface Request extends Record<string, any> {
        imei: string;
    }

    export function handle(
        { imei }: Request,
        deviceSocket: sip.Socket
    ) {
        debug(`Device ip: ${deviceSocket.remoteAddress} claimed dongle ${imei}`);
        deviceSockets.add(imei, deviceSocket);
    }

    export async function run(imei: string) {

        let payload: Request = { imei };

        await apiOverSip.sendRequest(proxySocket, methodName, payload);

    }


}


export namespace wakeUpUserAgent {

    export const methodName = "wakeUpUserAgent";

    export interface Request extends Record<string, any> {
        contact: Contact
    }

    export interface Response extends Record<string, any> {
        status: "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "FAIL";
    }

    export async function handle(
        { contact }: Request,
    ): Promise<Response> {

        debug("wakeUpUserAgent");

        let reached = await qualifyContact(contact);

        if (reached){
            debug("Directly reachable");
            return { "status": "REACHABLE" };
        }

        let { params } = sip.parseUri(contact.uri);

        if (params["pn-type"] !== "firebase") {

            debug("Only firebase supported");

            return { "status": "FAIL" };

        }

        try {

            let response = await firebase.wakeUpDevice(params["pn-tok"]!);

            debug({ response });

            return { "status": "PUSH_NOTIFICATION_SENT" };

        } catch (error) {

            debug("Error firebase", error);

            return { "status": "FAIL" };

        }

    }

    export async function run(
        contact: Contact
    ): Promise<Response["status"]> {

        debug("Run wakeUpUserAgent");

        let payload: Request = { contact };

        let { status } = await apiOverSip.sendRequest(proxySocket, methodName, payload);

        debug(`Status: ${status}`);

        return status;

    }

}