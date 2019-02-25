import { types as lbTypes } from "../../load-balancer"
import * as sip from "ts-sip";
import * as net from "net";
import * as remoteApiCaller from "./remoteApiCaller";
import * as logger from "logger";
import * as backendConnections from "../toBackend/connections";
import { getLocalRunningInstance } from "../launch";
import * as dbSemasim from "../dbSemasim";

const debug = logger.debugFactory();

export async function connect() {

    const loadBalancerSocket = new sip.Socket(
        net.connect({
            "host": await lbTypes.getAddress(),
            "port": lbTypes.port,
            "localAddress": getLocalRunningInstance().interfaceAddress
        }),
        true
    );

    sip.api.client.enableKeepAlive(loadBalancerSocket);

    const idString = "backendToLoadBalancer";

    sip.api.client.enableErrorLogging(
        loadBalancerSocket,
        sip.api.client.getDefaultErrorLogger({
            idString,
            "log": logger.log
        })
    );

    const hasConnect = await (async () => {

        const boundTo = [];

        const hasConnect = await Promise.race([
            new Promise<true>(resolve => loadBalancerSocket.evtConnect.attachOnce(boundTo, () => resolve(true))),
            new Promise<false>(resolve => loadBalancerSocket.evtClose.attachOnce(boundTo, () => resolve(false)))
        ]);

        loadBalancerSocket.evtConnect.detach(boundTo);
        loadBalancerSocket.evtClose.detach(boundTo);

        return hasConnect;

    })();

    if (!hasConnect) {

        debug("Load balancer seems to be down, retrying");

        await new Promise(resolve=> setTimeout(resolve, 3000));

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
    }, logger.log);


    const runningInstances = await remoteApiCaller.getRunningInstances(
        getLocalRunningInstance(), loadBalancerSocket
    );

    if (runningInstances.length === 0) {

        debug("First or only semasim process running setting all sim offline");

        dbSemasim.setAllSimOffline();

    } else {

        for (const runningInstance of runningInstances) {

            backendConnections.connect(
                runningInstance,
                () => remoteApiCaller.isInstanceStillRunning(
                    runningInstance,
                    loadBalancerSocket
                )
            );

        }

        //NOTE: Waiting here we are almost sure that 
        //setAllSimOffline is run before on the first process.
        await new Promise(resolve=> setTimeout(resolve, 200));

    }

}
