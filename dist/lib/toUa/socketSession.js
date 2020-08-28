"use strict";
//NOTE: Extracted of connections.ts for avoiding require cycles.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthenticatedSession = exports.getSession = exports.setSession = void 0;
const sessionManager = require("../web/sessionManager");
const __session__ = "   session   ";
function setSession(socket, session) {
    socket.misc[__session__] = session;
}
exports.setSession = setSession;
/**
 * Assert socket has auth ( i.e: it's a web socket )
 * If the session have expired there is no longer the "user" field on the session
 * object.
 * TODO: Manually test if session has expired.
 * Maybe implement it with a getter in sessionManager.
 * */
function getSession(socket) {
    return socket.misc[__session__];
}
exports.getSession = getSession;
/** Throw if session object associated with the connection is no longer authenticated. */
function getAuthenticatedSession(socket) {
    const session = getSession(socket);
    if (!sessionManager.isAuthenticated(session)) {
        throw new Error("Connection authentication no longer valid");
    }
    return session;
}
exports.getAuthenticatedSession = getAuthenticatedSession;
