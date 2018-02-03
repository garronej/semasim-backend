import * as https from "https";
import * as http from "http";
import * as express from "express";
import * as session from "express-session";
import * as forceDomain from "forcedomain";

import * as networkTools from "../tools/networkTools";
import * as webApiServer from "./webApiServer";
import { handlers as apiHandlers } from "./webApiServerImplementation";
import * as webPagesServer from "./webPagesServer";
import * as sipProxy from "./sipProxy";

import * as WebSocket from "ws";

import { c } from "./_constants";


import * as _debug from "debug";
let debug = _debug("_web");

export interface Session extends Express.Session {
    auth?: Session.Auth;
};

export namespace Session {

    export type Auth= {
        user: number;
        email: string;
    };
}

export async function start() {

    let hostname = `www.${c.shared.domain}`;

    let { interfaceIp } = await networkTools.retrieveIpFromHostname(hostname);

    await new Promise<void>(
        resolve => {

            let app = express();

            app
                .use(forceDomain({ hostname }))
                .use(session({ "secret": "xSoLe9d3=", "resave": false, "saveUninitialized": false }))
                ;

            webApiServer.start(app, apiHandlers);

            webPagesServer.start(app);

            let httpsServer = https.createServer(c.tlsOptions);

            let webSocketServer = new WebSocket.Server({ "server": httpsServer });

            httpsServer
                .on("request", app)
                .listen(443, interfaceIp)
                .once("listening", () => resolve())
                ;

                //TODO: See if we have session on req
            webSocketServer.on("connection", (webSocket, req) =>
                sipProxy.onClientConnection(
                    webSocket,
                    {
                        "localPort": 443,
                        "remotePort": req.socket.remotePort,
                        "localAddress": interfaceIp,
                        "remoteAddress": req.socket.remoteAddress
                    }
                )
            );

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
                .listen(80, interfaceIp)
                .once("listening", () => resolve());

        }
    );

    debug(`...http redirect to https started`);

}