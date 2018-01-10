
import { sipApi, sipLibrary } from "../semasim-gateway";

import protocol= sipApi.protocol;
import apiDeclaration= sipApi.gatewayDeclaration;

import { DongleController as Dc } from "chan-dongle-extended-client";
import * as sipProxy from "./sipProxy";
import { gatewaySockets } from "./sipProxy";

let sanityChecks: protocol.Client.SanityChecks = {};

export function init(gatewaySocket: sipLibrary.Socket) {
    new protocol.Client(gatewaySocket, 3600 * 1000, sanityChecks);
}

sanityChecks[apiDeclaration.getDongles.methodName] =
    response => {

        if (!(response instanceof Array)) {
            return false;
        }

        for (let dongle of response) {

            if (!Dc.Dongle.sanityCheck(dongle)) {

                console.log("sanity check get dongles failed");

                return false;
            }

        }

        return true;

    };

export async function getDongles(
    gatewaySocket: sipLibrary.Socket
): Promise<apiDeclaration.getDongles.Response> {

    let methodName = apiDeclaration.getDongles.methodName;

    let params: apiDeclaration.getDongles.Params = undefined;

    try {

        return await protocol.Client.getFromSocket(gatewaySocket)
            .sendRequest(methodName, params, 3000);

    } catch{

        console.log("error get dongles");

        return [];

    }

}


sanityChecks[apiDeclaration.unlockDongle.methodName] =
    Dc.UnlockResult.sanityCheck;

export async function unlockDongle(
    gatewaySocket: sipLibrary.Socket,
    imei: string,
    pin: string
): Promise<apiDeclaration.unlockDongle.Response | undefined> {

    let methodName = apiDeclaration.unlockDongle.methodName;

    let params: apiDeclaration.unlockDongle.Params = { imei, pin };

    try {

        return await protocol.Client.getFromSocket(gatewaySocket)
            .sendRequest(methodName, params, 20 * 1000);

    } catch{

        return undefined;

    }

}

sanityChecks[apiDeclaration.reNotifySimOnline.methodName] =
    response => response === undefined;


export async function reNotifySimOnline(
    gatewaySocket: sipLibrary.Socket,
    imsi: string
): Promise<apiDeclaration.reNotifySimOnline.Response> {

    let methodName = apiDeclaration.reNotifySimOnline.methodName;

    let params: apiDeclaration.reNotifySimOnline.Params = { imsi };

    protocol.Client.getFromSocket(gatewaySocket)
        .sendRequest(methodName, params, 5 * 1000)
        .catch(() => { })
        ;

    return undefined;

}


