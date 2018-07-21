import { SyncEvent } from "ts-events-extended";
import { types as dcTypes } from "chan-dongle-extended-client";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import * as web from "../../../clientSide/web";
import { declarationBackendSocketApi as apiDeclaration } from "../../../../semasim-gateway";
import * as store from "./store";
import * as sipLibrary from "ts-sip";

export async function getDongles(
    fromGatewayRemoteAddress: string
): Promise<dcTypes.Dongle[]> {

    const methodName = apiDeclaration.getDongles.methodName;
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
) {

    const methodName = apiDeclaration.whoHasLockedDongle.methodName;
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
) {

    let methodName = apiDeclaration.unlockDongle.methodName;
    type Params = apiDeclaration.unlockDongle.Params;
    type Response = apiDeclaration.unlockDongle.Response;

    const sanityCheck = (response: Response) =>
        response === undefined ? true : dcSanityChecks.unlockResult(response);

    return (async (): Promise<Response> => {

        const gatewaySocket = await whoHasLockedDongle(gatewaySocketRemoteAddress, imei);

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

    })();

}

export async function rebootDongle( imsi: string){

    const methodName = apiDeclaration.rebootDongle.methodName;
    type Params = apiDeclaration.rebootDongle.Params;
    type Response = apiDeclaration.rebootDongle.Response;

    const sanityCheck = (response: Response) => (
        response instanceof Object &&
        typeof response.isSuccess === "boolean"
    );

    return (async (): Promise<Response> => {

        const gatewaySocket = store.byImsi.get(imsi);

        if (!gatewaySocket) {

            return { "isSuccess": false };

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

            return { "isSuccess": false };

        }

    })();

}



export async function getSipPasswordAndDongle(
    imsi: string
) {

    let methodName = apiDeclaration.getSipPasswordAndDongle.methodName;
    type Params = apiDeclaration.getSipPasswordAndDongle.Params;
    type Response = apiDeclaration.getSipPasswordAndDongle.Response;

    const sanityCheck = (response: Response) => (
        response instanceof Object &&
        dcSanityChecks.dongle(response.dongle) &&
        typeof response.sipPassword === "string" &&
        !!response.sipPassword.match(/^[0-9a-f]{32}$/)
    );

    return (async (): Promise<Response> => {

        const gatewaySocket = store.byImsi.get(imsi);

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

    })();

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

export async function createContact(
    imsi: string, name: string, number: string
) {

    const methodName = apiDeclaration.createContact.methodName;
    type Params = apiDeclaration.createContact.Params;
    type Response = apiDeclaration.createContact.Response;

    const sanityCheck = (response: Response) => (
        response === undefined ||
        (
            response instanceof Object &&
            typeof response.mem_index === "number" &&
            typeof response.name_as_stored === "string" &&
            dcSanityChecks.md5(response.new_storage_digest)
        )
    );

    return (async (): Promise<Response> => {

        let gatewaySocket = store.byImsi.get(imsi);

        if (!gatewaySocket) {
            return undefined;
        }

        try {

            return await sipLibrary.api.client.sendRequest<Params, Response>(
                gatewaySocket,
                methodName,
                { imsi, name, number },
                {
                    "timeout": 6 * 1000,
                    sanityCheck
                }
            );

        } catch{

            return undefined;

        }

    })();

}

export async function updateContactName(
    imsi: string, 
    mem_index: number,
    newName: string
) {

    const methodName = apiDeclaration.updateContactName.methodName;
    type Params = apiDeclaration.updateContactName.Params;
    type Response = apiDeclaration.updateContactName.Response;

    const sanityCheck = (response: Response) => (
        response === undefined ||
        (
            response instanceof Object &&
            typeof response.new_name_as_stored === "string" &&
            dcSanityChecks.md5(response.new_storage_digest)
        )
    );

    return (async (): Promise<Response> => {

        let gatewaySocket = store.byImsi.get(imsi);

        if (!gatewaySocket) {
            return undefined;
        }

        try {

            return await sipLibrary.api.client.sendRequest<Params, Response>(
                gatewaySocket,
                methodName,
                { imsi, mem_index, newName },
                {
                    "timeout": 6 * 1000,
                    sanityCheck
                }
            );

        } catch{

            return undefined;

        }

    })();

}

export async function deleteContact(
    imsi: string, 
    mem_index: number
) {

    const methodName = apiDeclaration.deleteContact.methodName;
    type Params = apiDeclaration.deleteContact.Params;
    type Response = apiDeclaration.deleteContact.Response;

    const sanityCheck = (response: Response) => (
        response === undefined ||
        (
            response instanceof Object &&
            dcSanityChecks.md5(response.new_storage_digest)
        )
    );

    return (async (): Promise<Response> => {

        let gatewaySocket = store.byImsi.get(imsi);

        if (!gatewaySocket) {
            return undefined;
        }

        try {

            return await sipLibrary.api.client.sendRequest<Params, Response>(
                gatewaySocket,
                methodName,
                { imsi, mem_index },
                {
                    "timeout": 6 * 1000,
                    sanityCheck
                }
            );

        } catch{

            return undefined;

        }

    })();

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

