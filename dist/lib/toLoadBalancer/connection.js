"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const load_balancer_1 = require("../../load-balancer");
const sip = require("ts-sip");
const net = require("net");
const remoteApiCaller = require("./remoteApiCaller");
const logger_1 = require("../../tools/logger");
const backendConnections = require("../toBackend/connections");
const launch_1 = require("../launch");
const dbSemasim = require("../dbSemasim");
const localApiHandlers_1 = require("./localApiHandlers");
const deploy_1 = require("../../deploy");
const evt_1 = require("evt");
const debug = logger_1.logger.debugFactory();
const idString = "backendToLoadBalancer";
//NOTE: we create it dynamically so we do not call deploy.getEnv on import.
let apiServer = undefined;
async function connect() {
    const loadBalancerSocket = new sip.Socket(net.connect({
        "host": await load_balancer_1.misc.getListeningAddressForBackendConnection(),
        "port": load_balancer_1.misc.listeningPortForBackendConnection,
        "localAddress": launch_1.getLocalRunningInstance().interfaceAddress
    }), true);
    if (apiServer === undefined) {
        apiServer = new sip.api.Server(localApiHandlers_1.handlers, sip.api.Server.getDefaultLogger({
            idString,
            "log": logger_1.logger.log,
            "displayOnlyErrors": deploy_1.deploy.getEnv() === "DEV" ? false : true
        }));
    }
    apiServer.startListening(loadBalancerSocket);
    sip.api.client.enableKeepAlive(loadBalancerSocket);
    sip.api.client.enableErrorLogging(loadBalancerSocket, sip.api.client.getDefaultErrorLogger({
        idString,
        "log": logger_1.logger.log
    }));
    const ctxHasConnect = evt_1.Evt.newCtx();
    loadBalancerSocket.evtConnect.attachOnce(ctxHasConnect, () => ctxHasConnect.done(true));
    loadBalancerSocket.evtClose.attachOnce(ctxHasConnect, () => ctxHasConnect.done(false));
    if (!await ctxHasConnect.waitFor()) {
        debug("Load balancer seems to be down, retrying");
        await new Promise(resolve => setTimeout(resolve, 3000));
        await connect();
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
    }, logger_1.logger.log);
    const runningInstances = await remoteApiCaller.getRunningInstances(launch_1.getLocalRunningInstance(), loadBalancerSocket);
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
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}
exports.connect = connect;
