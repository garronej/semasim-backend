import { types as dcTypes } from "chan-dongle-extended-client";
import * as apiDeclaration from "../../../sipApiDeclarations/semasimBackend/gatewaySide/clientSideSockets";
import * as store from "./store";
import * as sipLibrary from "ts-sip";
import * as web from "../../../clientSide/web";

export async function getDongles(
    gatewaySocketRemoteAddress: string
): Promise<dcTypes.Dongle[]> {

    let methodName = apiDeclaration.getDongles.methodName;
    type Params = apiDeclaration.getDongles.Params;
    type Response = apiDeclaration.getDongles.Response;

    let tasks: Promise<Response>[] = [];

    for (let gatewaySideSocket of store.get({ gatewaySocketRemoteAddress })) {

        tasks[tasks.length] = (async () => {

            try {

                return await sipLibrary.api.client.sendRequest<Params, Response>(
                    gatewaySideSocket,
                    methodName,
                    { gatewaySocketRemoteAddress },
                    { "timeout": 5 * 1000 }
                );

            } catch{

                return [];

            }

        })();

    }

    return (await Promise.all(tasks))
        .reduce((out, elem) => [...out, ...elem], []);

}

export async function unlockDongle(
    imei: string,
    pin: string,
    gatewaySocketRemoteAddress: string,
    auth: web.Auth
) {

    let methodName = apiDeclaration.unlockDongle.methodName;
    type Params = apiDeclaration.unlockDongle.Params;
    type Response = apiDeclaration.unlockDongle.Response;

    return new Promise<Response>(
        resolve => {

            let tasks: Promise<void>[] = [];

            for (let gatewaySideSocket of store.get({ gatewaySocketRemoteAddress })) {

                tasks[tasks.length] = (async () => {

                    let response: Response = undefined;

                    try {

                        response = await sipLibrary.api.client.sendRequest<Params, Response>(
                            gatewaySideSocket,
                            methodName,
                            { imei, pin, gatewaySocketRemoteAddress, auth },
                            { "timeout": 30 * 1000 }
                        );

                    } catch{ }

                    if (response !== undefined) {
                        resolve(response);
                    }

                })();

            }

            Promise.all(tasks).then(() => resolve(undefined));

        }
    );

}

export async function rebootDongle(
    imsi: string,
    auth: web.Auth
) {

    const methodName = apiDeclaration.rebootDongle.methodName;
    type Params = apiDeclaration.rebootDongle.Params;
    type Response = apiDeclaration.rebootDongle.Response;

    return (async (): Promise<Response> => {

        const gatewaySideSocket = store.get({ imsi });

        if (!gatewaySideSocket) {

            return { "isSuccess": false };

        }

        try {

            return await sipLibrary.api.client.sendRequest<Params, Response>(
                gatewaySideSocket,
                methodName,
                { imsi, auth },
                { "timeout": 6 * 1000 }
            );

        } catch{

            return { "isSuccess": false };

        }

    })();

}

export async function getSipPasswordAndDongle(
    imsi: string,
    gatewaySocketRemoteAddress?: string
) {

    const methodName = apiDeclaration.getSipPasswordAndDongle.methodName;
    type Params = apiDeclaration.getSipPasswordAndDongle.Params;
    type Response = apiDeclaration.getSipPasswordAndDongle.Response;

    return (async (): Promise<Response> => {

        let gatewaySideSocket = store.get({ imsi });

        if (!gatewaySideSocket) {
            return undefined;
        }

        if (!!gatewaySocketRemoteAddress) {

            if (!store.get({ gatewaySocketRemoteAddress }).has(gatewaySideSocket)) {
                return undefined;
            }

        }

        try {

            return await sipLibrary.api.client.sendRequest<Params, Response>(
                gatewaySideSocket,
                methodName,
                { imsi },
                { "timeout": 5 * 1000 }
            );

        } catch{

            return undefined;

        }


    })();

}

export async function reNotifySimOnline(
    imsi: string
): Promise<void> {

    const methodName = apiDeclaration.reNotifySimOnline.methodName;
    type Params = apiDeclaration.reNotifySimOnline.Params;
    type Response = apiDeclaration.reNotifySimOnline.Response;

    let gatewaySideSocket = store.get({ imsi });

    if (!gatewaySideSocket) {
        return;
    }

    try {

        await sipLibrary.api.client.sendRequest<Params, Response>(
            gatewaySideSocket,
            methodName,
            { imsi },
            { "timeout": 5 * 1000 }
        );

    } catch{ }

}

export async function createContact(
    imsi: string,
    name: string,
    number: string,
    auth: web.Auth
) {

    const methodName = apiDeclaration.createContact.methodName;
    type Params = apiDeclaration.createContact.Params;
    type Response = apiDeclaration.createContact.Response;

    return (async (): Promise<Response> => {

        const gatewaySideSocket = store.get({ imsi });

        if (!gatewaySideSocket) {

            return undefined;

        }

        try {

            return await sipLibrary.api.client.sendRequest<Params, Response>(
                gatewaySideSocket,
                methodName,
                { imsi, name, number, auth },
                { "timeout": 6 * 1000 }
            );

        } catch{

            return undefined;

        }

    })();


}

export async function updateContactName(
    imsi: string,
    contactRef: { mem_index: number; } | { number: string; },
    newName: string,
    auth: web.Auth
) {

    const methodName = apiDeclaration.updateContactName.methodName;
    type Params = apiDeclaration.updateContactName.Params;
    type Response = apiDeclaration.updateContactName.Response;

    return (async (): Promise<Response> => {

        const gatewaySideSocket = store.get({ imsi });

        if (!gatewaySideSocket) {
            return { "isSuccess": false };
        }

        try {

            return await sipLibrary.api.client.sendRequest<Params, Response>(
                gatewaySideSocket,
                methodName,
                { imsi, contactRef, newName, auth },
                { "timeout": 6 * 1000 }
            );


        } catch{

            return { "isSuccess": false };

        }

    })();

}


export async function deleteContact(
    imsi: string,
    contactRef: { mem_index: number; } | { number: string; },
    auth: web.Auth
) {

    const methodName = apiDeclaration.deleteContact.methodName;
    type Params = apiDeclaration.deleteContact.Params;
    type Response = apiDeclaration.deleteContact.Response;

    return (async (): Promise<Response> => {

        const gatewaySideSocket = store.get({ imsi });

        if (!gatewaySideSocket) {
            return { "isSuccess": false };
        }

        try {

            return await sipLibrary.api.client.sendRequest<Params, Response>(
                gatewaySideSocket,
                methodName,
                { imsi, contactRef, auth },
                { "timeout": 6 * 1000 }
            );

        } catch{

            return { "isSuccess": false };

        }

    })();

}