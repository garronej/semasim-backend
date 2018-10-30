"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function program_action_install() {
    return __awaiter(this, void 0, void 0, function* () {
        program_action_uninstall();
        {
            yield scriptLib.apt_get_install("geoip-bin");
            const execSync = (cmd) => scriptLib.execSyncTrace(cmd, { "cwd": "/tmp" });
            for (const target of [
                "GeoLiteCountry/GeoIP.dat.gz",
                "GeoLiteCity.dat.gz",
                "asnum/GeoIPASNum.dat.gz"
            ]) {
                execSync(`wget http://geolite.maxmind.com/download/geoip/database/${target}`);
                execSync(`gunzip ${path.basename(target)}`);
                execSync(`mv ${path.basename(target, ".gz")} /usr/share/GeoIP`);
            }
        }
        scriptLib.unixUser.create(exports.unix_user);
        scriptLib.execSync(`mkdir ${exports.working_directory_path}`);
        scriptLib.execSync(`chown -R ${exports.unix_user}:${exports.unix_user} ${exports.working_directory_path}`);
        scriptLib.systemd.createConfigFile(exports.srv_name, path.join(__dirname, "main.js"), undefined, "ENABLE", false);
        console.log(`Start daemon now with:\n$ systemctl start ${exports.srv_name}`);
    });
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
    Promise.resolve().then(() => require("commander")).then((program) => __awaiter(this, void 0, void 0, function* () {
        deploy_1.deploy.assertInstance(/i[0-9]+/);
        program
            .command("install")
            .action(() => program_action_install());
        program
            .command("uninstall")
            .action(() => program_action_uninstall());
        program.parse(process.argv);
    }));
}
