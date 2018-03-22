process.once("warning", error=> { 

    console.log("WARNING WARNING WARNING");

    console.log(error.stack);

});

import * as networkTools from "../tools/networkTools";
import * as c from "./_constants";
import * as  https from "https";
import * as http from "http";
import * as fs from "fs";
import * as tls from "tls";
import * as net from "net";
import * as dbRunningInstances from "./dbRunningInstances";
import * as dbSemasim from "./dbSemasim";
import { launch as clientSide_launch} from "./clientSide";
import { launch as gatewaySide_launch} from "./gatewaySide";
import { SyncEvent } from "ts-events-extended";
import * as pushNotifications from "./pushNotifications";

async function getEntryPoints(): Promise<getEntryPoints.EntryPoints>{

    let evt= new SyncEvent<getEntryPoints.EntryPoints>();

    getEntryPoints.fetch().then(entryPoints=> evt.post(entryPoints));

    try{ 
        return await evt.waitFor(2000);
    }catch{

        console.log("no internet connection...default");

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
            "sipGw": _wrap(address2, c.shared.gatewayPort)
        };

    })();

    export type EntryPoints= typeof defaults;

    export async function fetch(): Promise<EntryPoints> {

        /* CNAME www.semasim.com => A semasim.com => '52.58.64.189' */
        let address1 = await networkTools.resolve4(`www.${c.shared.domain}`);

        /* SRV _sips._tcp.semasim.com => [ { name: 'sip.semasim.com,port', port: 443 } ] */
        let [sipSrv] = await networkTools.resolveSrv(`_sips._tcp.${c.shared.domain}`);

        /* A _sips._tcp.semasim.com => '52.57.54.73' */
        let address2 = await networkTools.resolve4(sipSrv.name);

        return {
            "https": _wrap(address1, 443),
            "http": _wrap(address1, 80),
            "sipUa": _wrap(address2, sipSrv.port),
            "sipGw": _wrap(address2, c.shared.gatewayPort)
        };

    }


}

function loadTlsCerts() {

    let out = Object.assign({}, c.tlsPath);

    for (let key in c.tlsPath) {
        out[key] = fs.readFileSync(c.tlsPath[key], "utf8");
    }

    return out;

};

//TODO: add a main script that call this function in /bin dir
export async function launch() {

    console.log("Launch!");

    const tlsCerts = loadTlsCerts();

    let interfaceAddress = networkTools
        .getInterfaceAddressInRange(c.semasim_lan);

    let tasks: Promise<net.Server>[] = [];

    for (let createServer of [
        () => https.createServer(tlsCerts),
        () => http.createServer(),
        () => tls.createServer(tlsCerts),
        () => tls.createServer(tlsCerts),
        () => net.createServer()
    ]) {

        tasks[tasks.length] = new Promise(
            resolve => {

                let server = createServer();

                server
                    .once("error", error => { throw error; })
                    .listen(0, interfaceAddress)
                    .once("listening", () => resolve(server))
                    ;

            }
        );

    }

    let [entryPoints, servers] = await Promise.all([
        getEntryPoints(),
        Promise.all(tasks),
        dbSemasim.launch(),
        dbRunningInstances.launch(),
        pushNotifications.launch()
    ]);

    clientSide_launch({
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

    gatewaySide_launch({
        "server": servers[3] as tls.Server,
        "spoofedLocal": entryPoints.sipGw
    });

    let ports = servers.map(server => server.address().port);

    console.log({ ports });

    dbRunningInstances.setRunningInstance({
        interfaceAddress,
        "httpsPort": ports[0],
        "httpPort": ports[1],
        "sipUaPort": ports[2],
        "sipGwPort": ports[3],
        "interInstancesPort": ports[4]
    });

}
