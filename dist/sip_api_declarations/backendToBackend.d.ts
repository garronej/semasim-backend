import { types as dcTypes } from "chan-dongle-extended-client";
import { types as gwTypes } from "../gateway";
import * as sessionManager from "../lib/web/sessionManager";
export declare namespace forwardRequest {
    const methodName = "forwardRequest";
    type Params<Params_> = {
        route: Route;
        methodName_: string;
        params_: Params_;
        timeout: number;
    };
    type Route = Route.ToUa | Route.ToGateway;
    namespace Route {
        type ToUa = {
            target: "UA";
            email: string;
        };
        type ToGateway = {
            target: "GATEWAY";
            imsi: string;
        };
    }
    /** When there is no route return an empty array */
    type Response<Response_> = {
        status: "SUCCESS";
        response_: Response_;
    } | {
        status: "ERROR";
        message: string;
    } | {
        status: "NO ROUTE";
    };
}
export declare namespace notifyRoute {
    const methodName = "notifyRoute";
    type Params = {
        type: "ADD" | "DELETE";
        imsis?: string[];
        gatewayAddresses?: string[];
        emails?: string[];
        uaAddresses?: string[];
    };
    type Response = undefined;
}
export declare namespace qualifyContact {
    const methodName = "qualifyContact";
    type Params = gwTypes.Contact;
    /** isSuccess */
    type Response = boolean;
}
export declare namespace destroyUaSocket {
    const methodName = "destroyClientSocket";
    type Params = {
        connectionId: string;
    };
    type Response = undefined;
}
export declare namespace collectDonglesOnLan {
    const methodName = "connectDonglesOnLan";
    type Params = {
        gatewayAddress: string;
        auth: sessionManager.Auth;
    };
    type Response = dcTypes.Dongle[];
}
export declare namespace notifyDongleOnLanProxy {
    const methodName = "notifyDongleOnLanProxy";
    type Params = {
        gatewayAddress: string;
        dongle: dcTypes.Dongle;
    };
    type Response = undefined;
}
export declare namespace notifyLoggedFromOtherTabProxy {
    const methodName = "notifyLoggedFromOtherTabProxy";
    type Params = {
        email: string;
    };
    type Response = undefined;
}
export declare namespace unlockSimProxy {
    const methodName = "unlockDongleProxy";
    type Params = {
        imei: string;
        pin: string;
        gatewayAddress: string;
    };
    type Response = dcTypes.UnlockResult | undefined;
}
