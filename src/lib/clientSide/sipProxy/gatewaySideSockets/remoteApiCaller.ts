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

    for (let gatewaySideSocket of store.get({ gatewaySocketRemoteAddress }) ) {

        tasks[tasks.length] = (async () => {

            try {

                return await sipLibrary.api.client.sendRequest<Params, Response>(
                    gatewaySideSocket,
                    methodName,
                    {gatewaySocketRemoteAddress},
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

export async function getSipPasswordAndDongle(
    imsi: string,
    gatewaySocketRemoteAddress?: string
) {

    let methodName = apiDeclaration.getSipPasswordAndDongle.methodName;
    type Params = apiDeclaration.getSipPasswordAndDongle.Params;
    type Response = apiDeclaration.getSipPasswordAndDongle.Response;

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

}

export async function reNotifySimOnline(
    imsi: string
): Promise<void>{

    let methodName = apiDeclaration.reNotifySimOnline.methodName;
    type Params = apiDeclaration.reNotifySimOnline.Params;
    type Response = apiDeclaration.reNotifySimOnline.Response;

    let gatewaySideSocket= store.get({ imsi });

    if(!gatewaySideSocket ){

        return undefined;

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

}