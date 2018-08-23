import { types as dcTypes } from "chan-dongle-extended-client";
import * as web from "../lib/clientSide/web";
import { types as feTypes } from "../semasim-frontend";


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


    export type Response = feTypes.unlockSim_Response | undefined;

}

export namespace rebootDongle {

    export const methodName= "rebootDongle";

    export type Params = { imsi: string; auth: web.Auth; };

    export type Response= { isSuccess: boolean; };

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

export namespace createContact {

    export const methodName = "createContact";

    export type Params = { imsi: string; name: string; number: string; auth: web.Auth; };

    /** undefined when a contact with number already exist or user does not have access to this sim */
    export type Response = { mem_index: number | null; } | undefined;

}

export namespace updateContactName {

    export const methodName= "updateContactName";

    export type Params = { 
        imsi: string; 
        contactRef: { mem_index: number } | { number: string; }; 
        newName: string; 
        auth: web.Auth;
    };

    export type Response= { isSuccess: boolean; };

}

export namespace deleteContact {

    export const methodName= "deleteContact";

    export type Params = { 
        imsi: string; 
        contactRef: { mem_index: number } | { number: string; }; 
        auth: web.Auth;
    };

    export type Response= { isSuccess: boolean; };

}