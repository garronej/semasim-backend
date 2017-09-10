#!/usr/bin/env node

import { c } from "../lib/_constants";

import * as path from "path";
const modulePath = path.join(__dirname, "..", "..");
const systemdServicePath = path.join("/etc", "systemd", "system", `${c.serviceName}.service`);

require("rejection-tracker").main(modulePath);

import * as program from "commander";
import { commanderFunctions as _ } from "../semasim-gateway"
import { unlinkSync } from "fs";
import "colors";

program
    .command("postinstall")
    .description([
        "Install the systemd service to launch at boot"
    ].join(" "))
    .action(async () => {

        await installService();

        process.exit(0);

    });

program
    .command("preuninstall")
    .description([
        "Remove service from systemd"
    ].join(" "))
    .action(async () => {

        await removeService();

        process.exit(0);

    });

program.parse(process.argv);

async function installService() {

    const node_execpath = process.argv[0];

    console.log([
        "Now you will be ask to choose the user that will run the service\n",
    ].join("").yellow);

    const user = (await _.ask("User? (press enter for root)")) || "root";

    const group = (await _.ask("Group? (press enter for root)")) || "root";

    let service = [
        `[Unit]`,
        `Description=chan dongle extended service`,
        `After=network.target`,
        ``,
        `[Service]`,
        `ExecStart=${node_execpath} ${modulePath}/dist/lib/main`,
        `PermissionsStartOnly=true`,
        `WorkingDirectory=${modulePath}`,
        `Restart=always`,
        `RestartSec=10`,
        `StandardOutput=syslog`,
        `StandardError=syslog`,
        `SyslogIdentifier=Semasim`,
        `User=${user}`,
        `Group=${group}`,
        `Environment=NODE_ENV=production DEBUG=_*`,
        ``,
        `[Install]`,
        `WantedBy=multi-user.target`,
        ``
    ].join("\n");

    await _.writeFileAssertSuccess(systemdServicePath, service);

    await _.run("systemctl daemon-reload");

    console.log([
        `Service successfully installed!`.green,
        `${systemdServicePath}: \n\n ${service}`,
        `To run the service:`.yellow,
        `sudo systemctl start ${c.serviceName}`,
        `To automatically start the service on boot:`.yellow,
        `sudo systemctl enable ${c.serviceName}`,
    ].join("\n"));

}


async function removeService() {

    try {

        await _.run(`systemctl stop ${c.serviceName}.service`);

        await _.run(`systemctl disable ${c.serviceName}.service`);

    } catch (error) { }

    try { unlinkSync(systemdServicePath); } catch (error) { }

    await _.run("systemctl daemon-reload");

    console.log(`${c.serviceName}.service removed from systemd`.green);

}
