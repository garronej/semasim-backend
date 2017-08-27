require("rejection-tracker").main(__dirname, "..", "..");

import * as https from "https";
import * as express from "express";
import * as session from "express-session";
import * as ejs from "ejs";

import * as backendSipProxy from "./backendSipProxy";
import * as backendWebApi from "./backendWebApi";

import { webApiPath } from "./backendWebApiClient";

import { webRouter, cookieSecret } from "../../../semasim-webclient";

import { c } from "./_constants";

const port = 4430;

(async () => {

    console.log("Starting semasim backend !");

    await backendSipProxy.startServer();

    console.log("Sip proxy server started !");

    await new Promise<void>(resolve => {

        let app = express();

        app.set("view engine", "ejs");

        app
        .use(session({"secret": cookieSecret, "resave": false, "saveUninitialized": false })) 
        .use(`/${webApiPath}`, backendWebApi.getRouter())
        .use("/", webRouter);

        https.createServer(c.tlsOptions)
            .on("request", app)
            .listen(port)
            .on("listening", () => resolve());

    });

    console.log(`Web API started on port: ${port}`);

})();
