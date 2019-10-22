"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
const http = require("http");
const fs = require("fs");
const tls = require("tls");
const net = require("net");
const ws = require("ws");
//NOTE: Must be located before importing files that may use it.
exports.getLocalRunningInstance = () => runningInstance;
const deploy_1 = require("../deploy");
const dbSemasim = require("./dbSemasim");
const dbWebphone = require("./dbWebphone");
const dbTurn = require("./dbTurn");
const pushNotifications = require("./pushNotifications");
const logger = require("logger");
const backendConnections = require("./toBackend/connections");
const gatewayConnections = require("./toGateway/connections");
const uaConnections = require("./toUa/connections");
const loadBalancerConnection = require("./toLoadBalancer/connection");
const web = require("./web/launch");
const deploy_2 = require("../../../deploy/dist/lib/deploy");
const stripe = require("./stripe");
const frontend_1 = require("../frontend");
const changeRates_1 = require("../tools/changeRates");
const debug = logger.debugFactory();
async function beforeExit() {
    debug("BeforeExit...");
    await dbSemasim.setAllSimOffline(gatewayConnections.getImsis());
    debug("BeforeExit completed in time");
}
exports.beforeExit = beforeExit;
let runningInstance;
async function launch(daemonNumber) {
    debug("Launch");
    frontend_1.currencyLib.convertFromEuro.setChangeRatesFetchMethod(changeRates_1.fetch, 24 * 3600 * 1000);
    const tlsCerts = (() => {
        const out = Object.assign({}, deploy_1.deploy.getDomainCertificatesPath());
        for (const key in out) {
            out[key] = fs.readFileSync(out[key]).toString("utf8");
        }
        return out;
    })();
    const servers = [
        https.createServer(tlsCerts),
        http.createServer(),
        tls.createServer(tlsCerts),
        net.createServer()
    ];
    const prSpoofedLocalAddressAndPort = (async () => {
        /* CNAME web.[dev.]semasim.com => A [dev.]semasim.com => '<dynamic ip>' */
        const address1 = await deploy_1.networkTools.heResolve4(`web.${deploy_1.deploy.getBaseDomain()}`);
        /* SRV _sips._tcp.[dev.]semasim.com => [ { name: 'sip.[dev.]semasim.com', port: 443 } ] */
        const [sipSrv] = await deploy_1.networkTools.resolveSrv(`_sips._tcp.${deploy_1.deploy.getBaseDomain()}`);
        /* A _sips._tcp.[dev.]semasim.com => '<dynamic ip>' */
        const address2 = await deploy_1.networkTools.heResolve4(sipSrv.name);
        const _wrap = (localAddress, localPort) => ({ localAddress, localPort });
        return {
            "https": _wrap(address1, 443),
            "http": _wrap(address1, 80),
            //"sipUa": _wrap(address2, sipSrv.port),
            "sipGw": _wrap(address2, 80)
        };
    })();
    const prPrivateAndPublicIpsOfLoadBalancer = deploy_1.deploy.isDistributed() ?
        undefined :
        Promise.all(["eth0", "eth1"].map(ethDevice => deploy_1.deploy.getPrivateAndPublicIps("load_balancer", ethDevice)));
    const prInterfaceAddress = deploy_1.deploy.isDistributed() ?
        deploy_1.networkTools.getInterfaceAddressInRange(deploy_1.deploy.semasimIpRange) :
        prPrivateAndPublicIpsOfLoadBalancer.then(a => a[0].privateIp);
    const prAllServersListening = Promise.all(servers.map((server, index) => new Promise(async (resolve) => {
        server
            .once("error", error => { throw error; })
            .once("listening", () => resolve());
        const { listenOnPort, listenWithInterface } = await (async () => {
            if (deploy_1.deploy.isDistributed()) {
                return {
                    "listenOnPort": 0,
                    "listenWithInterface": prInterfaceAddress
                };
            }
            const localAddressAndPort = await prSpoofedLocalAddressAndPort;
            const privateAndPublicIps = await prPrivateAndPublicIpsOfLoadBalancer;
            const serverId = (() => {
                switch (index) {
                    case 0: return "https";
                    case 1: return "http";
                    case 2: return "sipGw";
                    case 3: undefined;
                }
            })();
            const getInterfaceIpFromPublicIp = (publicIp) => privateAndPublicIps.find(v => v.publicIp === publicIp).privateIp;
            if (serverId === undefined) {
                return {
                    "listenOnPort": 0,
                    "listenWithInterface": await prInterfaceAddress
                };
            }
            else {
                const { localPort, localAddress } = localAddressAndPort[serverId];
                return {
                    "listenOnPort": localPort,
                    "listenWithInterface": getInterfaceIpFromPublicIp(localAddress)
                };
            }
        })();
        server.listen(listenOnPort, listenWithInterface);
    })));
    //NOTE: Gather all promises tasks in a single promise.
    const [spoofedLocalAddressAndPort] = await Promise.all([
        prSpoofedLocalAddressAndPort,
        prAllServersListening,
        deploy_2.dbAuth.resolve().then(() => stripe.launch())
    ]);
    runningInstance = Object.assign({ "interfaceAddress": await prInterfaceAddress, daemonNumber }, (() => {
        const ports = servers.map(server => server.address().port);
        return {
            "httpsPort": ports[0],
            "httpPort": ports[1],
            "sipGwPort": ports[2],
            "interInstancesPort": ports[3]
        };
    })());
    dbSemasim.launch();
    dbTurn.launch();
    dbWebphone.launch();
    pushNotifications.launch();
    web.launch(servers[0], servers[1]);
    uaConnections.listen(new ws.Server({ "server": servers[0] }), spoofedLocalAddressAndPort.https);
    backendConnections.listen(servers[3]);
    await loadBalancerConnection.connect();
    //NOTE: Should stay after because we want to
    //first run the command set all sims offline.
    gatewayConnections.listen(servers[2], spoofedLocalAddressAndPort.sipGw);
    debug(`Instance ${daemonNumber} successfully launched`);
}
exports.launch = launch;
