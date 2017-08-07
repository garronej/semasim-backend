
import * as apiOverSip from "./apiOverSip";
import * as sip from "./sip";
import { Contact } from "../admin";
import * as firebase from "../admin/firebase";
import { deviceSockets, qualifyContact } from "./outbound";
import { proxySocket } from "./inbound";
import { LockedDongle, DongleActive,  DongleExtendedClient } from "chan-dongle-extended-client";
import { dbAsterisk } from "../admin";


import * as _debug from "debug";
let debug = _debug("_sipProxy/inbound.api");

export function startListening() {

    let evt = apiOverSip.startListening(proxySocket);

    evt.attach(
        async ({ method, payload, sendResponse }) => {

            let response: Record<string, any>={};

            switch (method) {
                case unlockDongle.methodName:
                    response= await unlockDongle.handle(payload as unlockDongle.Request);
                case isDongleConnected.methodName:
                    response= await isDongleConnected.handle(payload as isDongleConnected.Request);
                    break;
            }

            sendResponse(response);

        }
    );

}

export namespace isDongleConnected{

    export const methodName= "isDongleConnected";

    export interface Request {
        imei: string;
    }

    export interface Response {
        isConnected: boolean;
        lastConnectionTimestamp: number;
    }

    export async function handle(
        { imei }: Request
    ): Promise<Response> {

        let isConnected = (await DongleExtendedClient.localhost().getConnectedDongles()).indexOf( imei ) >= 0;

        let lastConnectionTimestamp= await dbAsterisk.queryLastConnectionTimestampOfDonglesEndpoint(imei);

        return { isConnected, lastConnectionTimestamp };

    }

    export async function run(
        deviceSocket: sip.Socket,
        imei: string
    ): Promise<Response> {

        let payload: Request= { imei };

        let response = await apiOverSip.sendRequest(deviceSocket, methodName, payload);

        return response as Response;

    }



}


export namespace unlockDongle {

    export const methodName = "unlockDongle";

    export interface Request {
        imei: string;
        lastFourDigitsOfIccid: string;
        pinFirstTry: string;
        pinSecondTry?: string;
    }

    export interface Response {
        dongleFound: boolean;
        pinState?: LockedDongle["pinState"] | "READY";
        tryLeft?: number;
    }


    export async function handle(
        { imei, lastFourDigitsOfIccid, pinFirstTry, pinSecondTry }: Request,
    ): Promise<Response> {

        debug("unlockDongle");

        let dongleClient = DongleExtendedClient.localhost();

        try {

            if (await dongleClient.getActiveDongle(imei))
                return { "dongleFound": true, pinState: "READY" };

            let [lockedDongle] = (await dongleClient.getLockedDongles()).filter(lockedDongle => {

                if (lockedDongle.imei !== imei) return false;

                let iccid = lockedDongle.iccid;

                if (iccid && iccid.substring(iccid.length - 4) !== lastFourDigitsOfIccid)
                    return false;

                return true;

            });

            if (lockedDongle.pinState !== "SIM PIN" || lockedDongle.tryLeft !== 3)
                return { "dongleFound": true, "pinState": "SIM PIN", "tryLeft": lockedDongle.tryLeft };

            let attemptUnlock = async (pin: string): Promise<LockedDongle | DongleActive> => {

                await dongleClient.unlockDongle(imei, pinFirstTry);

                return await Promise.race([
                    dongleClient.evtNewActiveDongle.waitFor(newActiveDongle => newActiveDongle.imei === imei),
                    dongleClient.evtRequestUnlockCode.waitFor(lockedDongle => lockedDongle.imei === imei)
                ]);

            };

            let matchLocked = (dongle: LockedDongle | DongleActive): dongle is LockedDongle => dongle["pinState"];

            let resultFirstTry= await attemptUnlock(pinFirstTry);

            if (!matchLocked(resultFirstTry))
                return { "dongleFound": true, "pinState": "READY" };

            if (!pinSecondTry)
                return { "dongleFound": true, "pinState": resultFirstTry.pinState, "tryLeft": resultFirstTry.tryLeft };

            let resultSecondTry= await attemptUnlock(pinSecondTry);

            if (!matchLocked(resultSecondTry))
                return { "dongleFound": true, "pinState": "READY" };

            return { "dongleFound": true, "pinState": resultSecondTry.pinState, "tryLeft": resultSecondTry.tryLeft };

        } catch (error) {

            return { "dongleFound": false };

        }

    }

    export async function run(
        deviceSocket: sip.Socket,
        request: Request
    ): Promise<Response> {

        debug("Run unlockDongle");

        let response = await apiOverSip.sendRequest(deviceSocket, methodName, request);

        debug("Response: ", { response });

        return response as Response;

    }

}