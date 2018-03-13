import { types as dcTypes } from "chan-dongle-extended-client";
import * as web from "../../../clientSide/web";

import { webApiDeclaration } from "../../../../semasim-frontend";

export namespace getDongles {

    export const methodName= "getDonglesConnectedFrom";

    export type Params = {
        gatewaySocketRemoteAddress: string;
    };

    export type Response= dcTypes.Dongle[];
    
}

export namespace unlockDongle {

    export const methodName= "unlockDongle";

    export type Params = {
        imei: string;
        pin: string;
        gatewaySocketRemoteAddress: string;
        auth: web.Auth
    };

    export type Response = 
        webApiDeclaration.unlockSim.Response | undefined;

}

export namespace getSipPasswordAndDongle {

    export const methodName= "getSipPasswordAndDongle";

    export type Params= { imsi: string; };

    export type Response= ({
        dongle: dcTypes.Dongle.Usable;
        sipPassword: string;
    }) | undefined;

}

export namespace reNotifySimOnline {

    export const methodName= "reNotifySimOnline";

    export type Params= { imsi: string; };

    export type Response= undefined;

}