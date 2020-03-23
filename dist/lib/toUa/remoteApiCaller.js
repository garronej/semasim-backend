"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sip = require("ts-sip");
const sip_api_1 = require("../../frontend/sip_api");
const backendRemoteApiCaller = require("../toBackend/remoteApiCaller");
const tools_1 = require("../../frontend/tools");
const multicast = ({ methodName, params, uas }) => Promise.all(uas.map(ua => backendRemoteApiCaller.forwardRequest({ "target": "UA", "uaInstanceId": ua.instance }, methodName, params, { "timeout": 5 * 1000, }).catch(() => { }))).then(() => { });
exports.notifyUserSimChange = (() => {
    const { methodName } = sip_api_1.api_decl_uaToBackend.notifyUserSimChange;
    backendRemoteApiCaller.SanityCheck_.store[methodName] =
        tools_1.id(response => response === undefined);
    return ({ params, uas }) => multicast({ methodName, params, uas });
})();
exports.notifyDongleOnLan = (() => {
    const { methodName } = sip_api_1.api_decl_uaToBackend.notifyDongleOnLan;
    return tools_1.id(async (args) => {
        const { dongle } = args;
        if ("gatewayAddress" in args) {
            const { gatewayAddress } = args;
            return backendRemoteApiCaller.notifyDongleOnLanProxy(dongle, gatewayAddress);
        }
        else {
            const { uaSocket } = args;
            return sip.api.client.sendRequest(uaSocket, methodName, dongle, {
                "timeout": 5 * 1000,
                "sanityCheck": response => response === undefined
            }).catch(() => { });
        }
    });
})();
exports.notifyLoggedFromOtherTab = (() => {
    const { methodName } = sip_api_1.api_decl_uaToBackend.notifyLoggedFromOtherTab;
    return tools_1.id((args) => {
        if ("uaInstanceId" in args) {
            const { uaInstanceId } = args;
            return backendRemoteApiCaller.notifyLoggedFromOtherTabProxy(uaInstanceId);
        }
        else {
            const { uaSocket } = args;
            return sip.api.client.sendRequest(uaSocket, methodName, undefined, {
                "timeout": 3 * 1000,
                "sanityCheck": response => response === undefined
            }).catch(() => { })
                .then(() => uaSocket.destroy("opened on other tab"));
        }
    });
})();
exports.notifyIceServer = (() => {
    const { methodName } = sip_api_1.api_decl_uaToBackend.notifyIceServer;
    return ({ uaSocket, iceServer }) => sip.api.client.sendRequest(uaSocket, methodName, iceServer, {
        "timeout": 3 * 1000,
        "sanityCheck": response => response === undefined
    }).catch(() => { });
})();
exports.wd_notifyActionFromOtherUa = (() => {
    const { methodName } = sip_api_1.api_decl_uaToBackend.wd_notifyActionFromOtherUa;
    backendRemoteApiCaller.SanityCheck_.store[methodName] =
        tools_1.id(response => response === undefined);
    return ({ methodNameAndParams, uas }) => multicast({
        methodName,
        "params": methodNameAndParams,
        uas
    });
})();
