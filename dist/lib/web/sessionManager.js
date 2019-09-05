"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
const express_session = require("express-session");
const express_mysql_session = require("express-mysql-session");
const deploy_1 = require("../../deploy");
const frontend_1 = require("../../frontend");
const MySQLStore = express_mysql_session(express_session);
const logger = require("logger");
const debug = logger.debugFactory();
function beforeExit() {
    return beforeExit.impl();
}
exports.beforeExit = beforeExit;
(function (beforeExit) {
    beforeExit.impl = () => Promise.resolve();
})(beforeExit = exports.beforeExit || (exports.beforeExit = {}));
function launch(cookieSecret) {
    const pool = mysql.createPool(Object.assign(Object.assign({}, deploy_1.deploy.dbAuth.value), { "database": "semasim_express_session", "multipleStatements": true, "connectionLimit": 50 }));
    beforeExit.impl = async () => {
        debug("BeforeExit...");
        try {
            await new Promise((resolve, reject) => pool.end(error => !error ? resolve() : reject(error)));
        }
        catch (error) {
            debug(error);
            throw error;
        }
        debug("BeforeExit success");
    };
    const sessionMiddleware = express_session({
        "secret": cookieSecret,
        "store": new MySQLStore({}, pool),
        "resave": false,
        "saveUninitialized": false
    });
    exports.loadRequestSession = (req, res) => new Promise(resolve => sessionMiddleware(req, res, () => resolve()));
}
exports.launch = launch;
/**
 * Assert loadRequestSession have been called and has resolved. ( req.session exist )
 *
 * return false if the user is not authenticated.
 *
 * @param session req.session!
 *
 */
function isAuthenticated(session) {
    return typeof session.user === "number";
}
exports.isAuthenticated = isAuthenticated;
/**
 * Used to get the Auth from a Websocket connection request.
 */
function getSessionFromHttpIncomingMessage(req) {
    const session = req.session;
    ;
    return session != undefined ?
        Promise.resolve(isAuthenticated(session) ?
            session :
            undefined) :
        new Promise(resolve => exports.loadRequestSession(req, {})
            .then(() => {
            const { session } = req;
            ;
            delete req.session;
            resolve(session !== undefined && isAuthenticated(session) ?
                session :
                undefined);
        }));
}
exports.getSessionFromHttpIncomingMessage = getSessionFromHttpIncomingMessage;
/**
 *
 * Assert loadRequestSession have been called against req ( req.session is defined )
 * Assert cookie-parser middleware loaded.
 *
 * Note:
 * - sessionDescriptor should not contain any entry not listed in the type.
 * - SessionDescriptor is not copied in depth.
 *
 * After execution:
 * isAuthenticated(req.session!) will return true.
 *
 */
function authenticateSession(req, authenticatedSessionDescriptor) {
    frontend_1.AuthenticatedSessionDescriptorSharedData.set(authenticatedSessionDescriptor.shared, (key, value) => req.res.cookie(key, value, { "httpOnly": false }));
    Object.assign(req.session, authenticatedSessionDescriptor);
}
exports.authenticateSession = authenticateSession;
function eraseSessionAuthentication(session) {
    if (isAuthenticated(session)) {
        delete session.user;
    }
}
exports.eraseSessionAuthentication = eraseSessionAuthentication;
