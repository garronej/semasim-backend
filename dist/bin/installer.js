"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const scriptLib = require("scripting-tools");
const deploy_1 = require("../deploy");
exports.module_dir_path = path.join(__dirname, "..", "..");
exports.srv_name = "semasim";
exports.unix_user = "semasim";
exports.working_directory_path = path.join(exports.module_dir_path, "working_directory");
exports.pidfile_path = path.join(exports.working_directory_path, "pid");
async function program_action_install() {
    program_action_uninstall();
    await scriptLib.apt_get_install("geoip-bin");
    const { db_file_path } = await Promise.resolve().then(() => require("../tools/geoiplookup"));
    scriptLib.execSync(`mkdir -p ${path.dirname(db_file_path)}`);
    await scriptLib.web_get("https://github.com/garronej/releases/releases/download/misc/GeoLiteCity.dat", db_file_path);
    scriptLib.unixUser.create(exports.unix_user);
    scriptLib.execSync(`mkdir ${exports.working_directory_path}`);
    scriptLib.execSync(`chown -R ${exports.unix_user}:${exports.unix_user} ${exports.working_directory_path}`);
    scriptLib.systemd.createConfigFile(exports.srv_name, path.join(__dirname, "main.js"), undefined, "ENABLE", false);
    console.log(`Start daemon now with:\n$ systemctl start ${exports.srv_name}`);
}
function program_action_uninstall() {
    scriptLib.stopProcessSync(exports.pidfile_path);
    if (fs.existsSync(exports.working_directory_path)) {
        scriptLib.execSync(`rm -r ${exports.working_directory_path}`);
    }
    if (scriptLib.sh_if(`id -u ${exports.unix_user}`)) {
        scriptLib.unixUser.remove(exports.unix_user);
    }
    scriptLib.systemd.deleteConfigFile(exports.srv_name);
}
if (require.main === module) {
    process.once("unhandledRejection", error => { throw error; });
    scriptLib.exit_if_not_root();
    Promise.resolve().then(() => require("commander")).then(async (program) => {
        deploy_1.deploy.assertInstance(/^(load_balancer|i[0-9]+)$/);
        program
            .command("install")
            .action(() => program_action_install());
        program
            .command("uninstall")
            .action(() => program_action_uninstall());
        program.parse(process.argv);
    });
}
