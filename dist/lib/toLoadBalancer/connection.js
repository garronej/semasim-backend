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
const load_balancer_1 = require("../../load-balancer");
const sip = require("ts-sip");
const net = require("net");
const remoteApiCaller = require("./remoteApiCaller");
const logger = require("logger");
const backendConnections = require("../toBackend/connections");
const launch_1 = require("../launch");
const dbSemasim = require("../dbSemasim");
const debug = logger.debugFactory();
function connect() {
    return __awaiter(this, void 0, void 0, function* () {
        const loadBalancerSocket = new sip.Socket(net.connect({
            "host": yield load_balancer_1.types.getAddress(),
            "port": load_balancer_1.types.port,
            "localAddress": launch_1.getLocalRunningInstance().interfaceAddress
        }), true);
        sip.api.client.enableKeepAlive(loadBalancerSocket);
        const idString = "backendToLoadBalancer";
        sip.api.client.enableErrorLogging(loadBalancerSocket, sip.api.client.getDefaultErrorLogger({
            idString,
            "log": logger.log
        }));
        const hasConnect = yield (() => __awaiter(this, void 0, void 0, function* () {
            const boundTo = [];
            const hasConnect = yield Promise.race([
                new Promise(resolve => loadBalancerSocket.evtConnect.attachOnce(boundTo, () => resolve(true))),
                new Promise(resolve => loadBalancerSocket.evtClose.attachOnce(boundTo, () => resolve(false)))
            ]);
            loadBalancerSocket.evtConnect.detach(boundTo);
            loadBalancerSocket.evtClose.detach(boundTo);
            return hasConnect;
        }))();
        if (!hasConnect) {
            debug("Load balancer seems to be down, retrying");
            yield new Promise(resolve => setTimeout(resolve, 3000));
            yield connect();
            return;
        }
        debug("Connection established with load balancer");
        loadBalancerSocket.evtClose.attachOnce(() => {
            debug("Connection lost with load balancer, making process restart");
            process.emit("beforeExit", process.exitCode = 0);
        });
        loadBalancerSocket.enableLogger({
            "socketId": idString,
            "remoteEndId": "LOAD_BALANCER",
            "localEndId": "BACKEND",
            "connection": false,
            "error": true,
            "close": true,
            "incomingTraffic": false,
            "outgoingTraffic": false,
            "ignoreApiTraffic": true
        }, logger.log);
        const runningInstances = yield remoteApiCaller.getRunningInstances(launch_1.getLocalRunningInstance(), loadBalancerSocket);
        if (runningInstances.length === 0) {
            debug("First or only semasim process running setting all sim offline");
            dbSemasim.setAllSimOffline();
        }
        else {
            for (const runningInstance of runningInstances) {
                backendConnections.connect(runningInstance, () => remoteApiCaller.isInstanceStillRunning(runningInstance, loadBalancerSocket));
            }
            //NOTE: Waiting here we are almost sure that 
            //setAllSimOffline is run before on the first process.
            yield new Promise(resolve => setTimeout(resolve, 200));
        }
    });
}
exports.connect = connect;
