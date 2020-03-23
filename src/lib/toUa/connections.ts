
import * as sip from "ts-sip";
import * as ws from "ws";
import * as sessionManager from "../web/sessionManager";
import { sipRouting } from "../../gateway";
import * as router from "./router";
import * as backendRemoteApiCaller from "../toBackend/remoteApiCaller";
import * as backendConnections from "../toBackend/connections";
import * as remoteApiCaller from "./remoteApiCaller";
import * as logger from "logger";
import { handlers as localApiHandlers } from "./localApiHandlers";
import { urlGetParameters } from "../../frontend/tools";
import * as dbTurn from "../dbTurn";
import { deploy } from "../../deploy";
import { setSession } from "./socketSession";
//import { debug } from "util";

type WebsocketConnectionParams = import("../../frontend/types").WebsocketConnectionParams;


const enableLogger = (socket: sip.Socket) => socket.enableLogger({
    "socketId": idString,
    "remoteEndId": "UA",
    "localEndId": "BACKEND",
    "connection": deploy.getEnv() === "DEV" ? true : false,
    "error": true,
    "close": deploy.getEnv() === "DEV" ? true : false,
    "incomingTraffic": false,
    "outgoingTraffic": false,
    "colorizedTraffic": "IN",
    "ignoreApiTraffic": true
}, logger.log);

export function listen(
    server: ws.Server,
    spoofedLocalAddressAndPort: {
        localAddress: string; localPort: number;
    },
) {

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

            const connectionParams = (() => {

                let out: WebsocketConnectionParams;

                try {

                    out = urlGetParameters.parseUrl<WebsocketConnectionParams>(req.url);


                } catch{

                    return undefined;

                }

                if (!(
                    (
                        out.requestTurnCred === "DO NOT REQUEST TURN CRED" ||
                        out.requestTurnCred === "REQUEST TURN CRED"
                    ) &&
                    typeof out.connect_sid === "string"
                )) {
                    return undefined;
                }

                return out;

            })();

            if (connectionParams === undefined) {

                socket.destroy("Client did not provide correct websocket connection parameters");

                return;

            }

            let session: sessionManager.AuthenticatedSession;

            try {

                session = await sessionManager.getReadonlyAuthenticatedSession(connectionParams.connect_sid);

            } catch (error) {

                socket.destroy(error.message);

                return;

            }

            registerSocket(socket, session, connectionParams);

        }
    );


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
    session: sessionManager.AuthenticatedSession,
    connectionParams: WebsocketConnectionParams
) {

    const connectionId = sipRouting.cid.generate(socket);

    byConnectionId.set(connectionId, socket);

    {

        let set = byAddress.get(socket.remoteAddress);

        if (!set) {

            set = new Set();

            byAddress.set(socket.remoteAddress, set);

        }

        set.add(socket);

    }

    apiServer.startListening(socket);

    setSession(socket, session);

    sip.api.client.enableKeepAlive(socket);
    //sip.api.client.enableKeepAlive(socket, 5000);

    sip.api.client.enableErrorLogging(
        socket,
        sip.api.client.getDefaultErrorLogger({
            idString,
            "log": logger.log
        })
    );


    if (
        !!getByUaInstanceId(session.shared.uaInstanceId) ||
        !!backendConnections.getBoundToUaInstanceId(session.shared.uaInstanceId)
    ) {

        //NOTE: this request will end before notify new route so we do not risk to close the new socket.
        remoteApiCaller.notifyLoggedFromOtherTab({ 
            "uaInstanceId": session.shared.uaInstanceId 
        });

    }

    byUaInstanceId.set(session.shared.uaInstanceId, socket);

    backendRemoteApiCaller.collectDonglesOnLan(
        socket.remoteAddress, session
    ).then(dongles => dongles.forEach(
        dongle => remoteApiCaller.notifyDongleOnLan({
            dongle, 
            "uaSocket": socket
        })
    ));




    if (connectionParams.requestTurnCred === "REQUEST TURN CRED") {

        (async () => {

            if (!deploy.isTurnEnabled()) {
                return undefined;
            }

            const { username, credential, revoke } = await dbTurn.renewAndGetCred(
                session.shared.uaInstanceId
            );

            socket.evtClose.attachOnce(() => revoke());

            /*
            We comment out the transport udp as it should never be
            useful as long as the gateway does not have TURN enabled.
            "turn:turn.semasim.com:19302?transport=udp",

            We comment out plain tcp as it does not work with free mobile.
            `turn:turn.${deploy.getBaseDomain()}:19302?transport=tcp`,
            */
            return {
                "urls": [
                    `stun:turn.${deploy.getBaseDomain()}:19302`,
                    `turns:turn.${deploy.getBaseDomain()}:443?transport=tcp`
                ],
                username, credential,
                "credentialType": "password" as const
            };

        })().then(iceServer => remoteApiCaller.notifyIceServer({ 
            "uaSocket": socket, 
            iceServer 
        }));

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

        let uaInstanceId: string | undefined = session.shared.uaInstanceId;

        if (byUaInstanceId.get(session.shared.uaInstanceId) === socket) {

            byUaInstanceId.delete(session.shared.uaInstanceId);

        } else {

            uaInstanceId = undefined;

        }

        backendRemoteApiCaller.notifyRoute({
            "type": "DELETE",
            "uaInstanceIds": uaInstanceId !== undefined ? [uaInstanceId] : undefined,
            "uaAddresses": getByAddress(socket.remoteAddress).size === 0 ?
                [socket.remoteAddress] : undefined,
        });


    });

    router.handle(socket, connectionId);

    backendRemoteApiCaller.notifyRoute({
        "type": "ADD",
        "uaInstanceIds": [session.shared.uaInstanceId],
        "uaAddresses": getByAddress(socket.remoteAddress).size === 1 ?
            [socket.remoteAddress] : undefined,
    });

}


const byConnectionId = new Map<string, sip.Socket>();

export function getByConnectionId(connectionId: string): sip.Socket | undefined {
    return byConnectionId.get(connectionId);
}


const byUaInstanceId = new Map<string, sip.Socket>();

export function getByUaInstanceId(uaInstanceId: string): sip.Socket | undefined {
    return byUaInstanceId.get(uaInstanceId);
}

export function getUaInstanceIds(): string[] {
    return Array.from(byUaInstanceId.keys());
}

const byAddress = new Map<string, Set<sip.Socket>>();

export function getByAddress(uaAddress: string): Set<sip.Socket> {
    return byAddress.get(uaAddress) || new Set();
}

export function getAddresses(): string[] {
    return Array.from(byAddress.keys());
}

