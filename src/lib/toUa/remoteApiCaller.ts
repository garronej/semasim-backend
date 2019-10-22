import * as sip from "ts-sip";
import { apiDeclaration } from "../../sip_api_declarations/uaToBackend";
import * as backendRemoteApiCaller from "../toBackend/remoteApiCaller";
import { types as dcTypes } from "chan-dongle-extended-client";
import { types as gwTypes } from "../../gateway";

function multicast<Params, Response extends undefined>(
    methodName: string,
    params: Params,
    uas: gwTypes.Ua[]
): Promise<void> {

    return Promise.all(
        uas.map(
            ua =>
                backendRemoteApiCaller.forwardRequest<Params, Response>(
                    { "target": "UA", "uaInstanceId": ua.instance },
                    methodName,
                    params,
                    { "timeout": 5 * 1000, }
                ).catch(() => { })
        )
    ).then(() => { });

}

export const notifySimOffline = (() => {

    const methodName = apiDeclaration.notifySimOffline.methodName;
    type Params = apiDeclaration.notifySimOffline.Params;
    type Response = apiDeclaration.notifySimOffline.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (imsi: string, uas: gwTypes.Ua[]): Promise<void> =>  
         multicast<Params, Response>(methodName, { imsi }, uas);

})();

export const notifySimOnline = (() => {

    const methodName = apiDeclaration.notifySimOnline.methodName;
    type Params = apiDeclaration.notifySimOnline.Params;
    type Response = apiDeclaration.notifySimOnline.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (params: Params, uas: gwTypes.Ua[]): Promise<void> => 
        multicast<Params, Response>(methodName, params, uas);

})();

export const notifyGsmConnectivityChange = (() => {

    const { methodName } = apiDeclaration.notifyGsmConnectivityChange;
    type Params = apiDeclaration.notifyGsmConnectivityChange.Params;
    type Response = apiDeclaration.notifyGsmConnectivityChange.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (params: Params, uas: gwTypes.Ua[]): Promise<void> => 
         multicast<Params, Response>(methodName, params, uas);

})();

export const notifyCellSignalStrengthChange = (() => {

    const { methodName } = apiDeclaration.notifyCellSignalStrengthChange;
    type Params = apiDeclaration.notifyCellSignalStrengthChange.Params;
    type Response = apiDeclaration.notifyCellSignalStrengthChange.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (params: Params, uas: gwTypes.Ua[]): Promise<void> => 
         multicast<Params, Response>(methodName, params, uas);

})();

export const notifyOngoingCall = (() => {

    const { methodName } = apiDeclaration.notifyOngoingCall;
    type Params = apiDeclaration.notifyOngoingCall.Params;
    type Response = apiDeclaration.notifyOngoingCall.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (params: Params, uas: gwTypes.Ua[]): Promise<void> =>
        multicast<Params, Response>(methodName, params, uas);

})();


export const notifyContactCreatedOrUpdated = (() => {

    const methodName = apiDeclaration.notifyContactCreatedOrUpdated.methodName;
    type Params = apiDeclaration.notifyContactCreatedOrUpdated.Params;
    type Response = apiDeclaration.notifyContactCreatedOrUpdated.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (params: Params, uas: gwTypes.Ua[]): Promise<void> =>
        multicast<Params, Response>(methodName, params, uas);

})();

export const notifyContactDeleted = (() => {

    const methodName = apiDeclaration.notifyContactDeleted.methodName;
    type Params = apiDeclaration.notifyContactDeleted.Params;
    type Response = apiDeclaration.notifyContactDeleted.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (params: Params, uas: gwTypes.Ua[]): Promise<void> =>
        multicast<Params, Response>(methodName, params, uas);

})();

export const notifyDongleOnLan = (() => {

    const methodName = apiDeclaration.notifyDongleOnLan.methodName;
    type Params = apiDeclaration.notifyDongleOnLan.Params;
    type Response = apiDeclaration.notifyDongleOnLan.Response;

    /** Callable from anywhere */
    function f(dongle: dcTypes.Dongle, gatewayAddress: string): Promise<void>;
    /** Callable only on process holding the connection */
    function f(dongle: dcTypes.Dongle, uaSocket: sip.Socket): Promise<void>;
    function f(dongle: dcTypes.Dongle, arg: sip.Socket | string): Promise<void> {

        if (typeof arg === "string") {

            const gatewayAddress = arg;

            return backendRemoteApiCaller.notifyDongleOnLanProxy(
                dongle, gatewayAddress
            );

        } else {

            const uaSocket = arg;

            return sip.api.client.sendRequest<Params, Response>(
                uaSocket,
                methodName,
                dongle,
                {
                    "timeout": 5 * 1000,
                    "sanityCheck": response => response === undefined
                }
            ).catch(() => { });

        }

    }

    return f;

})();

export const notifySimPermissionLost = (() => {

    const methodName = apiDeclaration.notifySimPermissionLost.methodName;
    type Params = apiDeclaration.notifySimPermissionLost.Params;
    type Response = apiDeclaration.notifySimPermissionLost.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (imsi: string, uas: gwTypes.Ua[]): Promise<void> =>
        multicast<Params, Response>(methodName, { imsi }, uas);

})();

export const notifySimSharingRequest = (() => {

    const { methodName } = apiDeclaration.notifySimSharingRequest;
    type Params = apiDeclaration.notifySimSharingRequest.Params;
    type Response = apiDeclaration.notifySimSharingRequest.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    function f(userSim: Params, uas: gwTypes.Ua[]): Promise<void>;
    function f(userSim: Params, socket: sip.Socket): Promise<void>;
    function f(userSim: Params, uasOrSocket: gwTypes.Ua[] | sip.Socket): Promise<void> {

        if( uasOrSocket instanceof Array ){

            const uas= uasOrSocket;

            return multicast<Params, Response>(methodName, userSim, uas);

        }else{

            const socket = uasOrSocket;

            return sip.api.client.sendRequest<Params, Response>(
                socket,
                methodName,
                userSim,
                {
                    "timeout": 5 * 1000,
                    "sanityCheck": response => response === undefined
                }
            ).catch(() => { });

        }


    }

    return f;

})();

export const notifySharingRequestResponse = (() => {

    const { methodName } = apiDeclaration.notifySharingRequestResponse;
    type Params = apiDeclaration.notifySharingRequestResponse.Params;
    type Response = apiDeclaration.notifySharingRequestResponse.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (params: Params, uas: gwTypes.Ua[]): Promise<void> =>
        multicast<Params, Response>(methodName, params, uas);

})();

export const notifyOtherSimUserUnregisteredSim = (() => {

    const { methodName } = apiDeclaration.notifyOtherSimUserUnregisteredSim;
    type Params = apiDeclaration.notifyOtherSimUserUnregisteredSim.Params;
    type Response = apiDeclaration.notifyOtherSimUserUnregisteredSim.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (params: Params, uas: gwTypes.Ua[]): Promise<void> =>
        multicast<Params, Response>(methodName, params, uas);

})();

export const notifyLoggedFromOtherTab = (() => {

    const methodName = apiDeclaration.notifyLoggedFromOtherTab.methodName;
    type Params = apiDeclaration.notifyLoggedFromOtherTab.Params;
    type Response = apiDeclaration.notifyLoggedFromOtherTab.Response;

    /** Callable from anywhere */
    function f(uaInstanceId: string): Promise<void>;
    /** Callable only on process holding the connection */
    function f(uaSocket: sip.Socket): Promise<void>;
    function f(arg: sip.Socket | string): Promise<void> {

        if (typeof arg === "string") {

            const uaInstanceId = arg;

            return backendRemoteApiCaller.notifyLoggedFromOtherTabProxy(
                uaInstanceId
            );

        } else {

            const uaSocket = arg;

            return sip.api.client.sendRequest<Params, Response>(
                uaSocket,
                methodName,
                undefined,
                {
                    "timeout": 3 * 1000,
                    "sanityCheck": response => response === undefined
                }
            ).catch(() => { })
                .then(() => uaSocket.destroy("opened on other tab"));

        }

    }

    return f;

})();

export const notifyIceServer = (() => {

    const methodName = apiDeclaration.notifyIceServer.methodName;
    type Params = apiDeclaration.notifyIceServer.Params;
    type Response = apiDeclaration.notifyIceServer.Response;

    return async (uaSocket: sip.Socket, iceServer: Params): Promise<void> => {

        return sip.api.client.sendRequest<Params, Response>(
            uaSocket,
            methodName,
            iceServer,
            {
                "timeout": 3 * 1000,
                "sanityCheck": response => response === undefined
            }
        ).catch(() => { });

    };

})();

