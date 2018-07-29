
import { types } from "../../semasim-load-balancer"
import * as sipLibrary from "ts-sip";
import * as net from "net";
import * as remoteApi from "./remoteApiCaller";
import { handlers as localApiHandlers } from "./localApiHandlers";
import * as logger from "logger";

const debug = logger.debugFactory();

export let beforeExit: () => void = () => { };

export async function launch(thisRunningInstance: types.RunningInstance) {

    const loadBalancerSocket = new sipLibrary.Socket(
        net.connect({
            "host": types.address,
            "port": types.port,
            "localAddress": thisRunningInstance.interfaceAddress
        })
    );


    const idString = "loadBalancerSocket";


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



    beforeExit = () => loadBalancerSocket.destroy("Before exit (not connected yet)");

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

        let timer: NodeJS.Timer;

        beforeExit= ()=> clearTimeout(timer);

        await new Promise(resolve=> timer= setTimeout(resolve, 3000));

        await launch(thisRunningInstance);

        return;

    }

    debug("Connection established with load balancer");

    (() => {

        const boundTo = [];

        beforeExit = () => {

            debug("Before exit");

            loadBalancerSocket.evtClose.detach(boundTo);

            loadBalancerSocket.destroy("Before exit!");

        };

        loadBalancerSocket.evtClose.attachOnce(boundTo,() => {

            debug("Connection lost with load balancer, making process restart");

            process.emit("beforeExit", process.exitCode = 0);

        });

    })();


    loadBalancerSocket.enableLogger({
        "socketId": idString,
        "remoteEndId": "LB",
        "localEndId": `I${thisRunningInstance.daemonNumber}`,
        "connection": false,
        "error": true,
        "close": true,
        "incomingTraffic": false,
        "outgoingTraffic": false,
        "ignoreApiTraffic": true
    }, logger.log);


    await remoteApi.notifyIdentity(thisRunningInstance, loadBalancerSocket);

}