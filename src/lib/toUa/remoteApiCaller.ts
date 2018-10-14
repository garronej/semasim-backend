import * as sip from "ts-sip";
import { apiDeclaration } from "../../sip_api_declarations/uaToBackend";
import * as backendRemoteApiCaller from "../toBackend/remoteApiCaller";
import { types as dcTypes } from "chan-dongle-extended-client";
import { types as gwTypes } from "../../semasim-gateway";


function multicast<Params, Response extends undefined>(
    methodName: string,
    params: Params,
    emailsOrUas: gwTypes.Ua[] | string[]
): Promise<void> {

    let emails: string[];

    if (emailsOrUas.length !== 0 && typeof emailsOrUas[0] === "string") {

        emails = emailsOrUas as any;

    } else {

        const uas: gwTypes.Ua[] = emailsOrUas as any;

        //NOTE: For now the API is only implemented by Web UAs
        emails = uas
            .filter(({ platform }) => platform === "web")
            .map(({ userEmail }) => userEmail)
            ;

    }

    return Promise.all(
        emails.map(
            email =>
                backendRemoteApiCaller.forwardRequest<Params, Response>(
                    { "target": "UA", email },
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

    function f(imsi: string, emails: string[]): Promise<void>;
    function f(imsi: string, uas: gwTypes.Ua[]): Promise<void>;
    function f(imsi: string, arg: string[] | gwTypes.Ua[]): Promise<void> {
        return multicast<Params, Response>(methodName, { imsi }, arg);
    }

    return f;

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

    function f(params: Params, emails: string[]): Promise<void>;
    function f(params: Params, uas: gwTypes.Ua[]): Promise<void>;
    function f(params: Params, arg: string[] | gwTypes.Ua[]): Promise<void> {
        return multicast<Params, Response>(methodName, params, arg);
    }

    return f;

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

    return (params: Params, emails: string[]): Promise<void> =>
        multicast<Params, Response>(methodName, params, emails);

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

    return (params: Params, emails: string[]): Promise<void> =>
        multicast<Params, Response>(methodName, params, emails);

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

    return (imsi: string, emails: string[]): Promise<void> =>
        multicast<Params, Response>(methodName, { imsi }, emails);

})();

export const notifySimSharingRequest = (() => {

    const methodName = apiDeclaration.notifySimSharingRequest.methodName;
    type Params = apiDeclaration.notifySimSharingRequest.Params;
    type Response = apiDeclaration.notifySimSharingRequest.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (userSim: Params, email: string): Promise<void> =>
        multicast<Params, Response>(methodName, userSim, [ email ]);

})();

export const notifySharingRequestResponse = (() => {

    const methodName = apiDeclaration.notifySharingRequestResponse.methodName;
    type Params = apiDeclaration.notifySharingRequestResponse.Params;
    type Response = apiDeclaration.notifySharingRequestResponse.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (params: Params, email: string): Promise<void> =>
        multicast<Params, Response>(methodName, params, [ email ]);

})();

export const notifySharedSimUnregistered = (() => {

    const methodName = apiDeclaration.notifySharedSimUnregistered.methodName;
    type Params = apiDeclaration.notifySharedSimUnregistered.Params;
    type Response = apiDeclaration.notifySharedSimUnregistered.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {

        const sanityCheck: backendRemoteApiCaller.SanityCheck_<Response> =
            response => response === undefined;

        return sanityCheck;

    })();

    return (params: Params, email: string): Promise<void> =>
        multicast<Params, Response>(methodName, params, [ email ]);

})();

export const notifyLoggedFromOtherTab = (() => {

    const methodName = apiDeclaration.notifyLoggedFromOtherTab.methodName;
    type Params = apiDeclaration.notifyLoggedFromOtherTab.Params;
    type Response = apiDeclaration.notifyLoggedFromOtherTab.Response;

    /** Callable from anywhere */
    function f(email: string): Promise<void>;
    /** Callable only on process holding the connection */
    function f(uaSocket: sip.Socket): Promise<void>;
    function f(arg: sip.Socket | string): Promise<void> {

        if (typeof arg === "string") {

            const email = arg;

            return backendRemoteApiCaller.notifyLoggedFromOtherTabProxy(
                email
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

}) ();

