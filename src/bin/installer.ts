
import * as fs from "fs";
import * as path from "path";
import * as scriptLib from "scripting-tools";
import { networkTools } from "../semasim-load-balancer";
import { PushNotificationCredentials } from "../tools/pushSender";

export const module_dir_path = path.join(__dirname, "..", "..");

export const srv_name = "semasim";
export const unix_user = "semasim";
export const working_directory_path = path.join(module_dir_path, "working_directory");
export const pidfile_path = path.join(working_directory_path, "pid");

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

export const awsCredentialsFilePath= path.join(private_dir_path, "aws_credentials.ini");

/** Safety function to check if we are running in the current context */
export async function exit_if_not_run_instance(): Promise<void> {

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

    if (fs.existsSync(working_directory_path)) {

        scriptLib.execSync(`rm -r ${working_directory_path}`);

    }

    if (scriptLib.sh_if(`id -u ${unix_user}`)) {

        scriptLib.unixUser.remove(unix_user);

    }

    scriptLib.systemd.deleteConfigFile(srv_name);

}

if (require.main === module) {

    process.once("unhandledRejection", error => { throw error; });

    scriptLib.exit_if_not_root();

    import("commander").then(async  program => {

        await exit_if_not_run_instance();

        program
            .command("install")
            .action(async () => {
                program_action_install();
            })
            ;

        program
            .command("uninstall")
            .action(async () => {
                program_action_uninstall();
            })
            ;


        program.parse(process.argv);

    });

}
