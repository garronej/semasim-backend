import * as sip from "ts-sip";
import * as sessionManager from "../web/sessionManager";
export declare function setSession(socket: sip.Socket, session: sessionManager.AuthenticatedSession): void;
/**
 * Assert socket has auth ( i.e: it's a web socket )
 * If the session have expired there is no longer the "user" field on the session
 * object.
 * TODO: Manually test if session has expired.
 * Maybe implement it with a getter in sessionManager.
 * */
export declare function getSession(socket: sip.Socket): sessionManager.AuthenticatedSession | Express.Session;
/** Throw if session object associated with the connection is no longer authenticated. */
export declare function getAuthenticatedSession(socket: sip.Socket): sessionManager.AuthenticatedSession;
