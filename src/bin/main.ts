import * as scriptLib from "scripting-tools";
import * as assert from "assert";

scriptLib.createService({
    "rootProcess": async () => {

        const [
            { pidfile_path, unix_user, working_directory_path, srv_name },
            fs,
            { deploy },
        ] = await Promise.all([
            import("./installer"),
            import("fs"),
            import("../deploy")
        ]);


        assert(
            fs.existsSync(working_directory_path),
            "semasim does not seems to be installed."
        );

        {

            const { name: instanceName } = await deploy.getHostInstance();

            if (instanceName === "load_balancer") {

                if (deploy.isDistributed()) {
                    console.log("load_balancer does not run semasim-backend in when distributed mode is enabled");
                    process.exit(0);
                }

            } else if (!!instanceName.match(/^i[0-9]+$/)) {

                if (!deploy.isDistributed()) {
                    throw new Error("Dedicated instance (iX) are not supposed to be up distributed mode is enabled");
                }

            } else {

                throw new Error("Wrong instance");

            }

        }

        return {
            pidfile_path,
            "stop_timeout": 20000,
            "srv_name": srv_name,
            "isQuiet": false,
            "assert_unix_user": "root",
            "daemon_unix_user": deploy.isDistributed() ? unix_user : "root", //NOTE: Need to be root to listen on 443
            "daemon_count": !deploy.isDistributed() ? 1 :
                process.argv.length === 3 ?
                    parseInt(process.argv[2]) :
                    parseInt(scriptLib.sh_eval("nproc")) + 1
        };

    },
    "daemonProcess": async (daemon_number, daemon_count) => {

        const [path, { logger }] = await Promise.all([
            import("path"),
            import("../tools/logger")
        ]);

        const logfile_path = path.join(
            (await import("./installer")).working_directory_path,
            `p${daemon_number}.log`
        );

        logger.file.enable(logfile_path);

        const { launch, beforeExit } = await import("../lib/launch");

        logger.log(`--Starting process ${daemon_number}/${daemon_count}--`);

        return {
            "launch": () => launch(daemon_number),
            "beforeExitTask": async error => {

                if (!!error) {

                    logger.log(error);

                }

                await Promise.all([
                    logger.file.terminate().then(() =>
                        scriptLib.fs_move(
                            "MOVE",
                            logfile_path,
                            path.join(
                                path.dirname(logfile_path),
                                `${!!error ? "crash" : "previous"}_${path.basename(logfile_path)}`
                            )
                        )
                    ),
                    beforeExit().catch(() => { })
                ]);

            }

        };

    }
});

