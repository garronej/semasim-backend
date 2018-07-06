
import * as fs from "fs";
import * as path from "path";
import * as scriptLib from "scripting-tools";
import * as networkTools from "../tools/networkTools";
import { PushNotificationCredentials } from "../tools/pushSender";

export const module_dir_path = path.join(__dirname, "..", "..");

export const srv_name= "semasim";
export const unix_user = "semasim";
export const working_directory_path = path.join(module_dir_path, "working_directory");
export const pidfile_path= path.join(working_directory_path, "pid");

export const lb_srv_name = "lb_semasim";
export const lb_working_directory_path = path.join(module_dir_path, "lb_working_directory");
export const lb_pidfile_path= path.join(lb_working_directory_path, "pid");
export const nginx_pidfile_path = path.join(lb_working_directory_path, "nginx.pid");
export const nginx_master_conf_path = path.join(lb_working_directory_path, "nginx.conf");
export const nginx_realtime_conf_path = path.join(lb_working_directory_path, "nginx_realtime.conf");
export const nginx_path = "/usr/sbin/nginx";

export const semasim_lan = "172.31.20.0/24";

export const dbAuth = {
    "host": "172.31.19.1",
    "port": 3306,
    "user": "semasim",
    "password": "5iv2hG50BAhbU7bL"
};

const private_dir_path = path.normalize(path.join(module_dir_path, "..", "private"));

export const tlsPath = (() => {

    const build = (fileName: string) => path.join(private_dir_path, "domain-certificates", fileName);

    return {
        "key": build("privkey.pem"),
        "cert": build("fullchain.pem"),
        "ca": build("chain.pem")
    };

})();

export const pushNotificationCredentials: PushNotificationCredentials = {
    "android": {
        "pathToServiceAccount": path.join(private_dir_path, "semasimdev-firebase-adminsdk.json")
    },
    "iOS": {
        "pathToKey": path.join(private_dir_path, "AuthKey_Y84XM8SSNL.p8"),
        "keyId": "Y84XM8SSNL",
        "teamId": "TW9WZG49Q3",
        "appId": "com.semasim.semasim"
    }
};

/** Safety function to check if we are running in the current context */
export namespace exit_if_not {

    export async function lb(): Promise<void> {

        try {

            await networkTools.retrieveIpsFromHostname("semasim.com");

        } catch{

            console.log(
                scriptLib.colorize(
                    "This host does not seems to be the load balancer",
                    "RED"
                )
            );

            process.exit(1);

        }

    }

    export async function run_instance(): Promise<void> {

        try {

            await networkTools.getInterfaceAddressInRange(semasim_lan);

        } catch {

            console.log(
                scriptLib.colorize(
                    "This host does not seems to be configured to run semasim",
                    "RED"
                )
            );

            process.exit(1);

        }

    }

}

function program_action_install() {

    program_action_uninstall();

    scriptLib.unixUser.create(unix_user);

    scriptLib.execSync(`mkdir ${working_directory_path}`);

    scriptLib.execSync(`chown -R ${unix_user}:${unix_user} ${working_directory_path}`);

    scriptLib.systemd.createConfigFile(
        srv_name, path.join(__dirname, "main.js"), undefined, "ENABLE", false
    );

    console.log(`Start daemon now with:\n$ systemctl start ${srv_name}`);

}

function program_action_uninstall() {

    scriptLib.stopProcessSync(pidfile_path);

    if( fs.existsSync(working_directory_path) ){

        scriptLib.execSync(`rm -r ${working_directory_path}`);

    }

    if( scriptLib.sh_if(`id -u ${unix_user}`) ){

        scriptLib.unixUser.remove(unix_user);

    }

    scriptLib.systemd.deleteConfigFile(srv_name);

}

function program_action_lb_install() {

    if( !fs.existsSync(nginx_path) ){

        console.log("Install nginx fist! (Tested with nginx version: nginx/1.12.2)");

        process.exit(1);

    }

    program_action_lb_uninstall();

    try{ scriptLib.execSyncQuiet("systemctl stop nginx"); } catch{}

    try{ scriptLib.execSyncQuiet("systemctl disable nginx"); } catch{}

    scriptLib.execSync(`mkdir ${lb_working_directory_path}`);

    fs.writeFileSync(
        nginx_master_conf_path,
        Buffer.from([
            `user  root;`,
            `worker_processes  1;`,
            `error_log  ${path.join(lb_working_directory_path, "nginx_error.log")} warn;`,
            `pid        ${nginx_pidfile_path};`,
            `events {`,
            `    worker_connections  1024;`,
            `}`,
            `include ${nginx_realtime_conf_path};`,
            ``
        ].join("\n"), "utf8")
    );

    scriptLib.systemd.createConfigFile(
        lb_srv_name, path.join(__dirname, "lb_main.js"), undefined, "ENABLE", false
    );

    console.log(`Start daemon now with:\n$ systemctl start ${lb_srv_name}`);

}

function program_action_lb_uninstall() {

    scriptLib.stopProcessSync.log= console.log.bind(console);

    scriptLib.stopProcessSync(lb_pidfile_path);

    if( fs.existsSync(lb_working_directory_path) ){

        scriptLib.execSync(`rm -r ${lb_working_directory_path}`);

    }

    scriptLib.systemd.deleteConfigFile(lb_srv_name);

}

if (require.main === module) {

    process.once("unhandledRejection", error => { throw error; });

    scriptLib.exit_if_not_root();

    import("commander").then(program => {

        program
            .command("install")
            .action(async () => {
                await exit_if_not.run_instance();
                program_action_install();
            })
            ;

        program
            .command("uninstall")
            .action(async () => {
                await exit_if_not.run_instance();
                program_action_uninstall();
            })
            ;

        program
            .command("lb_install")
            .action(async () => {
                await exit_if_not.lb();
                program_action_lb_install();
            })
            ;

        program
            .command("lb_uninstall")
            .action(async () => {
                await exit_if_not.lb();
                program_action_lb_uninstall();
            })
            ;


        program.parse(process.argv);

    });

}
