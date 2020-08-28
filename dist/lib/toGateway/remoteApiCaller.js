"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteContact = exports.updateContactName = exports.createContact = exports.reNotifySimOnline = exports.rebootDongle = exports.unlockSim = exports.getDongleSipPasswordAndTowardSimEncryptKeyStr = exports.getDongle = void 0;
const sip = require("ts-sip");
const dcSanityChecks = require("chan-dongle-extended-client/dist/lib/sanityChecks");
const gateway_1 = require("../../gateway");
const backendRemoteApiCaller = require("../toBackend/remoteApiCaller");
exports.getDongle = (() => {
    const methodName = gateway_1.api_decl_gatewayToBackend.getDongle.methodName;
    return (imei, gatewaySocket) => {
        return sip.api.client.sendRequest(gatewaySocket, methodName, { imei }, {
            "timeout": 5 * 1000,
            "sanityCheck": response => (response === undefined ||
                dcSanityChecks.dongle(response))
        }).catch(() => undefined);
    };
})();
exports.getDongleSipPasswordAndTowardSimEncryptKeyStr = (() => {
    const methodName = gateway_1.api_decl_gatewayToBackend.getDongleSipPasswordAndTowardSimEncryptKeyStr.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => (response === undefined
            ||
                (response instanceof Object &&
                    dcSanityChecks.dongleUsable(response.dongle) &&
                    typeof response.sipPassword === "string" &&
                    !!response.sipPassword.match(/^[0-9a-f]{32}$/) &&
                    typeof response.towardSimEncryptKeyStr === "string"));
        return sanityCheck;
    })();
    return (imsi) => {
        return backendRemoteApiCaller.forwardRequest({ "target": "GATEWAY", imsi }, methodName, { imsi }, { "timeout": 10 * 1000 }).catch(() => undefined);
    };
})();
exports.unlockSim = (() => {
    /*
    NOTE: There is no need to unbind the socket from imei
    as soon as the request to unlock is send.
    When a locked dongle goes online every user logged on the LAN
    will be asked to unlock the SIM.
    If two user or more try to unlock it we will have no funky
    business like two AT command send or thing like that.
    Only the first user will receive a unlock result
    the others will get undefined.
    */
    const methodName = gateway_1.api_decl_gatewayToBackend.unlockSim.methodName;
    function f(imei, pin, arg) {
        const params = { imei, pin };
        if (typeof arg === "string") {
            const gatewayAddress = arg;
            return backendRemoteApiCaller.unlockSimProxy(imei, pin, gatewayAddress);
        }
        else {
            const gatewaySocket = arg;
            return sip.api.client.sendRequest(gatewaySocket, methodName, params, {
                "sanityCheck": response => response === undefined ?
                    true : dcSanityChecks.unlockResult(response)
            }).catch(() => undefined);
        }
    }
    return f;
})();
exports.rebootDongle = (() => {
    const methodName = gateway_1.api_decl_gatewayToBackend.rebootDongle.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => (response instanceof Object &&
            typeof response.isSuccess === "boolean");
        return sanityCheck;
    })();
    return (imsi) => {
        return backendRemoteApiCaller.forwardRequest({ "target": "GATEWAY", imsi }, methodName, { imsi }, { "timeout": 5 * 1000 }).catch(() => ({ "isSuccess": false }));
    };
})();
exports.reNotifySimOnline = (() => {
    const methodName = gateway_1.api_decl_gatewayToBackend.reNotifySimOnline.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => response === undefined;
        return sanityCheck;
    })();
    return (imsi) => {
        return backendRemoteApiCaller.forwardRequest({ "target": "GATEWAY", imsi }, methodName, { imsi }, { "timeout": 5 * 1000 }).catch(() => undefined);
    };
})();
exports.createContact = (() => {
    const methodName = gateway_1.api_decl_gatewayToBackend.createContact.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => (response === undefined ||
            (response instanceof Object &&
                typeof response.mem_index === "number" &&
                typeof response.name_as_stored === "string" &&
                dcSanityChecks.md5(response.new_storage_digest)));
        return sanityCheck;
    })();
    return (imsi, name, number) => {
        return backendRemoteApiCaller.forwardRequest({ "target": "GATEWAY", imsi }, methodName, { imsi, name, number }, { "timeout": 6 * 1000 }).catch(() => undefined);
    };
})();
exports.updateContactName = (() => {
    const methodName = gateway_1.api_decl_gatewayToBackend.updateContactName.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => (response === undefined ||
            (response instanceof Object &&
                typeof response.new_name_as_stored === "string" &&
                dcSanityChecks.md5(response.new_storage_digest)));
        return sanityCheck;
    })();
    return (imsi, mem_index, newName) => {
        return backendRemoteApiCaller.forwardRequest({ "target": "GATEWAY", imsi }, methodName, { imsi, mem_index, newName }, { "timeout": 6 * 1000 }).catch(() => undefined);
    };
})();
exports.deleteContact = (() => {
    const methodName = gateway_1.api_decl_gatewayToBackend.deleteContact.methodName;
    backendRemoteApiCaller.SanityCheck_.store[methodName] = (() => {
        const sanityCheck = response => (response === undefined ||
            (response instanceof Object &&
                dcSanityChecks.md5(response.new_storage_digest)));
        return sanityCheck;
    })();
    return (imsi, mem_index) => {
        return backendRemoteApiCaller.forwardRequest({ "target": "GATEWAY", imsi }, methodName, { imsi, mem_index }, { "timeout": 6 * 1000 }).catch(() => undefined);
    };
})();
