import * as https from "https";
import * as tls from "tls";
import * as net from "net";
import * as http from "http";
import * as sipProxy from "./sipProxy";
import * as WebSocket from "ws";
import * as web from "./web";

export type Server<T> = {
    server: T;
    spoofedLocal: {
        address: string;
        port: number;
    };
};

export type Servers = {
    https: Server<https.Server>;
    http: Server<http.Server>;
    sips: Server<tls.Server>;
    sip: { server: net.Server; };
};

export function beforeExit(){
    return web.beforeExit();
}

export function launch(p: Servers) {

    web.launch(
        p.https.server,
        p.http.server
    );

    sipProxy.init({
        "webUa": {
            "server": new WebSocket.Server({ "server": p.https.server }),
            "spoofedLocal": p.https.spoofedLocal
        },
        "mobileUa": {
            "server": p.sips.server,
            "spoofedLocal": p.sips.spoofedLocal
        },
        "gwSide": {
            "server": p.sip.server
        }
    });

}
