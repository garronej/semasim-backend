"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const load_balancer_1 = require("../../load-balancer");
const sip = require("ts-sip");
function getRunningInstances(selfRunningInstance, socket) {
    const methodName = load_balancer_1.api_decl_loadBalancerToBackend.getRunningInstances.methodName;
    try {
        return sip.api.client.sendRequest(socket, methodName, selfRunningInstance, { "timeout": 1000 });
    }
    catch (_a) {
        throw new Error("Load balancer not responding");
    }
}
exports.getRunningInstances = getRunningInstances;
function isInstanceStillRunning(runningInstance, socket) {
    const methodName = load_balancer_1.api_decl_loadBalancerToBackend.isInstanceStillRunning.methodName;
    try {
        return sip.api.client.sendRequest(socket, methodName, runningInstance, { "timeout": 1000 });
    }
    catch (_a) {
        throw new Error("Load balancer not responding");
    }
}
exports.isInstanceStillRunning = isInstanceStillRunning;
