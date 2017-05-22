
import { DongleExtendedClient } from "chan-dongle-extended-client";

export type DeviceState= "UNKNOWN" | 
"NOT_INUSE" | 
"INUSE" | 
"BUSY" | 
"INVALID" | 
"UNAVAILABLE" | 
"RINGING" | 
"RINGINUSE" | 
"ONHOLD";

export async function setPresence( device: string, deviceState: DeviceState) {

    console.log(`set presence ${device}: ${deviceState}`);

    await DongleExtendedClient.localhost().ami.setVar(
        `DEVICE_STATE(Custom:${device})`,
        deviceState
    );

}
