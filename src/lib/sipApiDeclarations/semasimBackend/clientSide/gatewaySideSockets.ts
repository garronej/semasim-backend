import { types as gwTypes } from "../../../../semasim-gateway";

export namespace notifyRouteFor {

    export const methodName= "notifyRouteFor";

    export type Params = {
        sims: string[];
        gatewaySocketRemoteAddresses: string[];
    };

    /** Sim for which we already have a route */
    export type Response= {
        rejectedSims: string[];
    };
    
}

export namespace notifyLostRouteFor {

    export const methodName= "notifyLostRouteFor";

    export type Params = {
        sims: string[];
        gatewaySocketRemoteAddress?: string;
    };

    export type Response= undefined;
    
}

export namespace qualifyContact {

    export const methodName= "qualifyContact";

    export type Params = gwTypes.Contact;

    /** isSuccess */
    export type Response= boolean;

}

export namespace destroyClientSocket {

    export const methodName= "destroyClientSocket";

    export type Params = gwTypes.Contact;

    export type Response= undefined;

}