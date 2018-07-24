import { networkTools } from "../semasim-load-balancer";
import * as i from "../bin/installer";
import * as  https from "https";
import * as http from "http";
import * as fs from "fs";
import * as tls from "tls";
import * as net from "net";
import * as dbSemasim from "./dbSemasim";
import * as clientSide from "./clientSide/launch";
import * as gatewaySide from "./gatewaySide/init";
import { SyncEvent } from "ts-events-extended";
import * as pushNotifications from "./pushNotifications";
import * as logger from "logger";
import { safePr } from "scripting-tools";
import * as loadBalancerSocket from "./loadBalancerSocket/launch";

const debug= logger.debugFactory();

async function getEntryPoints(): Promise<getEntryPoints.EntryPoints>{

    let evt= new SyncEvent<getEntryPoints.EntryPoints>();

    getEntryPoints.fetch().then(entryPoints=> evt.post(entryPoints));

    try{ 
        return await evt.waitFor(2000);
    }catch{

        debug("no internet connection...default");

        return getEntryPoints.defaults;
    }

}

namespace getEntryPoints {

    const _wrap = (address: string, port: number) => ({ address, port });

    /** In case we do not have internet connection */
    export const defaults = (() => {

        let address1 = "52.58.64.189";
        let sipSrv_port = 443;
        let address2 = "52.57.54.73";

        return {
            "https": _wrap(address1, 443),
            "http": _wrap(address1, 80),
            "sipUa": _wrap(address2, sipSrv_port),
            "sipGw": _wrap(address2, 80)
        };

    })();

    export type EntryPoints= typeof defaults;

    export async function fetch(): Promise<EntryPoints> {

        /* CNAME www.semasim.com => A semasim.com => '52.58.64.189' */
        const address1 = await networkTools.resolve4("www.semasim.com");

        /* SRV _sips._tcp.semasim.com => [ { name: 'sip.semasim.com,port', port: 443 } ] */
        const [sipSrv] = await networkTools.resolveSrv("_sips._tcp.semasim.com");

        /* A _sips._tcp.semasim.com => '52.57.54.73' */
        const address2 = await networkTools.resolve4(sipSrv.name);

        return {
            "https": _wrap(address1, 443),
            "http": _wrap(address1, 80),
            "sipUa": _wrap(address2, sipSrv.port),
            "sipGw": _wrap(address2, 80)
        };

    }


}

function loadTlsCerts() {

    const out = Object.assign({}, i.tlsPath);

    for (const key in i.tlsPath) {
        out[key] = fs.readFileSync(i.tlsPath[key], "utf8");
    }

    return out;

};


export async function beforeExit(){

    debug("BeforeExit...");

    for( const server of beforeExit.servers ){
        server.close();
    }

    loadBalancerSocket.beforeExit();

    await Promise.all(
        [
            pushNotifications.beforeExit(),
            clientSide.beforeExit(),
            (async () => {

                await safePr(gatewaySide.beforeExit(), 15000);

                await dbSemasim.beforeExit();

            })()
        ].map(pr => safePr(pr))
    );

    debug("BeforeExit completed in time");

}

export namespace beforeExit {
    export const servers = new Set<net.Server>();
}

//TODO: add a main script that call this function in /bin dir
export async function launch(daemonNumber: number) {

    debug("Launch!");

    const tlsCerts = loadTlsCerts();

    const interfaceAddress = networkTools
        .getInterfaceAddressInRange(i.semasim_lan);

    const tasks: Promise<net.Server>[] = [];

    for (const createServer of [
        () => https.createServer(tlsCerts),
        () => http.createServer(),
        () => tls.createServer(tlsCerts),
        () => tls.createServer(tlsCerts),
        () => net.createServer()
    ]) {

        tasks[tasks.length] = new Promise(
            resolve => {

                const server = createServer();

                server
                    .once("error", error => { throw error; })
                    .listen(0, interfaceAddress)
                    .once("listening", () => {

                        beforeExit.servers.add(server);

                        resolve(server);

                    })
                    ;

            }
        );

    }

    dbSemasim.launch();

    pushNotifications.launch();


    const [entryPoints, servers] = await Promise.all([
        getEntryPoints(),
        Promise.all(tasks)
    ]);

    clientSide.launch({
        "https": {
            "server": servers[0] as https.Server,
            "spoofedLocal": entryPoints.https
        },
        "http": {
            "server": servers[1] as http.Server,
            "spoofedLocal": entryPoints.http
        },
        "sips": {
            "server": servers[2] as tls.Server,
            "spoofedLocal": entryPoints.sipUa
        },
        "sip": {
            "server": servers[4] as net.Server
        }

    });

    gatewaySide.init({
        "server": servers[3] as tls.Server,
        "spoofedLocal": entryPoints.sipGw
    });

    const ports = servers.map(server => server.address().port);

    debug({ ports });

    await loadBalancerSocket.launch({
        interfaceAddress,
        daemonNumber,
        "httpsPort": ports[0],
        "httpPort": ports[1],
        "sipUaPort": ports[2],
        "sipGwPort": ports[3],
        "interInstancesPort": ports[4]
    });

    debug(`Instance ${daemonNumber} successfully launched`);

}
