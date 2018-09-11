

import { types as dcTypes } from "chan-dongle-extended-client";
import { types as gwTypes } from "../semasim-gateway";
import * as sessionManager from "../lib/web/sessionManager";

export namespace forwardRequest {

    export const methodName= "forwardRequest"; 

    export type Params<Params_>= {
        route: Route;
        methodName_: string;
        params_: Params_;
        timeout: number;
    };

    export type Route = Route.ToUa | Route.ToGateway;

    export namespace Route {

        export type ToUa= {
            target: "UA";
            email: string;
        };

        export type ToGateway= {
            target: "GATEWAY";
            imsi: string;
        };

    }

    /** When there is no route return an empty array */
    export type Response<Response_> = {
            status: "SUCCESS";
            response_: Response_;
        } | {
            status: "ERROR";
            message: string;
        } | {
            status: "NO ROUTE";
        };

}

export namespace notifyRoute {

    export const methodName = "notifyRoute";

    export type Params = {
        type: "ADD" | "DELETE";
        imsis?: string[];
        gatewayAddresses?: string[];
        emails?: string[];
        uaAddresses?: string[];
    };

    export type Response = undefined;

}

export namespace qualifyContact {

    export const methodName = "qualifyContact";

    export type Params = gwTypes.Contact;

    /** isSuccess */
    export type Response = boolean;

}

export namespace destroyUaSocket {

    export const methodName = "destroyClientSocket";

    export type Params = { connectionId: string; };

    export type Response = undefined;

}


export namespace collectDonglesOnLan {

    export const methodName= "connectDonglesOnLan";

    export type Params= { 
        gatewayAddress: string;
        auth: sessionManager.Auth; 
    };

    export type Response = dcTypes.Dongle[];

}

export namespace notifyDongleOnLanProxy {

    export const methodName= "notifyDongleOnLanProxy";

    export type Params= {
        gatewayAddress: string;
        dongle: dcTypes.Dongle;
    };

    export type Response= undefined;

}

export namespace notifyLoggedFromOtherTabProxy {

    export const methodName = "notifyLoggedFromOtherTabProxy";

    export type Params = { email: string; };

    export type Response = undefined;

}

export namespace unlockSimProxy {

    export const methodName= "unlockDongleProxy";

    export type Params = { 
        imei: string; 
        pin: string; 
        gatewayAddress: string;
    };

    export type Response = dcTypes.UnlockResult | undefined;

}
