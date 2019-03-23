"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("ts-sip");
const uaToBackend_1 = require("../../sip_api_declarations/uaToBackend");
const backendRemoteApiCaller = require("../toBackend/remoteApiCaller");
function multicast(methodName, params, emailsOrUas) {
    let emails;
    if (emailsOrUas.length !== 0 && typeof emailsOrUas[0] === "string") {
        emails = emailsOrUas;
    }
    else {
        const uas = emailsOrUas;
        //NOTE: For an API method like notifySimOnline
        //uas will be a list with: 
        //-The main web ua.
        //-A certain number of Android UA.
        //-For each Android UA a WebView UA ( with almost the same uaInstanceId )
        //In consequence the email can (and will) appear duplicated this is why we use Set.
        //Only the main web UA is interested by those notify event as Android UA
        //receive notification via PUSH and WebView UA are ephemeral UA that 
        //does not require those events to function properly.
        emails = [...new Set(uas.map(({ userEmail }) => userEmail))];
    }
    return Promise.all(emails.map(email => backendRemoteApiCaller.forwardRequest({ "target": "UA", email }, methodName, params, { "timeout": 5 * 1000, }).catch(() => { }))).then(() => { });
}
exports.notifySimOffline = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifySimOffline.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    function f(imsi, arg) {
        return multicast(methodName, { imsi }, arg);
    }
    return f;
})();
exports.notifySimOnline = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifySimOnline.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    function f(params, arg) {
        return multicast(methodName, params, arg);
    }
    return f;
})();
exports.notifyContactCreatedOrUpdated = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifyContactCreatedOrUpdated.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, emails) => multicast(methodName, params, emails);
})();
exports.notifyContactDeleted = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifyContactDeleted.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, emails) => multicast(methodName, params, emails);
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
    return (imsi, emails) => multicast(methodName, { imsi }, emails);
})();
exports.notifySimSharingRequest = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifySimSharingRequest.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (userSim, email) => multicast(methodName, userSim, [email]);
})();
exports.notifySharingRequestResponse = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifySharingRequestResponse.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, email) => multicast(methodName, params, [email]);
})();
exports.notifySharedSimUnregistered = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifySharedSimUnregistered.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (params, email) => multicast(methodName, params, [email]);
})();
exports.notifyLoggedFromOtherTab = (() => {
    const methodName = uaToBackend_1.apiDeclaration.notifyLoggedFromOtherTab.methodName;
    function f(arg) {
        if (typeof arg === "string") {
            const email = arg;
            return backendRemoteApiCaller.notifyLoggedFromOtherTabProxy(email);
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
    return (uaSocket, iceServer) => __awaiter(this, void 0, void 0, function* () {
        return sip.api.client.sendRequest(uaSocket, methodName, iceServer, {
            "timeout": 3 * 1000,
            "sanityCheck": response => response === undefined
        }).catch(() => { });
    });
})();
