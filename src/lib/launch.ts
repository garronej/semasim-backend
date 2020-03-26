import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as tls from "tls";
import * as net from "net";
import * as ws from "ws";

//NOTE: Must be located before importing files that may use it.
export const getLocalRunningInstance = () => runningInstance!;

import { networkTools, deploy } from "../deploy";
import { types as lbTypes } from "../load-balancer";
import * as dbSemasim from "./dbSemasim";
import * as dbWebphoneData from "./dbWebphoneData";
import * as dbTurn from "./dbTurn";
import * as pushNotifications from "./pushNotifications";
import { logger } from "../tools/logger";
import * as backendConnections from "./toBackend/connections";
import * as gatewayConnections from "./toGateway/connections";
import * as uaConnections from "./toUa/connections";
import * as loadBalancerConnection from "./toLoadBalancer/connection";
import * as web from "./web/launch";
import { dbAuth } from "../../../deploy/dist/lib/deploy";
import * as stripe from "./stripe";
import {  currencyLib  } from "../frontend/tools";
import { fetch as fetchChangeRates } from "../tools/changeRates";




const debug = logger.debugFactory();

export async function beforeExit() {

    debug("BeforeExit...");

    await dbSemasim.setAllSimOffline(
        gatewayConnections.getImsis()
    );

    debug("BeforeExit completed in time");

}

let runningInstance: lbTypes.RunningInstance;

export async function launch(daemonNumber: number) {

    debug("Launch");

    currencyLib.convertFromEuro.setChangeRatesFetchMethod(
        fetchChangeRates,
        24 * 3600 * 1000
    );

    const tlsCerts = (() => {

        const out = { ...deploy.getDomainCertificatesPath() };

        for (const key in out) {
            out[key] = fs.readFileSync(out[key]).toString("utf8");
        }

        return out;

    })();

    const servers: [https.Server, http.Server, tls.Server, net.Server] = [
        https.createServer(tlsCerts),
        http.createServer(),
        tls.createServer(tlsCerts),
        net.createServer()
    ];

    const prSpoofedLocalAddressAndPort = (async () => {

        /* CNAME web.[dev.]semasim.com => A [dev.]semasim.com => '<dynamic ip>' */
        const address1 = await networkTools.heResolve4(`web.${deploy.getBaseDomain()}`);

        /* SRV _sips._tcp.[dev.]semasim.com => [ { name: 'sip.[dev.]semasim.com', port: 443 } ] */
        const [sipSrv] = await networkTools.resolveSrv(`_sips._tcp.${deploy.getBaseDomain()}`);

        /* A _sips._tcp.[dev.]semasim.com => '<dynamic ip>' */
        const address2 = await networkTools.heResolve4(sipSrv.name);

        const _wrap = (localAddress: string, localPort: number) => ({ localAddress, localPort });

        return {
            "https": _wrap(address1, 443),
            "http": _wrap(address1, 80),
            //"sipUa": _wrap(address2, sipSrv.port),
            "sipGw": _wrap(address2, 80)
        };

    })();

    const prPrivateAndPublicIpsOfLoadBalancer = deploy.isDistributed() ?
        undefined :
        Promise.all(
            ["eth0", "eth1"].map(
                ethDevice => deploy.getPrivateAndPublicIps(
                    "load_balancer",
                    ethDevice
                ))
        );

    const prInterfaceAddress = deploy.isDistributed() ?
        networkTools.getInterfaceAddressInRange(deploy.semasimIpRange) :
        prPrivateAndPublicIpsOfLoadBalancer!.then(a => a[0].privateIp)
        ;

    const prAllServersListening = Promise.all(
        servers.map(
            (server, index) => new Promise<void>(
                async resolve => {

                    server
                        .once("error", error => { throw error; })
                        .once("listening", () => resolve());

                    const { listenOnPort, listenWithInterface } = await (async () => {

                        if (deploy.isDistributed()) {

                            return {
                                "listenOnPort": 0,
                                "listenWithInterface": prInterfaceAddress as string
                            };

                        }

                        const localAddressAndPort = await prSpoofedLocalAddressAndPort;
                        const privateAndPublicIps = await prPrivateAndPublicIpsOfLoadBalancer!;

                        const serverId = (() => {

                            switch (index) {
                                case 0: return "https";
                                case 1: return "http";
                                case 2: return "sipGw";
                                case 3: undefined;
                            }

                        })();

                        const getInterfaceIpFromPublicIp = (publicIp: string) =>
                            privateAndPublicIps.find(v => v.publicIp! === publicIp)!.privateIp;


                        if (serverId === undefined) {
                            return {
                                "listenOnPort": 0,
                                "listenWithInterface": await prInterfaceAddress
                            };
                        } else {

                            const { localPort, localAddress } = localAddressAndPort[serverId];

                            return {
                                "listenOnPort": localPort,
                                "listenWithInterface": getInterfaceIpFromPublicIp(localAddress)
                            };

                        }


                    })();

                    server.listen(listenOnPort, listenWithInterface);

                }
            )
        )
    );

    //NOTE: Gather all promises tasks in a single promise.
    const [spoofedLocalAddressAndPort] = await Promise.all([
        prSpoofedLocalAddressAndPort,
        prAllServersListening,
        dbAuth.resolve().then(() => stripe.launch())
    ]);

    runningInstance = {
        "interfaceAddress": await prInterfaceAddress,
        daemonNumber,
        ...(() => {

            const ports = servers.map(
                server => server.address().port
            );

            return {
                "httpsPort": ports[0],
                "httpPort": ports[1],
                "sipGwPort": ports[2],
                "interInstancesPort": ports[3]
            } as const;

        })()
    };


    dbSemasim.launch();

    dbTurn.launch();

    dbWebphoneData.launch();

    pushNotifications.launch();

    web.launch(servers[0], servers[1]);

    uaConnections.listen(
        new ws.Server({ "server": servers[0] }),
        spoofedLocalAddressAndPort.https
    );

    backendConnections.listen(
        servers[3]
    );

    await loadBalancerConnection.connect();

    //NOTE: Should stay after because we want to
    //first run the command set all sims offline.
    gatewayConnections.listen(
        servers[2],
        spoofedLocalAddressAndPort.sipGw
    );

    debug(`Instance ${daemonNumber} successfully launched`);

}

