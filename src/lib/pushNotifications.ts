import { types as gwTypes } from "../semasim-gateway";
import * as pushSender from "../tools/pushSender";
import * as i from "../bin/installer";

export function launch() {

    pushSender.launch(i.pushNotificationCredentials);

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

/** Return true if everything goes as expected */
export async function send(
    uas: gwTypes.Ua[],
    payload: Payload
): Promise<void> {

    /*
     * NOTE IMPLEMENTATION IOS: 
     * 
     * Until commit 53957ba1e4344593caf42feba24df48520c2f954 we had
     * a mechanism that prevented to send multiple push notification 
     * simultaneously to the same UA.
     * For android we had no delay, for iOS we had 10 seconds.
     * 
     */

    const mobileUas= uas.filter(({ platform })=> platform !== "web");

    const androidUas= mobileUas.filter(({ platform }) => platform === "android" );
    const iosUas= mobileUas.filter(({ platform })=> platform === "iOS" );

    return Promise.all([
        pushSender.send("android", androidUas.map(({ pushToken })=> pushToken ), payload),
        pushSender.send("iOS", iosUas.map(({ pushToken })=> pushToken ), payload)
    ]).then(()=> {});

}


