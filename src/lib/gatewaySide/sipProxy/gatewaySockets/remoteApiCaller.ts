import { SyncEvent } from "ts-events-extended";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as web from "../../../clientSide/web";
import { declarationBackendSocketApi as apiDeclaration } from "../../../../semasim-gateway";
import * as store from "./store";
import { sipLibrary } from "../../../../semasim-gateway";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";

export async function getDongles(
    fromGatewayRemoteAddress: string
): Promise<dcTypes.Dongle[]> {

    let methodName = apiDeclaration.getDongles.methodName;
    type Params = apiDeclaration.getDongles.Params;
    type Response = apiDeclaration.getDongles.Response;

    const sanityCheck = (response: Response) => {

        if (!(response instanceof Array)) {
            return false;
        }

        for (let dongle of response) {

            if (!dcSanityChecks.dongle(dongle)) {
                return false;
            }

        }

        return true;

    };


    let tasks: Promise<Response>[] = [];

    for (let gatewaySocket of (store.byRemoteAddress.get(fromGatewayRemoteAddress) || new Set())) {

        tasks[tasks.length] = (async () => {

            try {

                return await sipLibrary.api.client.sendRequest<Params, Response>(
                    gatewaySocket,
                    methodName,
                    undefined,
                    {
                        "timeout": 5 * 1000,
                        sanityCheck
                    }
                );

            } catch{

                return [];

            }

        })();

    }

    return (await Promise.all(tasks))
        .reduce((out, elem) => [...out, ...elem], []);

}

function whoHasLockedDongle(
    gatewaySocketRemoteAddress: string,
    imei: string
): Promise<sipLibrary.Socket | undefined> {

    let methodName = apiDeclaration.whoHasLockedDongle.methodName;
    type Params = apiDeclaration.whoHasLockedDongle.Params;
    type Response = apiDeclaration.whoHasLockedDongle.Response;

    const sanityCheck = (response: Response) =>
        response === "I" || response === undefined;

    return new Promise<sipLibrary.Socket | undefined>(
        resolve => {

            let tasks: Promise<void>[] = [];

            for (let gatewaySocket of (store.byRemoteAddress.get(gatewaySocketRemoteAddress) || new Set())) {

                tasks[tasks.length] = (async () => {

                    let doHas: boolean = false;

                    try {

                        doHas = !!(await sipLibrary.api.client.sendRequest<Params, Response>(
                            gatewaySocket,
                            methodName,
                            { imei },
                            {
                                "timeout": 5 * 1000,
                                sanityCheck
                            }
                        ));

                    } catch{ }

                    if (doHas) {
                        resolve(gatewaySocket);
                    }

                })();

            }

            Promise.all(tasks).then(() => resolve(undefined));

        }
    );

}

export async function unlockDongle(
    gatewaySocketRemoteAddress: string,
    imei: string,
    pin: string,
): Promise<dcTypes.UnlockResult | undefined> {

    let methodName = apiDeclaration.unlockDongle.methodName;
    type Params = apiDeclaration.unlockDongle.Params;
    type Response = apiDeclaration.unlockDongle.Response;

    const sanityCheck= (response: Response)=> 
        response === undefined ? true : dcSanityChecks.unlockResult(response);

    let gatewaySocket = await whoHasLockedDongle(gatewaySocketRemoteAddress, imei);

    if (!gatewaySocket) {

        return undefined;

    }

    try {

        return await sipLibrary.api.client.sendRequest<Params, Response>(
            gatewaySocket,
            methodName,
            { imei, pin },
            { 
                "timeout": 30 * 1000,
                sanityCheck
            }
        );

    } catch{

        return undefined;

    }

}

export async function getSipPasswordAndDongle(
    imsi: string
) {

    let methodName = apiDeclaration.getSipPasswordAndDongle.methodName;
    type Params = apiDeclaration.getSipPasswordAndDongle.Params;
    type Response = apiDeclaration.getSipPasswordAndDongle.Response;

    const sanityCheck= (response: Response)=> (
        response instanceof Object &&
        dcSanityChecks.dongle(response.dongle) &&
        typeof response.sipPassword === "string" &&
        !!response.sipPassword.match(/^[0-9a-f]{32}$/)
    );


    let gatewaySocket = store.byImsi.get(imsi);

    if (!gatewaySocket) {
        return undefined;
    }

    try {

        return await sipLibrary.api.client.sendRequest<Params, Response>(
            gatewaySocket,
            methodName,
            { imsi },
            { 
                "timeout": 5 * 1000,
                sanityCheck
             }
        );

    } catch{

        return undefined;

    }


}

export async function reNotifySimOnline(
    imsi: string
): Promise<void> {

    let methodName = apiDeclaration.reNotifySimOnline.methodName;
    type Params = apiDeclaration.reNotifySimOnline.Params;
    type Response = apiDeclaration.reNotifySimOnline.Response;

    let gatewaySocket = store.byImsi.get(imsi);

    if (!gatewaySocket) {
        return;
    }

    try {

        await sipLibrary.api.client.sendRequest<Params, Response>(
            gatewaySocket,
            methodName,
            { imsi },
            { 
                "timeout": 5 * 1000,
                "sanityCheck": response => response === undefined
            }
        );

    } catch{

        return;

    }

}



export async function waitForUsableDongle(
    imei: string,
    timeout: number
): Promise<waitForUsableDongle.EventData> {

    let evt = new SyncEvent<waitForUsableDongle.EventData>();

    waitForUsableDongle.__waited.set(imei, evt);

    let out: waitForUsableDongle.EventData | Error;

    try {

        out = await evt.waitFor(timeout);

    } catch (error) {

        out = error;

    }

    waitForUsableDongle.__waited.delete(imei);

    if (out instanceof Error) {
        throw out;
    } else {
        return out;
    }

}

export namespace waitForUsableDongle {

    export type EventData = {
        dongle: dcTypes.Dongle.Usable;
        simOwner: web.Auth | undefined;

    };

    export const __waited = new Map<string, SyncEvent<EventData>>();

}

