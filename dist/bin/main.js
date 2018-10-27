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
const scriptLib = require("scripting-tools");
scriptLib.createService({
    "rootProcess": () => __awaiter(this, void 0, void 0, function* () {
        const [{ pidfile_path, unix_user, working_directory_path, srv_name }, fs, { deploy }] = yield Promise.all([
            Promise.resolve().then(() => require("./installer")),
            Promise.resolve().then(() => require("fs")),
            Promise.resolve().then(() => require("../deploy"))
        ]);
        console.assert(fs.existsSync(working_directory_path), "semasim does not seems to be installed.");
        deploy.assertInstance(/i[0-9]+/);
        return {
            pidfile_path,
            "stop_timeout": 20000,
            "srv_name": srv_name,
            "isQuiet": false,
            "assert_unix_user": "root",
            "daemon_unix_user": unix_user,
            "daemon_count": process.argv.length === 3 ?
                parseInt(process.argv[2]) :
                parseInt(scriptLib.sh_eval("nproc")) + 1
        };
    }),
    "daemonProcess": (daemon_number, daemon_count) => __awaiter(this, void 0, void 0, function* () {
        const [path, { working_directory_path }, { launch, beforeExit }, logger, fs] = yield Promise.all([
            Promise.resolve().then(() => require("path")),
            Promise.resolve().then(() => require("./installer")),
            Promise.resolve().then(() => require("../lib/launch")),
            Promise.resolve().then(() => require("logger")),
            Promise.resolve().then(() => require("fs"))
        ]);
        logger.log(`--Starting process ${daemon_number}/${daemon_count}--`);
        const logfile_path = path.join(working_directory_path, `p${daemon_number}.log`);
        return {
            "launch": () => {
                logger.file.enable(logfile_path);
                process.on("warning", error => logger.log("WARNING", error));
                launch(daemon_number);
            },
            "beforeExitTask": (error) => __awaiter(this, void 0, void 0, function* () {
                if (!!error) {
                    logger.log(error);
                }
                yield Promise.all([
                    logger.file.terminate().then(() => {
                        if (!!error) {
                            scriptLib.execSync([
                                `mv ${logfile_path}`,
                                path.join(path.dirname(logfile_path), `crash_${Date.now()}_${path.basename(logfile_path)}`)
                            ].join(" "));
                        }
                        else {
                            fs.unlinkSync(logfile_path);
                        }
                    }),
                    scriptLib.safePr(beforeExit())
                ]);
            })
        };
    })
});
