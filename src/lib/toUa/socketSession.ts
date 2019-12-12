
//NOTE: Extracted of connections.ts for avoiding require cycles.

import * as sip from "ts-sip";
import * as sessionManager from "../web/sessionManager";

const __session__ = "   session   ";

export function setSession(socket: sip.Socket, session: sessionManager.AuthenticatedSession): void {
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

/** Throw if session object associated with the connection is no longer authenticated. */
export function getAuthenticatedSession(socket: sip.Socket): sessionManager.AuthenticatedSession {

    const session = getSession(socket);

    if (!sessionManager.isAuthenticated(session)) {
        throw new Error("Connection authentication no longer valid");
    }

    return session;

}