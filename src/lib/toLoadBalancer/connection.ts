import { misc as lbMisc } from "../../load-balancer"
import * as sip from "ts-sip";
import * as net from "net";
import * as remoteApiCaller from "./remoteApiCaller";
import { logger } from "../../tools/logger";
import * as backendConnections from "../toBackend/connections";
import { getLocalRunningInstance } from "../launch";
import * as dbSemasim from "../dbSemasim";
import { handlers as localApiHandlers } from "./localApiHandlers";
import { deploy } from "../../deploy";
import { Evt } from "evt";

const debug = logger.debugFactory();


const idString = "backendToLoadBalancer";

//NOTE: we create it dynamically so we do not call deploy.getEnv on import.
let apiServer: sip.api.Server | undefined = undefined;

export async function connect() {


    const loadBalancerSocket = new sip.Socket(
        net.connect({
            "host": await lbMisc.getListeningAddressForBackendConnection(),
            "port": lbMisc.listeningPortForBackendConnection,
            "localAddress": getLocalRunningInstance().interfaceAddress
        }),
        true
    );

    if (apiServer === undefined) {

        apiServer = new sip.api.Server(
            localApiHandlers,
            sip.api.Server.getDefaultLogger({
                idString,
                "log": logger.log,
                "displayOnlyErrors": deploy.getEnv() === "DEV" ? false : true
            })
        );

    }

    apiServer.startListening(loadBalancerSocket);

    sip.api.client.enableKeepAlive(loadBalancerSocket);


    sip.api.client.enableErrorLogging(
        loadBalancerSocket,
        sip.api.client.getDefaultErrorLogger({
            idString,
            "log": logger.log
        })
    );

    const ctxHasConnect = Evt.newCtx<boolean>();

    loadBalancerSocket.evtConnect.attachOnce(ctxHasConnect, () => ctxHasConnect.done(true));
    loadBalancerSocket.evtClose.attachOnce(ctxHasConnect, ()=> ctxHasConnect.done(false))

    if( !await ctxHasConnect.waitFor() ){

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
        await new Promise(resolve => setTimeout(resolve, 200));

    }

}
