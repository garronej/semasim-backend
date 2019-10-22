
import * as apiDeclaration from "../../sip_api_declarations/backendToBackend";
import * as sip from "ts-sip";
import * as backendConnections from "../toBackend/connections";
import * as localApiHandlers from "./localApiHandlers";
import { types as gwTypes } from "../../gateway";
//@ts-ignore, to avoid warnings
import { types as dcTypes } from "chan-dongle-extended-client";


/** 
 * 
 * In the case we target a UA ( via uaInstanceId ) or 
 * a gateway (via imsi) this method save us the 
 * trouble of writing a proxy method.
 * 
 * An API request to an UA or a gateway can
 * only be done from the node process that hold
 * the socket connection to the target.
 * 
 * This method behave like sip.api.client.sendRequest
 * except that instead of directly sending the request
 * to a given socket the request will be forwarded 
 * to the process the target UA or gateway is connected to.
 * 
 * An other difference is that SanityCheck can't be serialized 
 * so they must be defined statically in SanityCheck_.store
 * 
 * If the current node process has the route to the ua 
 * or gateway the request is performed directly.
 * 
 * throw as sendRequest would or if no route was found.
 * 
 * */
export const forwardRequest = (() => {

    const methodName = apiDeclaration.forwardRequest.methodName;
    type Params<Params_> = apiDeclaration.forwardRequest.Params<Params_>;
    type Response<Response_> = apiDeclaration.forwardRequest.Response<Response_>;

    return async function <Params_, Response_>(
        route: Params<Params_>["route"],
        methodName_: string,
        params_: Params_,
        extra: { timeout: number },
    ): Promise<Response_> {

        const params: Params<Params_> = {
            route, methodName_, params_, "timeout": extra.timeout
        };

        let response: Response<Response_>;

        {

            const { handler }  = localApiHandlers.handlers[
                methodName
            ] as sip.api.Server.Handler<Params<Params_>, Response<Response_>>;

            response= await handler(params, null as any);

        }

        if (response.status === "NO ROUTE") {

            const backendSocket: sip.Socket | undefined = (() => {

                switch (route.target) {
                    case "UA":
                        return backendConnections.getBoundToUaInstanceId(route.uaInstanceId);
                    case "GATEWAY":
                        return backendConnections.getBindedToImsi(route.imsi);
                }

            })();

            if (!!backendSocket) {

                //NOTE: May throw, OK
                response = await sip.api.client.sendRequest<Params<Params_>, Response<Response_>>(
                    backendSocket,
                    methodName,
                    { route, methodName_, params_, "timeout": extra.timeout },
                );

            }

        }

        switch (response.status) {
            case "NO ROUTE": throw new Error("no route");
            case "ERROR": throw new Error(`(remote) ${response.message}`);
            case "SUCCESS": return response.response_;
        }

    }

})();

export type SanityCheck_<Response_> = (response_: Response_) => boolean;

export namespace SanityCheck_ {

    /** 
     * We wrap the store into a proxy so
     * in the future we have the same method name  
     * for a gateway and a UA method we will see it right away.
     * */
    export const store = new Proxy<{ [methodName_: string]: SanityCheck_<any> }>(
        {},
        {
            "set": (obj, prop: string, value) => {

                if (prop in obj) {
                    throw new Error("reassigning method name");
                }

                obj[prop] = value;

                return true;

            }

        }
    );

}

/** Never throw, if nothing to send the request is not sent */
export const notifyRoute = (() => {

    const methodName = apiDeclaration.notifyRoute.methodName;
    type Params = apiDeclaration.notifyRoute.Params;
    type Response = apiDeclaration.notifyRoute.Response;

    return (params: Params): Promise<void> => {

        //If there is no info we avoid sending request
        if (!Object.keys(params)
            .filter(key => key !== "type")
            .find(key => params[key] !== undefined && params[key].length !== 0)
        ) {
            return Promise.resolve();
        }

        return Promise.all(
            backendConnections.getAll()
                .map(
                    backendSocket => sip.api.client.sendRequest<Params, Response>(
                        backendSocket,
                        methodName,
                        params
                    ).catch(() => { })
                )
        ).then(() => { });

    };

})();


/** 
 * If the sip path between the UA and the Gateway  
 * Is relayed between different node process 
 * this function return the remote address:port
 * of the backend socket toward the instance that
 * hold the UA connection.
 * 
 * If the UA and the Gateway connection are hold by
 * the same process then the function will return undefined.
 * */
function getBackendIpEndpointIfRelayedFromSipContact( 
    contact: gwTypes.Contact
): [string, number] | undefined {

    const { host, port, params: { transport } } = 
        sip.parsePath(contact.path).pop()!.uri;

    if( transport !== "TCP" ){
        return undefined;
    }

    return [ host!, port ];

}

export const qualifyContact = (() => {

    const methodName = apiDeclaration.qualifyContact.methodName;
    type Params = apiDeclaration.qualifyContact.Params;
    type Response = apiDeclaration.qualifyContact.Response;

    return (contact: Params): Promise<boolean> => {

        const backendIpEndpoint = getBackendIpEndpointIfRelayedFromSipContact(contact);

        if (!!backendIpEndpoint) {

            const backendSocket = backendConnections.getByIpEndpoint(
                ...backendIpEndpoint
            );

            if (!backendSocket) {
                return Promise.resolve(false);
            }

            return sip.api.client.sendRequest<Params, Response>(
                backendSocket!,
                methodName,
                contact
            ).catch(() => false);

        } else {

            const { handler } = localApiHandlers.handlers[
                methodName
            ] as sip.api.Server.Handler<Params, Response>;

            return handler(contact, null as any).catch(() => false);

        }

    }

})();

/** Don't throw */
export const destroyUaSocket = (() => {

    const methodName = apiDeclaration.destroyUaSocket.methodName;
    type Params = apiDeclaration.destroyUaSocket.Params;
    type Response = apiDeclaration.destroyUaSocket.Response;

    return (contact: gwTypes.Contact): Promise<void> => {

        const backendIpEndpoint = getBackendIpEndpointIfRelayedFromSipContact(contact);

        const params: Params = { "connectionId": contact.connectionId };

        if (!!backendIpEndpoint) {

            const backendSocket = backendConnections.getByIpEndpoint(
                ...backendIpEndpoint
            );

            if (!backendSocket) {
                return Promise.resolve(undefined);
            }

            return sip.api.client.sendRequest<Params, Response>(
                backendSocket,
                methodName,
                params
            ).catch(() => { });

        } else {

            const { handler } = localApiHandlers.handlers[
                methodName
            ] as sip.api.Server.Handler<Params, Response>;

            //NOTE: Can't throw
            return handler(params, null as any);

        }


    };

})();

/** 
 * return all dongles connected from a  
 * given address that can potentially be 
 * unlocked or registered by a specific user.
 * 
 * Meaning that it will return
 * -all the locked dongles holding a sim with unreadable iccid.
 * -all the locked dongles holding a sim with readable iccid
 * and that sim is either registered by the user or not registered.
 * -all the usable dongle holding a sim that is not yet registered.
 * 
 * gatewayAddress: get only from this address
 * auth: id of the user used to exclude the dongle he should not have access to
 * */
export const collectDonglesOnLan = (() => {

    const methodName = apiDeclaration.collectDonglesOnLan.methodName;
    type Params = apiDeclaration.collectDonglesOnLan.Params;
    type Response = apiDeclaration.collectDonglesOnLan.Response;

    return function (
        gatewayAddress: string,
        auth: Params["auth"]
    ): Promise<Response> {

        const params: Params = { gatewayAddress, auth };

        return Promise.all([
            ...Array.from(
                backendConnections.getBindedToGatewayAddress(
                    gatewayAddress
                )
            ).map(backendSocket =>
                sip.api.client.sendRequest<Params, Response>(
                    backendSocket,
                    methodName,
                    params
                ).catch(() => [])
            ),
            (() => {

                const { handler } = localApiHandlers.handlers[
                    methodName
                ] as sip.api.Server.Handler<Params, Response>;

                return handler(params, null as any);

            })()
        ]).then(res => res.reduce((acc, cur) => [...acc, ...cur], []))
            ;

    };

})();

/** Don't throw */
export const notifyDongleOnLanProxy = (() => {

    const methodName = apiDeclaration.notifyDongleOnLanProxy.methodName;
    type Params = apiDeclaration.notifyDongleOnLanProxy.Params;
    type Response = apiDeclaration.notifyDongleOnLanProxy.Response;

    return function (
        dongle: Params["dongle"],
        gatewayAddress: string
    ): Promise<Response> {

        const params: Params = { gatewayAddress, dongle };

        return Promise.all([
            ...Array.from(
                backendConnections.getBindedToUaAddress(
                    gatewayAddress
                )
            ).map(backendSocket =>
                sip.api.client.sendRequest<Params, Response>(
                    backendSocket,
                    methodName,
                    params
                ).catch(() => { })
            ),
            (() => {

                const { handler } = localApiHandlers.handlers[
                    methodName
                ] as sip.api.Server.Handler<Params, Response>;

                return handler(params, null as any);

            })()
        ]).then(() => undefined)
            ;

    };

})();



export const notifyLoggedFromOtherTabProxy = (() => {

    const methodName = apiDeclaration.notifyLoggedFromOtherTabProxy.methodName;
    type Params = apiDeclaration.notifyLoggedFromOtherTabProxy.Params;
    type Response = apiDeclaration.notifyLoggedFromOtherTabProxy.Response;

    return async (uaInstanceId: string): Promise<void> => {

        const backendSocket = backendConnections.getBoundToUaInstanceId(uaInstanceId);

        const params: Params = { uaInstanceId };

        if (!!backendSocket) {

            await sip.api.client.sendRequest<Params, Response>(
                backendSocket,
                methodName,
                params
            ).catch(() => { });

        } else {

            const { handler } = localApiHandlers.handlers[
                methodName
            ] as sip.api.Server.Handler<Params, Response>;

            //NOTE: Can't throw
            await handler(params, null as any);

        }

    };

})();

export const unlockSimProxy = (() => {

    const methodName = apiDeclaration.unlockSimProxy.methodName;
    type Params = apiDeclaration.unlockSimProxy.Params;
    type Response = apiDeclaration.unlockSimProxy.Response;

    return function (
        imei: string,
        pin: string,
        gatewayAddress: string
    ): Promise<Response> {

        const params: Params = { imei, pin, gatewayAddress };

        return new Promise<Response>(
            resolve => Promise.all([
                ...Array.from(
                    backendConnections.getBindedToGatewayAddress(
                        gatewayAddress
                    )
                ).map(backendSocket =>
                    sip.api.client.sendRequest<Params, Response>(
                        backendSocket,
                        methodName,
                        params
                    ).then(
                        result => {

                            if (!!result) {
                                resolve(result);
                            }

                        },
                        () => { }
                    )
                ),
                (() => {

                    const { handler } = localApiHandlers.handlers[
                        methodName
                    ] as sip.api.Server.Handler<Params, Response>;

                    return handler(params, null as any)
                        .then(result => {

                            if (!!result) {
                                resolve(result);
                            }

                        });

                })()
            ]).then(() => resolve(undefined))
        );

    };

})();
