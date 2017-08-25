require("rejection-tracker").main(__dirname, "..", "..");

import * as https from "https";
import * as express from "express";
import * as session from "express-session";

import * as backendSipProxy from "./backendSipProxy";
import * as backendWebApi from "./backendWebApi";

import { webApiPath } from "./backendWebApiClient";

import { c } from "./_constants";

const port = 4430;

(async () => {

    console.log("Starting semasim backend");

    await backendSipProxy.startServer();

    console.log("Sip proxy server started !");

    await new Promise<void>(resolve => {

        let app = express();

        app
        .use(session({"secret": "Fe3SeLc3dds3" }))
        .use(`/${webApiPath}`, backendWebApi.getRouter());

        https.createServer(c.tlsOptions)
            .on("request", app)
            .listen(port)
            .on("listening", () => resolve());

    });

    console.log("Web API started on port: " + port);

})();
