"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlockSimProxy = exports.notifyLoggedFromOtherTabProxy = exports.notifyDongleOnLanProxy = exports.collectDonglesOnLan = exports.destroyUaSocket = exports.qualifyContact = exports.notifyRoute = exports.SanityCheck_ = exports.forwardRequest = void 0;
const apiDeclaration = require("../../sip_api_declarations/backendToBackend");
const sip = require("ts-sip");
const backendConnections = require("../toBackend/connections");
const localApiHandlers = require("./localApiHandlers");
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
exports.forwardRequest = (() => {
    const methodName = apiDeclaration.forwardRequest.methodName;
    return async function (route, methodName_, params_, extra) {
        const params = {
            route, methodName_, params_, "timeout": extra.timeout
        };
        let response;
        {
            const { handler } = localApiHandlers.handlers[methodName];
            response = await handler(params, null);
        }
        if (response.status === "NO ROUTE") {
            const backendSocket = (() => {
                switch (route.target) {
                    case "UA":
                        return backendConnections.getBoundToUaInstanceId(route.uaInstanceId);
                    case "GATEWAY":
                        return backendConnections.getBindedToImsi(route.imsi);
                }
            })();
            if (!!backendSocket) {
                //NOTE: May throw, OK
                response = await sip.api.client.sendRequest(backendSocket, methodName, { route, methodName_, params_, "timeout": extra.timeout });
            }
        }
        switch (response.status) {
            case "NO ROUTE": throw new Error("no route");
            case "ERROR": throw new Error(`(remote) ${response.message}`);
            case "SUCCESS": return response.response_;
        }
    };
})();
var SanityCheck_;
(function (SanityCheck_) {
    /**
     * We wrap the store into a proxy so
     * in the future we have the same method name
     * for a gateway and a UA method we will see it right away.
     * */
    SanityCheck_.store = new Proxy({}, {
        "set": (obj, prop, value) => {
            if (prop in obj) {
                throw new Error("reassigning method name");
            }
            obj[prop] = value;
            return true;
        }
    });
})(SanityCheck_ = exports.SanityCheck_ || (exports.SanityCheck_ = {}));
/** Never throw, if nothing to send the request is not sent */
exports.notifyRoute = (() => {
    const methodName = apiDeclaration.notifyRoute.methodName;
    return (params) => {
        //If there is no info we avoid sending request
        if (!Object.keys(params)
            .filter(key => key !== "type")
            .find(key => params[key] !== undefined && params[key].length !== 0)) {
            return Promise.resolve();
        }
        return Promise.all(backendConnections.getAll()
            .map(backendSocket => sip.api.client.sendRequest(backendSocket, methodName, params).catch(() => { }))).then(() => { });
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
function getBackendIpEndpointIfRelayedFromSipContact(contact) {
    const { host, port, params: { transport } } = sip.parsePath(contact.path).pop().uri;
    if (transport !== "TCP") {
        return undefined;
    }
    return [host, port];
}
exports.qualifyContact = (() => {
    const methodName = apiDeclaration.qualifyContact.methodName;
    return (contact) => {
        const backendIpEndpoint = getBackendIpEndpointIfRelayedFromSipContact(contact);
        if (!!backendIpEndpoint) {
            const backendSocket = backendConnections.getByIpEndpoint(...backendIpEndpoint);
            if (!backendSocket) {
                return Promise.resolve(false);
            }
            return sip.api.client.sendRequest(backendSocket, methodName, contact).catch(() => false);
        }
        else {
            const { handler } = localApiHandlers.handlers[methodName];
            return handler(contact, null).catch(() => false);
        }
    };
})();
/** Don't throw */
exports.destroyUaSocket = (() => {
    const methodName = apiDeclaration.destroyUaSocket.methodName;
    return (contact) => {
        const backendIpEndpoint = getBackendIpEndpointIfRelayedFromSipContact(contact);
        const params = { "connectionId": contact.connectionId };
        if (!!backendIpEndpoint) {
            const backendSocket = backendConnections.getByIpEndpoint(...backendIpEndpoint);
            if (!backendSocket) {
                return Promise.resolve(undefined);
            }
            return sip.api.client.sendRequest(backendSocket, methodName, params).catch(() => { });
        }
        else {
            const { handler } = localApiHandlers.handlers[methodName];
            //NOTE: Can't throw
            return handler(params, null);
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
exports.collectDonglesOnLan = (() => {
    const methodName = apiDeclaration.collectDonglesOnLan.methodName;
    return function (gatewayAddress, auth) {
        const params = { gatewayAddress, auth };
        return Promise.all([
            ...Array.from(backendConnections.getBindedToGatewayAddress(gatewayAddress)).map(backendSocket => sip.api.client.sendRequest(backendSocket, methodName, params).catch(() => [])),
            (() => {
                const { handler } = localApiHandlers.handlers[methodName];
                return handler(params, null);
            })()
        ]).then(res => res.reduce((acc, cur) => [...acc, ...cur], []));
    };
})();
/** Don't throw */
exports.notifyDongleOnLanProxy = (() => {
    const methodName = apiDeclaration.notifyDongleOnLanProxy.methodName;
    return function (dongle, gatewayAddress) {
        const params = { gatewayAddress, dongle };
        return Promise.all([
            ...Array.from(backendConnections.getBindedToUaAddress(gatewayAddress)).map(backendSocket => sip.api.client.sendRequest(backendSocket, methodName, params).catch(() => { })),
            (() => {
                const { handler } = localApiHandlers.handlers[methodName];
                return handler(params, null);
            })()
        ]).then(() => undefined);
    };
})();
exports.notifyLoggedFromOtherTabProxy = (() => {
    const methodName = apiDeclaration.notifyLoggedFromOtherTabProxy.methodName;
    return async (uaInstanceId) => {
        const backendSocket = backendConnections.getBoundToUaInstanceId(uaInstanceId);
        const params = { uaInstanceId };
        if (!!backendSocket) {
            await sip.api.client.sendRequest(backendSocket, methodName, params).catch(() => { });
        }
        else {
            const { handler } = localApiHandlers.handlers[methodName];
            //NOTE: Can't throw
            await handler(params, null);
        }
    };
})();
exports.unlockSimProxy = (() => {
    const methodName = apiDeclaration.unlockSimProxy.methodName;
    return function (imei, pin, gatewayAddress) {
        const params = { imei, pin, gatewayAddress };
        return new Promise(resolve => Promise.all([
            ...Array.from(backendConnections.getBindedToGatewayAddress(gatewayAddress)).map(backendSocket => sip.api.client.sendRequest(backendSocket, methodName, params).then(result => {
                if (!!result) {
                    resolve(result);
                }
            }, () => { })),
            (() => {
                const { handler } = localApiHandlers.handlers[methodName];
                return handler(params, null)
                    .then(result => {
                    if (!!result) {
                        resolve(result);
                    }
                });
            })()
        ]).then(() => resolve(undefined)));
    };
})();
