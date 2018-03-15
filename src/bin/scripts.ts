#!/usr/bin/env node

import * as c from "../lib/_constants";
require("rejection-tracker").main(c.modulePath);

import * as path from "path";

const systemdServicePath = path.join("/etc", "systemd", "system", `${c.nginxUpdaterServiceName}.service`);

import * as program from "commander";
import { scriptsTools as _ } from "../semasim-gateway"
import "colors";

program
    .command("install-nginx-updater-service")
    .description( "add nginxUpdater to systemd")
    .action(async () => {

        await installNginxUpdaterService();

        process.exit(0);

    });

program
    .command("uninstall-nginx-updater-service")
    .description( "remove nginxUpdater from systemd")
    .action(async () => {

        await removeNginxUpdaterService();

        process.exit(0);

    });


program.parse(process.argv);

async function installNginxUpdaterService() {

    const node_execpath = process.argv[0];

    const pm2 = `${node_execpath} ${c.modulePath}/node_modules/pm2/bin/pm2`;

    let service = [
        `[Unit]`,
        `Description=Semasim nginx real time updater for load balancing.`,
        `After=network.target`,
        ``,
        `[Service]`,
        `Type=oneshot`,
        `ExecStart=${pm2} start ${c.modulePath}/dist/bin/nginxUpdater.js`,
        `RemainAfterExit=true`,
        `ExecStop=${pm2} delete nginxUpdater`,
        `StandardOutput=journal`,
        `User=root`,
        `Group=root`,
        `Environment=NODE_ENV=production`,
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
        `sudo systemctl start ${c.nginxUpdaterServiceName}`,
        `To automatically start the service on boot:`.yellow,
        `sudo systemctl enable ${c.nginxUpdaterServiceName}`,
    ].join("\n"));

}


async function removeNginxUpdaterService() {

    const fs= await import("fs");

    try {

        await _.run(`systemctl stop ${c.nginxUpdaterServiceName}.service`);

        await _.run(`systemctl disable ${c.nginxUpdaterServiceName}.service`);

    } catch (error) { }

    try { 
        fs.unlinkSync(systemdServicePath); 
    } catch { }

    await _.run("systemctl daemon-reload");

    console.log(`${c.nginxUpdaterServiceName}.service removed from systemd`.green);

}


