import * as sip from "ts-sip";
import {  api_decl_uaToBackend as apiDeclaration } from "../../frontend/sip_api";
import * as backendRemoteApiCaller from "../toBackend/remoteApiCaller";
import { types as dcTypes } from "chan-dongle-extended-client";
import { types as gwTypes } from "../../gateway";
import { id } from "../../frontend/tools";

const multicast = <Params, Response extends undefined>({ methodName, params, uas }: {
    methodName: string;
    params: Params;
    uas: gwTypes.Ua[];
}): Promise<void> => Promise.all(
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


export const notifyUserSimChange = (() => {

    const { methodName } = apiDeclaration.notifyUserSimChange;
    type Params = apiDeclaration.notifyUserSimChange.Params;
    type Response = apiDeclaration.notifyUserSimChange.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] =
        id<backendRemoteApiCaller.SanityCheck_<Response>>(
            response => response === undefined
        );

    return ({ params, uas }: { params: Params, uas: gwTypes.Ua[]; }): Promise<void> =>
        multicast<Params, Response>({ methodName, params, uas });

})();

export const notifyDongleOnLan = (() => {

    const { methodName } = apiDeclaration.notifyDongleOnLan;
    type Params = apiDeclaration.notifyDongleOnLan.Params;
    type Response = apiDeclaration.notifyDongleOnLan.Response;

    type Args = Args_address | Args_socket;

    type Args_common = {
        dongle: dcTypes.Dongle
    };

    type Args_address = Args_common & {
        gatewayAddress: string;
    };

    type Args_socket = Args_common & {
        uaSocket: sip.Socket
    };

    type ReturnedFunction = {
        /** Callable from anywhere */
        (args: Args_address): Promise<void>;
        /** Callable only on process holding the connection */
        (args: Args_socket): Promise<void>;
    };

    return id<ReturnedFunction>(
        async (args: Args) => {

            const { dongle } = args;

            if ("gatewayAddress" in args) {

                const { gatewayAddress } = args;

                return backendRemoteApiCaller.notifyDongleOnLanProxy(
                    dongle,
                    gatewayAddress
                );

            } else {

                const { uaSocket } = args;

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
    );

})();




export const notifyLoggedFromOtherTab = (() => {

    const { methodName } = apiDeclaration.notifyLoggedFromOtherTab;
    type Params = apiDeclaration.notifyLoggedFromOtherTab.Params;
    type Response = apiDeclaration.notifyLoggedFromOtherTab.Response;

    type Args = Args_instanceId | Args_socket;

    type Args_instanceId = { uaInstanceId: string; };
    type Args_socket = { uaSocket: sip.Socket; };

    type ReturnedFunction = {
        /** Callable from anywhere */
        (args: Args_instanceId): Promise<void>;
        /** Callable only on process holding the connection */
        (args: Args_socket): Promise<void>;
    };

    return id<ReturnedFunction>((args: Args) => {

        if ("uaInstanceId" in args) {

            const { uaInstanceId } = args;

            return backendRemoteApiCaller.notifyLoggedFromOtherTabProxy(
                uaInstanceId
            );

        } else {

            const { uaSocket } = args;

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

    });


})();

export const notifyIceServer = (() => {

    const { methodName } = apiDeclaration.notifyIceServer;
    type Params = apiDeclaration.notifyIceServer.Params;
    type Response = apiDeclaration.notifyIceServer.Response;

    return ({ uaSocket, iceServer }: { uaSocket: sip.Socket; iceServer: Params; }): Promise<void> =>
        sip.api.client.sendRequest<Params, Response>(
            uaSocket,
            methodName,
            iceServer,
            {
                "timeout": 3 * 1000,
                "sanityCheck": response => response === undefined
            }
        ).catch(() => { });


})();


export const wd_notifyActionFromOtherUa = (() => {

    const { methodName } = apiDeclaration.wd_notifyActionFromOtherUa;
    type Params = apiDeclaration.wd_notifyActionFromOtherUa.Params;
    type Response = apiDeclaration.wd_notifyActionFromOtherUa.Response;

    backendRemoteApiCaller.SanityCheck_.store[methodName] =
        id<backendRemoteApiCaller.SanityCheck_<Response>>(
            response => response === undefined
        );

    return ({ methodNameAndParams, uas }: { methodNameAndParams: Params; uas: gwTypes.Ua[]; }): Promise<void> =>
        multicast<Params, Response>({
            methodName,
            "params": methodNameAndParams,
            uas
        });

})();

