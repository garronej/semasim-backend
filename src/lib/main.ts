require("rejection-tracker").main(__dirname, "..", "..");

import * as https from "https";
import * as http from "http";
import * as express from "express";
import * as session from "express-session";
import * as ejs from "ejs";
import * as forceDomain from "forcedomain";

import * as networkTools from "../tools/networkTools";
import * as sipProxy from "./sipProxy";
import * as webApi from "./webApi";

import { webApiPath } from "./../../frontend/api";
import { webRouter, cookieSecret } from "./webRouter";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_main");

import * as fs from "fs";


(async () => {

    debug("Starting semasim backend...");

    await sipProxy.startServer();

    debug("..Sip proxy server started !");

    let hostname= `www.${c.shared.domain}`;

    let { interfaceLocalIp } = await networkTools.retrieveIpFromHostname(hostname);

    await new Promise<void>(
        resolve => {

            let app = express();

            app.set("view engine", "ejs");

            app
                .use(session({ "secret": cookieSecret, "resave": false, "saveUninitialized": false }))
                .use(`/${webApiPath}`, webApi.getRouter())
                .use(forceDomain({ hostname }))
                .use("/", webRouter);

            https.createServer(c.tlsOptions)
                .on("request", app)
                .listen(443, interfaceLocalIp)
                .once("listening", () => resolve());

        }
    );

    debug(`...webserver started`);

    await new Promise<void>(
        resolve => {

            let app = express();

            app.use(forceDomain({
                hostname,
                "port": 443,
                "protocol": "https"
            }));

            http.createServer()
                .on("request", app)
                .listen(80, interfaceLocalIp)
                .once("listening", () => resolve());

        }
    );

    debug(`...http redirect to https started`);

})();
