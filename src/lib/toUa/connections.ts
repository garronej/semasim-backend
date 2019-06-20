
import * as sip from "ts-sip";
import * as ws from "ws";
import * as sessionManager from "../web/sessionManager";
import * as tls from "tls";
import { misc as gwMisc } from "../../gateway";
import * as router from "./router";
import * as backendRemoteApiCaller from "../toBackend/remoteApiCaller";
import * as backendConnections from "../toBackend/connections";
import * as remoteApiCaller from "./remoteApiCaller";
import * as logger from "logger";
import { handlers as localApiHandlers } from "./localApiHandlers";
import * as dbSemasim from "../dbSemasim";
import { types as feTypes, WebsocketConnectionParams } from "../../frontend";
import * as dbTurn from "../dbTurn";
import { deploy } from "../../deploy";
import * as cookie from "cookie";

const enableLogger = (socket: sip.Socket) => socket.enableLogger({
    "socketId": idString,
    "remoteEndId": "UA",
    "localEndId": "BACKEND",
    "connection": deploy.getEnv() === "DEV" ? true : false,
    "error": true,
    "close": deploy.getEnv() === "DEV" ? true : false,
    "incomingTraffic": deploy.getEnv() === "DEV" ? true : false,
    "outgoingTraffic": deploy.getEnv() === "DEV" ? true : false,
    "colorizedTraffic": "IN",
    "ignoreApiTraffic": true
}, logger.log);

export function listen(
    server: ws.Server | tls.Server,
    spoofedLocalAddressAndPort: {
        localAddress: string; localPort: number;
    },
) {

    if (server instanceof tls.Server) {

        server.on("secureConnection",
            tlsSocket => {

                const socket = new sip.Socket(tlsSocket, false, spoofedLocalAddressAndPort);

                enableLogger(socket);

                registerSocket(
                    socket,
                    { "platform": "android" }
                );

            }
        );

    } else {

        server.on("connection",
            async (webSocket, req) => {

                const socket = new sip.Socket(
                    webSocket,
                    false,
                    {
                        ...spoofedLocalAddressAndPort,
                        "remoteAddress": req.socket.remoteAddress!,
                        "remotePort": req.socket.remotePort!
                    }
                );

                enableLogger(socket);

                const session = await sessionManager.getSessionFromHttpIncomingMessage(req);

                if (!session) {

                    socket.destroy("Anonymous websocket connection");

                    return;

                }

                const connectionParams = WebsocketConnectionParams.get(
                    cookie.parse(req.headers.cookie as string)
                );

                if (connectionParams === undefined) {

                    socket.destroy("Client did not provide correct websocket connection parameters");

                    return;

                }

                registerSocket(
                    socket,
                    {
                        "platform": "web",
                        session,
                        connectionParams
                    }
                );

            }
        );

    }


}

const idString = "backendToUa";

const apiServer = new sip.api.Server(
    localApiHandlers,
    sip.api.Server.getDefaultLogger({
        idString,
        "log": logger.log,
        "hideKeepAlive": true,
        "displayOnlyErrors": deploy.getEnv() === "DEV" ? false : true
    })
);

function registerSocket(
    socket: sip.Socket,
    o: {
        platform: "android";
    } | {
        platform: "web";
        session: sessionManager.AuthenticatedSession;
        connectionParams: WebsocketConnectionParams;
    }
) {

    const connectionId = gwMisc.cid.generate(socket);

    byConnectionId.set(connectionId, socket);

    {

        let set = byAddress.get(socket.remoteAddress);

        if (!set) {

            set = new Set();

            byAddress.set(socket.remoteAddress, set);

        }

        set.add(socket);

    }


    if (o.platform === "web") {

        const { session, connectionParams } = o;

        apiServer.startListening(socket);

        setSession(socket, session);

        sip.api.client.enableKeepAlive(socket);

        sip.api.client.enableErrorLogging(
            socket,
            sip.api.client.getDefaultErrorLogger({
                idString,
                "log": logger.log
            })
        );

        if (connectionParams.connectionType === "MAIN") {
            //Main connection

            if (
                !!getByEmail(session.shared.email) ||
                !!backendConnections.getBindedToEmail(session.shared.email)
            ) {

                //NOTE: this request will end before notify new route so we do not risk to close the new socket.
                remoteApiCaller.notifyLoggedFromOtherTab(session.shared.email);

            }

            byEmail.set(session.shared.email, socket);

            //TODO: Send a push notification.
            backendRemoteApiCaller.collectDonglesOnLan(
                socket.remoteAddress, session
            ).then(dongles => dongles.forEach(
                dongle => remoteApiCaller.notifyDongleOnLan(
                    dongle, socket
                )
            ));

            //TODO: Send push notification.
            dbSemasim.getUserSims(session).then(
                userSims => userSims
                    .filter(feTypes.UserSim.Shared.NotConfirmed.match)
                    .forEach(userSim =>
                        remoteApiCaller.notifySimSharingRequest(
                            userSim, session.shared.email
                        )
                    )
            );

        }

        if (connectionParams.requestTurnCred) {

            (async () => {

                if (!deploy.isTurnEnabled()) {
                    return undefined;
                }

                const { username, credential, revoke } = await dbTurn.renewAndGetCred((() => {
                    switch (connectionParams.connectionType) {
                        case "MAIN": return session.shared.webUaInstanceId;
                        case "AUXILIARY": return connectionParams.uaInstanceId;
                    }
                })());

                socket.evtClose.attachOnce(() => revoke());

                /*
                We comment out the transport udp as it should never be
                useful as long as the gateway does not have TURN enabled.
                "turn:turn.semasim.com:19302?transport=udp",
                */
                return {
                    "urls": [
                        `stun:turn.${deploy.getBaseDomain()}:19302`,
                        `turn:turn.${deploy.getBaseDomain()}:19302?transport=tcp`,
                        `turns:turn.${deploy.getBaseDomain()}:443?transport=tcp`
                    ],
                    username, credential,
                    "credentialType": "password" as const
                };

            })().then(params => remoteApiCaller.notifyIceServer(socket, params));

        }

    }

    socket.evtClose.attachOnce(() => {

        byConnectionId.delete(connectionId);

        {

            const set = byAddress.get(socket.remoteAddress)!;

            set.delete(socket);

            if (set.size === 0) {
                byAddress.delete(socket.remoteAddress);
            }

        }

        const boundToEmail = o.platform === "web" && o.connectionParams.connectionType === "MAIN" ?
            o.session.shared.email : undefined
            ;

        if (boundToEmail !== undefined && byEmail.get(boundToEmail) === socket) {

            byEmail.delete(boundToEmail);

        }

        backendRemoteApiCaller.notifyRoute({
            "type": "DELETE",
            "emails": boundToEmail !== undefined ? [boundToEmail] : undefined,
            "uaAddresses": getByAddress(socket.remoteAddress).size === 0 ?
                [socket.remoteAddress] : undefined,
        });

    });

    router.handle(socket, connectionId);

    backendRemoteApiCaller.notifyRoute({
        "type": "ADD",
        "emails": o.platform === "web" ? [o.session.shared.email] : undefined,
        "uaAddresses": getByAddress(socket.remoteAddress).size === 1 ?
            [socket.remoteAddress] : undefined,
    });

}

const __session__ = "   session   ";

function setSession(socket: sip.Socket, session: sessionManager.AuthenticatedSession): void {
    socket.misc[__session__] = session;
}

/** 
 * Assert socket has auth ( i.e: it's a web socket ) 
 * If the session have expired there is no longer the "user" field on the session
 * object.
 * TODO: Manually test if session has expired.
 * Maybe implement it with a getter in sessionManager.
 * */
export function getSession(socket: sip.Socket): sessionManager.AuthenticatedSession | Express.Session {
    return socket.misc[__session__]! as sessionManager.AuthenticatedSession;
}

const byConnectionId = new Map<string, sip.Socket>();

export function getByConnectionId(connectionId: string): sip.Socket | undefined {
    return byConnectionId.get(connectionId);
}

const byEmail = new Map<string, sip.Socket>();

export function getByEmail(email: string): sip.Socket | undefined {
    return byEmail.get(email);
}

export function getEmails(): string[] {
    return Array.from(byEmail.keys());
}

const byAddress = new Map<string, Set<sip.Socket>>();

export function getByAddress(uaAddress: string): Set<sip.Socket> {
    return byAddress.get(uaAddress) || new Set();
}

export function getAddresses(): string[] {
    return Array.from(byAddress.keys());
}

