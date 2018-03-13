import * as tls from "tls";
import * as net from "net";
import * as WebSocket from "ws";
import { sipLibrary } from "../../../semasim-gateway";
import * as web from "../web";

import * as router from "./router";

export type Server<T> = {
    server: T;
    spoofedLocal: {
        address: string;
        port: number;
    };
};

export type Servers = {
    webUa: Server<WebSocket.Server>;
    mobileUa: Server<tls.Server>;
    gwSide: { server: net.Server; };
};

export function init(
    { webUa, mobileUa, gwSide }: Servers
) {

    webUa.server.on("connection",
        async (socket, req) => router.onUaConnection(
            new sipLibrary.Socket(socket, {
                "localAddress": webUa.spoofedLocal.address,
                "localPort": webUa.spoofedLocal.port,
                "remoteAddress": req.socket.remoteAddress,
                "remotePort": req.socket.remotePort
            }),
            await web.getAuth(req)
        )
    );

    mobileUa.server.on("secureConnection",
        socket => router.onUaConnection(
            new sipLibrary.Socket(socket, {
                "localAddress": mobileUa.spoofedLocal.address,
                "localPort": mobileUa.spoofedLocal.port
            })
        )
    );

    gwSide.server.on("connection",
        socket => router.onGwSideConnection(
            new sipLibrary.Socket(socket)
        )
    );

}
