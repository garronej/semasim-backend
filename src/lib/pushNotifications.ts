import { types as gwTypes } from "../gateway";
import * as pushSender from "../tools/pushSender";
import { deploy } from "../deploy";
import { buildNoThrowProxyFunction } from "../tools/noThrow";
import * as logger from "logger";

const debug= logger.debugFactory();

export function launch() {

    pushSender.launch(deploy.pushNotificationCredentials);

}

export type Payload =
    Payload.ReloadConfig |
    Payload.WakeUp |
    Payload.ReRegisterOnNewConnection |
    Payload.SimConnectivity ;


export namespace Payload {

    export type ReloadConfig = {
        type: "RELOAD CONFIG";
    };

    export type WakeUp = {
        type: "WAKE UP";
        imsi: string;
    };

    export type ReRegisterOnNewConnection = {
        type: "RE REGISTER ON NEW CONNECTION";
    };

    export type SimConnectivity = {
        type: "SIM CONNECTIVITY";
        isOnline: "0" | "1";
        imsi: string;
    };

}

async function send(
    uas: gwTypes.Ua[],
    payload: Payload
): Promise<void> {

    /*
     * NOTE IMPLEMENTATION IOS: 
     * 
     * Until commit 53957ba1e4344593caf42feba24df48520c2f954 we had
     * a mechanism that prevented to send multiple push notification 
     * simultaneously to the same UA.
     * For android we had no delay, for ios we had 10 seconds.
     * 
     */

    const mobileUas = uas.filter(({ platform }) => platform !== "web");

    const androidUas = mobileUas.filter(({ platform }) => platform === "android");

    debug("send push notification", JSON.stringify({ androidUas, payload }, null, 2));

    const iosUas = mobileUas.filter(({ platform }) => platform === "ios");

    await Promise.all([
        pushSender.send("android", androidUas.map(({ pushToken }) => pushToken), payload),
        pushSender.send("ios", iosUas.map(({ pushToken }) => pushToken), payload)
    ]).then(() => { });


}

export const sendSafe = buildNoThrowProxyFunction(send);


