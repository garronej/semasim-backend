import { LockedDongle, DongleActive,  DongleExtendedClient } from "chan-dongle-extended-client";
import * as sipApiFramework from "./tools/sipApiFramework";
import * as sipLibrary from "./tools/sipLibrary";
import { gatewaySockets, qualifyContact } from "./backendSipProxy";
import { asterisk as dbAsterisk } from "./dbInterface";

import * as _debug from "debug";
let debug = _debug("_gatewaySipApi");

export function startListening(backendSocket: sipLibrary.Socket) {

    let evt = sipApiFramework.startListening(backendSocket);

    evt.attach(
        async ({ method, payload, sendResponse }) => {

            let response: Record<string, any>={};

            switch (method) {
                case unlockDongle.methodName:
                    response= await unlockDongle.handle(payload as unlockDongle.Request);
                    break;
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
        gatewaySocket: sipLibrary.Socket,
        imei: string
    ): Promise<Response> {

        let payload: Request= { imei };

        let response = await sipApiFramework.sendRequest(gatewaySocket, methodName, payload);

        return response as Response;

    }



}

export namespace doesDongleHasSim{

    export const methodName= "doesDongleHasSIm";

    export interface Request {
        imei: string;
        last_four_digits_of_iccid: string;
    }

    export interface Response {
        value: boolean | "MAYBE";
    }

    export async function handle(
        { imei, last_four_digits_of_iccid }: Request
    ): Promise<Response> {

        let dongleClient= DongleExtendedClient.localhost();

        let dongle= await dongleClient.getActiveDongle(imei);

        if( 
            dongle && 
            ( dongle.imei.substring(imei.length - 4) === last_four_digits_of_iccid )
        ) return { "value": true };

        let lockedDongle= (await dongleClient.getLockedDongles()).filter( d => d.imei === imei).pop();

        if( !lockedDongle ) return { "value": false };

        if( lockedDongle.iccid.substring(lockedDongle.iccid.length - 4) === last_four_digits_of_iccid )
            return { "value": true };
        else
            return { "value": "MAYBE" };

    }

    export async function run(
        gatewaySocket: sipLibrary.Socket,
        imei: string,
        last_four_digits_of_iccid: string
    ): Promise<Response["value"]> {

        let payload: Request= { imei, last_four_digits_of_iccid };

        let response = await sipApiFramework.sendRequest(gatewaySocket, methodName, payload);

        return (response as Response).value;

    }



}


export namespace unlockDongle {

    export const methodName = "unlockDongle";

    export interface Request {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try: string;
        pin_second_try?: string;
    }


    export type Response = {
        dongleFound: true;
        pinState: LockedDongle["pinState"];
        tryLeft: number;
    }| {
        dongleFound: false;
    } | {
        dongleFound: true;
        pinState: "READY";
        iccid: string;
        number: string | undefined;
        serviceProvider: string | undefined;
    }

    function isValidPass(iccid: string, last_four_digits_of_iccid: string){
        return !iccid || iccid.substring(iccid.length - 4) === last_four_digits_of_iccid;
    }


    export async function handle(
        { imei, last_four_digits_of_iccid, pin_first_try, pin_second_try }: Request,
    ): Promise<Response> {

        debug("unlockDongle");

        let dongleClient = DongleExtendedClient.localhost();

        try {

            let activeDongle = await dongleClient.getActiveDongle(imei);

            if (activeDongle) {

                if (!isValidPass(activeDongle.iccid, last_four_digits_of_iccid))
                    throw new Error("ICCID does not match");

                return { 
                    "dongleFound": true, 
                    pinState: "READY", 
                    "iccid": activeDongle.iccid,
                    "number": activeDongle.number, 
                    "serviceProvider": activeDongle.serviceProvider 
                };

            }

            let [lockedDongle] = (await dongleClient.getLockedDongles())
            .filter(
                lockedDongle => {

                    if (lockedDongle.imei !== imei) return false;

                    if ( !isValidPass(lockedDongle.iccid, last_four_digits_of_iccid) )
                        return false;

                    return true;

                }
            );

            if (lockedDongle.pinState !== "SIM PIN" || lockedDongle.tryLeft !== 3)
                return { "dongleFound": true, "pinState": "SIM PIN", "tryLeft": lockedDongle.tryLeft };

            let attemptUnlock = async (pin: string): Promise<LockedDongle | DongleActive> => {

                await dongleClient.unlockDongle(imei, pin_first_try);

                return await Promise.race([
                    dongleClient.evtNewActiveDongle.waitFor(newActiveDongle => newActiveDongle.imei === imei),
                    dongleClient.evtRequestUnlockCode.waitFor(lockedDongle => lockedDongle.imei === imei)
                ]);

            };

            let matchLocked = (dongle: LockedDongle | DongleActive): dongle is LockedDongle => dongle["pinState"];

            let resultFirstTry = await attemptUnlock(pin_first_try);

            if (!matchLocked(resultFirstTry))
                return { 
                    "dongleFound": true, 
                    "pinState": "READY",
                    "iccid": resultFirstTry.iccid,
                    "number": resultFirstTry.number,
                    "serviceProvider": resultFirstTry.serviceProvider
                };

            if (!pin_second_try)
                return { 
                    "dongleFound": true, 
                    "pinState": resultFirstTry.pinState, 
                    "tryLeft": resultFirstTry.tryLeft 
                };

            let resultSecondTry = await attemptUnlock(pin_second_try);

            if (!matchLocked(resultSecondTry))
                return { 
                    "dongleFound": true, 
                    "pinState": "READY",
                    "iccid": resultSecondTry.iccid,
                    "number": resultSecondTry.number,
                    "serviceProvider": resultSecondTry.serviceProvider
                };

            return { 
                "dongleFound": true, 
                "pinState": resultSecondTry.pinState, 
                "tryLeft": resultSecondTry.tryLeft 
            };

        } catch (error) {

            debug(error.message);

            return { "dongleFound": false };

        }

    }

    export async function run(
        gatewaySocket: sipLibrary.Socket,
        request: Request
    ): Promise<Response> {

        debug("Run unlockDongle");

        let response = await sipApiFramework.sendRequest(gatewaySocket, methodName, request);

        debug("Response: ", { response });

        return response as Response;

    }

}