import * as scriptLib from "scripting-tools";
import * as fs from "fs";
import * as db from "../lib/dbRunningInstances";
import * as i from "./installer";
import * as networkTools from "../tools/networkTools";
import * as path from "path";

scriptLib.createService({
    "rootProcess": async () => {

        console.assert(
            fs.existsSync(i.lb_working_directory_path),
            "The load balancer does not seems to be installed."
        );

        await i.exit_if_not.lb();

        return {
            "pidfile_path": i.lb_pidfile_path,
            "stop_timeout": 20000,
            "assert_unix_user": "root",
            "isQuiet": true
        }

    },
    "daemonProcess": async () => ({
        "launch": async () => {

            console.log("Started.");

            scriptLib.execSync(`echo "" > ${i.nginx_realtime_conf_path}`);

            if (fs.existsSync(i.nginx_pidfile_path)) {
                throw new Error("Nginx pid file should not exist.");
            }

            let nginxLaunched = false;

            fs.watch(
                path.dirname(i.nginx_pidfile_path),
                { "persistent": false },
                (_, filename) => {

                    if (filename !== path.basename(i.nginx_pidfile_path)) {
                        return;
                    }

                    if (!nginxLaunched) {

                        if (fs.existsSync(i.nginx_pidfile_path)) {

                            nginxLaunched = true;

                        }

                    } else {

                        if (!fs.existsSync(i.nginx_pidfile_path)) {

                            throw new Error("Nginx halted");

                        }

                    }

                }
            );

            scriptLib.execSync(`nginx -c ${i.nginx_master_conf_path}`);

            const entryPoints = await EntryPoints.get();

            await db.launch(i.dbAuth.host);

            await db.cleanup();

            db.getEvtRunningInstances().attach(
                runningInstances => {

                    onRunningInstancesChanged(entryPoints, runningInstances);

                    scriptLib.execSync(`pkill --pidfile ${i.nginx_pidfile_path} -SIGHUP`);

                }
            );

        },
        "beforeExitTask": error => new Promise(resolve => {

            if (!!error) {
                console.log(error);
            }

            if (fs.existsSync(i.nginx_pidfile_path)) {

                fs.watch(
                    path.dirname(i.nginx_pidfile_path),
                    { "persistent": false },
                    (_, filename) => {

                        if (filename !== path.basename(i.nginx_pidfile_path)) {
                            return;
                        }

                        if (!fs.existsSync(i.nginx_pidfile_path)) {

                            console.log("Nginx terminated.");

                            resolve();

                        }

                    }
                );

                scriptLib.stopProcessSync(i.nginx_pidfile_path, "SIGTERM");

                console.log("Waiting for Nginx to terminate...");

            }


        })
    })
});



type EntryPoints = {
    https: string; /* 172.31.19.1:443 */
    http: string; /* 172.31.19.1:80 */
    sipUa: string; /* 172.31.19.2:443 */
    sipGw: string; /* 172.31.19.2:80 */
};

namespace EntryPoints {

    export async function get(): Promise<EntryPoints> {

        /* CNAME www.semasim.com => A semasim.com => interfaceIp: 172.31.19.1; publicIp: 52.58.64.189; */
        const httpIps = await networkTools.retrieveIpsFromHostname("www.semasim.com");

        const https = `${httpIps.interfaceIp}:443`;
        const http = `${httpIps.interfaceIp}:80`;

        /* SRV _sips._tcp.semasim.com => [ sip.semasim.com:443 ] */
        const [sipSrv] = await networkTools.resolveSrv("_sips._tcp.semasim.com");

        /* A sip.semasim.com => interfaceIp: 172.31.19.2; publicIp: 52.57.54.73 */
        const sipIps = await networkTools.retrieveIpsFromHostname(sipSrv.name);

        const sipUa = `${sipIps.interfaceIp}:${sipSrv.port}`;
        const sipGw = `${sipIps.interfaceIp}:80`;

        return { https, http, sipUa, sipGw };

    }
}
function onRunningInstancesChanged(
    entryPoints: EntryPoints,
    runningInstances: db.RunningInstance[]
): void {


    //TODO: redirect to maintenance.
    if (!runningInstances.length) {
        console.log("...No semasim instance running...");
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
    const build_stream_entry = (
        id: string,
        epKey: keyof EntryPoints,
        riKey: keyof db.RunningInstance
    ): string[] => ([
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
    ]);

    const drop_in_conf = [
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

    console.log(`Nginx updated, ${runningInstances.length} instances running.`);

    fs.writeFileSync(
        i.nginx_realtime_conf_path,
        Buffer.from(drop_in_conf, "utf8")
    );

}




