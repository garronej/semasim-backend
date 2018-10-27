"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loadBalancerToBackend_1 = require("../../sip_api_declarations/loadBalancerToBackend");
const sip = require("ts-sip");
function getRunningInstances(selfRunningInstance, socket) {
    const methodName = loadBalancerToBackend_1.apiDeclaration.getRunningInstances.methodName;
    try {
        return sip.api.client.sendRequest(socket, methodName, selfRunningInstance, { "timeout": 1000 });
    }
    catch (_a) {
        throw new Error("Load balancer not responding");
    }
}
exports.getRunningInstances = getRunningInstances;
function isInstanceStillRunning(runningInstance, socket) {
    const methodName = loadBalancerToBackend_1.apiDeclaration.isInstanceStillRunning.methodName;
    try {
        return sip.api.client.sendRequest(socket, methodName, runningInstance, { "timeout": 1000 });
    }
    catch (_a) {
        throw new Error("Load balancer not responding");
    }
}
exports.isInstanceStillRunning = isInstanceStillRunning;
