
import { DongleExtendedClient } from "chan-dongle-extended-client";
import { subscribeContext } from "./dbInterface";

import * as _debug from "debug";
let debug = _debug("_pjsip/presence");

export type DeviceState= "UNKNOWN" | 
"NOT_INUSE" | 
"INUSE" | 
"BUSY" | 
"INVALID" | 
"UNAVAILABLE" | 
"RINGING" | 
"RINGINUSE" | 
"ONHOLD";

export async function setDevicePresence( imei: string, deviceState: DeviceState) {

    debug(`Set dongle presence ${imei}: ${deviceState}`);

    await DongleExtendedClient.localhost().ami.setVar(
        `DEVICE_STATE(Custom:${imei})`,
        deviceState
    );

}

export async function enableDevicePresenceNotification(imei: string) {

    debug(`Enable presence notification for dongle ${imei}`);

    await DongleExtendedClient.localhost().ami.dialplanExtensionAdd(
        subscribeContext(imei),
        "_.",
        "hint",
        `Custom:${imei}`
    );

}
