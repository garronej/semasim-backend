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
import * as utils from "./utils";

import * as WebSocket from "ws";

import * as c from "./_constants";


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

const sessionMiddleware= session({ 
    "secret": "xSoLe9d3=", 
    "resave": false, 
    "saveUninitialized": false 
});

export async function start() {

    let hostname = `www.${c.shared.domain}`;

    let { interfaceIp } = await networkTools.retrieveIpFromHostname(hostname);

    await new Promise<void>(
        resolve => {

            let app = express();

            app
                .use(forceDomain({ hostname }))
                .use(sessionMiddleware)
                ;

            webApiServer.start(app, apiHandlers);

            webPagesServer.start(app);

            let httpsServer = https.createServer(utils.getTlsOptions());

            let webSocketServer = new WebSocket.Server({ "server": httpsServer });

            httpsServer
                .on("request", app)
                .listen(443, interfaceIp)
                .once("listening", () => resolve())
                ;


            webSocketServer.on("connection", async (webSocket, req) => {

                await new Promise<void>(
                    resolve => (sessionMiddleware as any)(req, {}, () => resolve())
                );

                let auth: Session.Auth;

                try {

                    auth = (req["session"] as Session).auth!;

                    console.assert(!!auth);

                } catch{

                    webSocket.close();

                    return;

                }

                sipProxy.onClientConnection(
                    webSocket,
                    {
                        "localPort": 443,
                        "remotePort": req.socket.remotePort,
                        "localAddress": interfaceIp,
                        "remoteAddress": req.socket.remoteAddress,
                    },
                    auth
                );

            });

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