"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("ts-sip");
const uaToBackend_1 = require("../../sip_api_declarations/uaToBackend");
const backendRemoteApiCaller = require("../toBackend/remoteApiCaller");
function multicast(methodName, params, uas) {
    return Promise.all(uas.map(ua => backendRemoteApiCaller.forwardRequest({ "target": "UA", "uaInstanceId": ua.instance }, methodName, params, { "timeout": 5 * 1000, }).catch(() => { }))).then(() => { });
}
exports.notifySimOffline = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifySimOffline.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (imsi, uas) => multicast(methodName, { imsi }, uas);
})();
exports.notifySimOnline = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifySimOnline.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, uas) => multicast(methodName, params, uas);
})();
exports.notifyGsmConnectivityChange = (() => {
    const { methodName } = uaToBackend_1.apiDeclaration.notifyGsmConnectivityChange;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, uas) => multicast(methodName, params, uas);
})();
exports.notifyCellSignalStrengthChange = (() => {
    const { methodName } = uaToBackend_1.apiDeclaration.notifyCellSignalStrengthChange;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, uas) => multicast(methodName, params, uas);
})();
exports.notifyOngoingCall = (() => {
    const { methodName } = uaToBackend_1.apiDeclaration.notifyOngoingCall;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, uas) => multicast(methodName, params, uas);
})();
exports.notifyContactCreatedOrUpdated = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifyContactCreatedOrUpdated.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, uas) => multicast(methodName, params, uas);
})();
exports.notifyContactDeleted = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifyContactDeleted.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, uas) => multicast(methodName, params, uas);
})();
exports.notifyDongleOnLan = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifyDongleOnLan.methodName;
    function f(dongle, arg) {
        if (typeof arg === "string") {
            const gatewayAddress = arg;
            return backendRemoteApiCaller.notifyDongleOnLanProxy(dongle, gatewayAddress);
        }
        else {
            const uaSocket = arg;
            return sip.api.client.sendRequest(uaSocket, methodName, dongle, {
                "timeout": 5 * 1000,
                "sanityCheck": response => response === undefined
            }).catch(() => { });
        }
    }
    return f;
})();
exports.notifySimPermissionLost = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifySimPermissionLost.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (imsi, uas) => multicast(methodName, { imsi }, uas);
})();
exports.notifySimSharingRequest = (() => {
    const { methodName } = uaToBackend_1.apiDeclaration.notifySimSharingRequest;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    function f(userSim, uasOrSocket) {
        if (uasOrSocket instanceof Array) {
            const uas = uasOrSocket;
            return multicast(methodName, userSim, uas);
        }
        else {
            const socket = uasOrSocket;
            return sip.api.client.sendRequest(socket, methodName, userSim, {
                "timeout": 5 * 1000,
                "sanityCheck": response => response === undefined
            }).catch(() => { });
        }
    }
    return f;
})();
exports.notifySharingRequestResponse = (() => {
    const { methodName } = uaToBackend_1.apiDeclaration.notifySharingRequestResponse;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, uas) => multicast(methodName, params, uas);
})();
exports.notifyOtherSimUserUnregisteredSim = (() => {
    const { methodName } = uaToBackend_1.apiDeclaration.notifyOtherSimUserUnregisteredSim;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, uas) => multicast(methodName, params, uas);
})();
exports.notifyLoggedFromOtherTab = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifyLoggedFromOtherTab.methodName;
    function f(arg) {
        if (typeof arg === "string") {
            const uaInstanceId = arg;
            return backendRemoteApiCaller.notifyLoggedFromOtherTabProxy(uaInstanceId);
        }
        else {
            const uaSocket = arg;
            return sip.api.client.sendRequest(uaSocket, methodName, undefined, {
                "timeout": 3 * 1000,
                "sanityCheck": response => response === undefined
            }).catch(() => { })
                .then(() => uaSocket.destroy("opened on other tab"));
        }
    }
    return f;
})();
exports.notifyIceServer = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifyIceServer.methodName;
    return async (uaSocket, iceServer) => {
        return sip.api.client.sendRequest(uaSocket, methodName, iceServer, {
            "timeout": 3 * 1000,
            "sanityCheck": response => response === undefined
        }).catch(() => { });
    };
})();
