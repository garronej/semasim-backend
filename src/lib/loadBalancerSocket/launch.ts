
import { types } from "../../semasim-load-balancer"
import * as sipLibrary from "ts-sip";
import * as net from "net";
import * as remoteApi from "./remoteApiCaller";
import { handlers as localApiHandlers } from "./localApiHandlers";
import * as logger from "logger";

export let beforeExit: ()=> void= ()=> {};

export async function launch(thisRunningInstance: types.RunningInstance){

    const loadBalancerSocket = new sipLibrary.Socket(
        net.connect({
            "host": types.address,
            "port": types.port,
            "localAddress": thisRunningInstance.interfaceAddress
        })
    );

    const idString = "loadBalancerSocket";

    loadBalancerSocket.enableLogger({
        "socketId": idString,
        "remoteEndId": "LB",
        "localEndId": `I${thisRunningInstance.daemonNumber}`,
        "connection": true,
        "error": true,
        "close": true,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "ignoreApiTraffic": true
    }, logger.log);

    (new sipLibrary.api.Server(
        localApiHandlers,
        sipLibrary.api.Server.getDefaultLogger({
            idString,
            "log": logger.log,
            "hideKeepAlive": true
        })
    )).startListening(loadBalancerSocket);

    sipLibrary.api.client.enableErrorLogging(
        loadBalancerSocket, 
        sipLibrary.api.client.getDefaultErrorLogger({
            idString,
            "log": logger.log
        })
    );

    loadBalancerSocket.evtClose.attachOnce(
        () => Promise.reject(new Error("Load balancer connection lost"))
    );

    try {

        await loadBalancerSocket.evtConnect.waitFor(2000);

    } catch{

        throw new Error("Can't connect to load balancer");

    }

    beforeExit = () => loadBalancerSocket.destroy("Before exit");

    await remoteApi.notifyIdentity(thisRunningInstance, loadBalancerSocket);

}