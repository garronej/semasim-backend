import * as scriptLib from "scripting-tools";

scriptLib.createService({
    "rootProcess": async () => {

        const [
            { pidfile_path, unix_user, exit_if_not_run_instance, working_directory_path, srv_name },
            fs
        ] = await Promise.all([
            import("./installer"),
            import("fs")
        ]);

        console.assert(
            fs.existsSync(working_directory_path),
            "semasim does not seems to be installed."
        );

        await exit_if_not_run_instance();

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

    },
    "daemonProcess": async (daemon_number, daemon_count) => {

        const [
            path,
            { working_directory_path },
            { launch, beforeExit },
            logger,
            fs
        ] = await Promise.all([
            import("path"),
            import("./installer"),
            import("../lib/launch"),
            import("logger"),
            import("fs")
        ]);

        logger.log(`--Starting process ${daemon_number}/${daemon_count}--`);

        const logfile_path = path.join(working_directory_path, `p${daemon_number}.log`);

        return {
            "launch": () => {

                logger.file.enable(logfile_path);

                process.on("warning", error => logger.log("WARNING", error));

                launch(daemon_number);

            },
            "beforeExitTask": async error => {

                if (!!error) {

                    logger.log(error);

                }

                await Promise.all([
                    logger.file.terminate().then(() => {

                        if (!!error) {

                            scriptLib.execSync([
                                `mv ${logfile_path}`,
                                path.join(
                                    path.dirname(logfile_path),
                                    `crash_${path.basename(logfile_path)}`
                                )
                            ].join(" "));

                        } else {

                            fs.unlinkSync(logfile_path);

                        }

                    }),
                    scriptLib.safePr(beforeExit())
                ]);


            }

        };

    }
});

