
import * as fs from "fs";
import * as path from "path";
import * as scriptLib from "scripting-tools";
import { deploy } from "../deploy";

export const module_dir_path = path.join(__dirname, "..", "..");

export const srv_name = "semasim";
export const unix_user = "semasim";
export const working_directory_path = path.join(module_dir_path, "working_directory");
export const pidfile_path = path.join(working_directory_path, "pid");


async function program_action_install() {

    program_action_uninstall();

    for (const package_name of ["geoip-bin", "geoip-database-contrib"]) {
        await scriptLib.apt_get_install(package_name);
    }

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

        deploy.assertInstance(/i[0-9]+/);

        program
            .command("install")
            .action(() => program_action_install())
            ;

        program
            .command("uninstall")
            .action(() => program_action_uninstall())
            ;


        program.parse(process.argv);

    });

}
