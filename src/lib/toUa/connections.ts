
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
import { handlers as localApiHandlers, getUserWebUaInstanceId } from "./localApiHandlers";
import * as dbSemasim from "../dbSemasim";
import { types as feTypes } from "../../frontend";
import * as dbTurn from "../dbTurn";
import { deploy } from "../../deploy";
import * as cookie from "cookie";
import * as assert from "assert";

export function listen(
    server: ws.Server | tls.Server,
    spoofedLocalAddressAndPort: {
        localAddress: string; localPort: number;
    },
) {

    if (server instanceof tls.Server) {

        server.on("secureConnection",
            tlsSocket => registerSocket(
                new sip.Socket(tlsSocket, false, spoofedLocalAddressAndPort),
                { "platform": "android" }
            )
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


                const auth = await sessionManager.getAuth(req)

                if (!auth) {

                    socket.destroy("User is not authenticated ( no auth for this websocket)");

                    return;

                }

                const sessionParameters = (() => {

                    try {

                        const { requestTurnCred, uaInstanceId } = cookie.parse(
                            req.headers.cookie as string
                        );

                        assert.ok(
                            /^(true|false)$/.test(requestTurnCred)
                            &&
                            (
                                uaInstanceId === undefined || 
                                /"<urn:uuid:[0-9a-f\-]{30,50}>"$/.test(uaInstanceId)
                            )
                        );

                        return {
                            "requestTurnCred": requestTurnCred === "true",
                            "uaInstanceId": uaInstanceId as (string|undefined)
                        };

                    } catch{

                        return undefined;

                    }

                })();

                if( sessionParameters === undefined ){

                    socket.destroy("Did not provide correct session parameter");

                    return;

                }

                const { requestTurnCred, uaInstanceId } = sessionParameters;

                registerSocket(
                    socket,
                    {
                        "platform": "web",
                        auth,
                        requestTurnCred,
                        uaInstanceId
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
        auth: sessionManager.Auth;
        requestTurnCred: boolean;
        uaInstanceId: string | undefined;
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

    socket.enableLogger({
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

    if (o.platform === "web") {

        const { auth, requestTurnCred, uaInstanceId } = o;

        apiServer.startListening(socket);

        setAuth(socket, auth);

        sip.api.client.enableKeepAlive(socket);

        sip.api.client.enableErrorLogging(
            socket,
            sip.api.client.getDefaultErrorLogger({
                idString,
                "log": logger.log
            })
        );

        if (uaInstanceId === undefined) {
            //Main connection

            if (
                !!getByEmail(auth.email) ||
                !!backendConnections.getBindedToEmail(auth.email)
            ) {

                //NOTE: this request will end before notify new route so we do not risk to close the new socket.
                remoteApiCaller.notifyLoggedFromOtherTab(auth.email);

            }

            byEmail.set(auth.email, socket);

            //TODO: Send a push notification.
            backendRemoteApiCaller.collectDonglesOnLan(
                socket.remoteAddress, auth
            ).then(dongles => dongles.forEach(
                dongle => remoteApiCaller.notifyDongleOnLan(
                    dongle, socket
                )
            ));

            //TODO: Send push notification.
            dbSemasim.getUserSims(auth).then(
                userSims => userSims
                    .filter(feTypes.UserSim.Shared.NotConfirmed.match)
                    .forEach(userSim =>
                        remoteApiCaller.notifySimSharingRequest(
                            userSim, auth.email
                        )
                    )
            );

        }

        if (requestTurnCred) {

            (async () => {

                if (!deploy.isTurnEnabled()) {
                    return undefined;
                }

                const { username, credential, revoke } = await dbTurn.renewAndGetCred(
                    uaInstanceId === undefined ?
                        getUserWebUaInstanceId(auth.user) :
                        uaInstanceId
                );

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
                    "credentialType": "password" as "password"
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

        const boundToEmail = o.platform === "web" && o.uaInstanceId === undefined ?
            o.auth.email : undefined;

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
        "emails": o.platform === "web" ? [o.auth.email] : undefined,
        "uaAddresses": getByAddress(socket.remoteAddress).size === 1 ?
            [socket.remoteAddress] : undefined,
    });

}

const __auth__ = "   auth   ";

function setAuth(socket: sip.Socket, auth: sessionManager.Auth): void {
    socket.misc[__auth__] = auth;
}

/** Assert socket has auth ( i.e: it's a web socket ) */
export function getAuth(socket: sip.Socket): sessionManager.Auth {
    return socket.misc[__auth__]! as sessionManager.Auth;
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

