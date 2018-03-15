require("rejection-tracker").main(__dirname, "..", "..");

import * as fs from "fs";
import { scriptsTools } from "../semasim-gateway";
import * as db from "../lib/dbRunningInstances";
import * as c from "../lib/_constants";
import * as path from "path";
import * as networkTools from "../tools/networkTools";

const path_to_nginx = path.join("/", "etc", "nginx");
const path_to_tcpconf_d = path.join(path_to_nginx, "tcpconf.d");

type EntryPoints = {
    https: string; /* 172.31.19.1:443 */
    http: string; /* 172.31.19.1:80 */
    sipUa: string; /* 172.31.19.2:443 */
    sipGw: string; /* 172.31.19.2:80 */
};

namespace EntryPoints {

    export async function get(): Promise<EntryPoints> {

        /* CNAME www.semasim.com => A semasim.com => interfaceIp: 172.31.19.1; publicIp: 52.58.64.189; */
        let httpIps = await networkTools.retrieveIpsFromHostname(`www.${c.shared.domain}`);

        let https = `${httpIps.interfaceIp}:443`;
        let http = `${httpIps.interfaceIp}:80`;

        /* SRV _sips._tcp.semasim.com => [ sip.semasim.com:443 ] */
        let [sipSrv] = await networkTools.resolveSrv(`_sips._tcp.${c.shared.domain}`);

        /* A sip.semasim.com => interfaceIp: 172.31.19.2; publicIp: 52.57.54.73 */
        let sipIps = await networkTools.retrieveIpsFromHostname(sipSrv.name);

        let sipUa = `${sipIps.interfaceIp}:${sipSrv.port}`;
        let sipGw = `${sipIps.interfaceIp}:${c.shared.gatewayPort}`;

        return { https, http, sipUa, sipGw };

    }
}


function onRunningInstancesChanged(
    entryPoints: EntryPoints,
    runningInstances: db.RunningInstance[]
): void {

    //TODO: redirect to maintenance.
    if (!runningInstances.length) {
        return;
    }

    /**
     * semasim_https, "https", "httpsPort" 
     * 
     * =>
     * 
     * upstream semasim_https {
     *      server 172.31.20.X:xxx;
     *      ....
     * }
     * 
     * server {
     *      listen 172.31.19.1:443;
     *      proxy_pass semasim_https;
     * }
     * 
     */
    let build_stream_entry = function (
        id: string,
        epKey: keyof EntryPoints,
        riKey: keyof db.RunningInstance
    ): string[] {
        return [
            "",
            `   upstream ${id} {`,
            ...runningInstances.map(i => `      server ${i.interfaceAddress}:${i[riKey]};`),
            "   }",
            "",
            "   server {",
            `       listen ${entryPoints[epKey]};`,
            `       proxy_pass ${id};`,
            "   }",
            ""
        ];
    }

    let raw_lb_file= [
        "",
        "stream {",
        "",
        "   proxy_bind $remote_addr transparent;",
        ...build_stream_entry("semasim_https", "https", "httpsPort"),
        ...build_stream_entry("semasim_http", "http", "httpPort"),
        ...build_stream_entry("semasim_sip_ua", "sipUa", "sipUaPort"),
        ...build_stream_entry("semasim_sip_gw", "sipGw", "sipGwPort"),
        "}",
        ""
    ].join("\n");

    console.log("nginx update");

    console.log(raw_lb_file);

    fs.writeFileSync(
        path.join(path_to_tcpconf_d, "lb"),
        Buffer.from(raw_lb_file, "utf8")
    );

    scriptsTools.run("systemctl reload nginx");

}

(async function main() {

    console.log("start nginx updater...");

    try {

        await scriptsTools.run("systemctl stop nginx");

    } catch (error) {

        console.log(error);

    }

    if (!fs.existsSync(path_to_nginx)) {
        throw new Error("nginx not installed");
    }

    fs.writeFileSync(
        path.join(path_to_nginx, "nginx.conf"),
        Buffer.from(
            fs.readFileSync(
                path.join(__dirname, "..", "..", "res", "nginx.conf"),
                "utf8"
            ),
            "utf8"
        )
    );

    await scriptsTools.run([
        `rm -rf ${path_to_tcpconf_d}`,
        `mkdir ${path_to_tcpconf_d}`
    ].join(" && "));

    let entryPoints = await EntryPoints.get();

    await scriptsTools.run("systemctl start nginx");

    await db.launch(c.dbAuth.host);

    await db.cleanup();

    console.log("...nginx updater started");

    db.getEvtRunningInstances().attach(
        runningInstances => onRunningInstancesChanged(entryPoints, runningInstances)
    );

})();
