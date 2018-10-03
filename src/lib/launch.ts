import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as tls from "tls";
import * as net from "net";
import * as ws from "ws";

//NOTE: Must be located before importing files that may use it.
export const getLocalRunningInstance= ()=> runningInstance!;

import { networkTools, types as lbTypes } from "../semasim-load-balancer";
import * as i from "../bin/installer";
import * as dbSemasim from "./dbSemasim";
import * as dbWebphone from "./dbWebphone";
import * as pushNotifications from "./pushNotifications";
import * as logger from "logger";
import * as backendConnections from "./toBackend/connections";
import * as gatewayConnections from "./toGateway/connections";
import * as uaConnections from "./toUa/connections";
import * as loadBalancerConnection from "./toLoadBalancer/connection";
import * as web from "./web/launch";

const debug = logger.debugFactory();

export async function beforeExit() {

    debug("BeforeExit...");

    await dbSemasim.setSimsOffline(
        gatewayConnections.getImsis(),
        "DO NOT FETCH UAS"
    );

    debug("BeforeExit completed in time");

}

let runningInstance: lbTypes.RunningInstance;

export async function launch(daemonNumber: number) {

    debug("Launch!");

    const tlsCerts = getTlsCerts();

    const interfaceAddress = networkTools.getInterfaceAddressInRange(i.semasim_lan);

    const servers: [https.Server, http.Server, tls.Server, tls.Server, net.Server] = [
        https.createServer(tlsCerts),
        http.createServer(),
        tls.createServer(tlsCerts),
        tls.createServer(tlsCerts),
        net.createServer()
    ];

    const [spoofedLocalAddressAndPort] = await Promise.all([
        getSpoofedLocalAddressAndPort(),
        Promise.all(servers.map(
            server => new Promise(
                resolve => server
                    .once("error", error => { throw error; })
                    .listen(0, interfaceAddress)
                    .once("listening", () => resolve(server))
            )))]
    );

    runningInstance= {
        interfaceAddress,
        daemonNumber,
        ...(() => {

            const ports = servers.map(
                server => (server.address() as net.AddressInfo).port
            );

            return {
                "httpsPort": ports[0],
                "httpPort": ports[1],
                "sipUaPort": ports[2],
                "sipGwPort": ports[3],
                "interInstancesPort": ports[4]
            };

        })()
    };

    dbSemasim.launch(interfaceAddress);

    dbWebphone.launch(interfaceAddress);

    pushNotifications.launch();

    loadBalancerConnection.connect();

    web.launch(servers[0], servers[1]);

    uaConnections.listen(
        new ws.Server({ "server": servers[0] }),
        spoofedLocalAddressAndPort.https
    );

    uaConnections.listen(
        servers[2],
        spoofedLocalAddressAndPort.sipUa
    );

    gatewayConnections.listen(
        servers[3],
        spoofedLocalAddressAndPort.sipGw
    );

    backendConnections.listen(
        servers[4]
    );

    debug(`Instance ${daemonNumber} successfully launched`);

}


async function getSpoofedLocalAddressAndPort() {

    /* CNAME www.semasim.com => A semasim.com => '52.58.64.189' */
    const address1 = await networkTools.resolve4("www.semasim.com");

    /* SRV _sips._tcp.semasim.com => [ { name: 'sip.semasim.com,port', port: 443 } ] */
    const [sipSrv] = await networkTools.resolveSrv("_sips._tcp.semasim.com");

    /* A _sips._tcp.semasim.com => '52.57.54.73' */
    const address2 = await networkTools.resolve4(sipSrv.name);

    const _wrap = (localAddress: string, localPort: number) => ({ localAddress, localPort });

    return {
        "https": _wrap(address1, 443),
        "http": _wrap(address1, 80),
        "sipUa": _wrap(address2, sipSrv.port),
        "sipGw": _wrap(address2, 80)
    };

}


function getTlsCerts() {

    const out = { ...i.tlsPath };

    for (const key in i.tlsPath) {
        out[key] = fs.readFileSync(i.tlsPath[key], "utf8");
    }

    return out;

};

