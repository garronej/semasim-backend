require("rejection-tracker").main(__dirname, "..", "..");

import * as https from "https";
import * as express from "express";
import * as session from "express-session";
import * as ejs from "ejs";

import * as sipProxy from "./sipProxy";
import * as webApi from "./webApi";

import { webRouter, cookieSecret, webApiClient } from "../semasim-webclient";

import { c } from "./_constants";

import * as _debug from "debug";
let debug = _debug("_main");

const port = 4430;

(async () => {

    debug("Starting semasim backend...");

    await sipProxy.startServer();

    debug("..Sip proxy server started !");

    await new Promise<void>(resolve => {

        let app = express();

        app.set("view engine", "ejs");

        app
        .use(session({"secret": cookieSecret, "resave": false, "saveUninitialized": false })) 
        .use(`/${webApiClient.webApiPath}`, webApi.getRouter())
        .use("/", webRouter);

        https.createServer(c.tlsOptions)
            .on("request", app)
            .listen(port)
            .on("listening", () => resolve());

    });

    debug(`...webserver started on port: ${port}`);

})();
