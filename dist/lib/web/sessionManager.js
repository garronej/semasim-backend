"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
const express_session_custom = require("express-session-custom");
const express_mysql_session = require("express-mysql-session");
const deploy_1 = require("../../deploy");
const types = require("../../frontend/types");
const MySQLStore = express_mysql_session(express_session_custom);
const logger = require("logger");
//import * as cookieLib from "cookie";
const debug = logger.debugFactory();
function beforeExit() {
    return beforeExit.impl();
}
exports.beforeExit = beforeExit;
(function (beforeExit) {
    beforeExit.impl = () => Promise.resolve();
})(beforeExit = exports.beforeExit || (exports.beforeExit = {}));
const _name = "connect.sid";
const _path = "/";
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
    //NOTE: Do not use "path" or it will break.
    const sessionMiddleware = express_session_custom({
        "secret": cookieSecret,
        "store": new MySQLStore({}, pool),
        "resave": false,
        "saveUninitialized": false,
        name: _name,
        "cookie": {
            "path": _path
        }
    });
    exports.loadRequestSession = (req, res) => new Promise(resolve => {
        const connect_sid = (() => {
            const out = req.headers[types.connectSidHttpHeaderName];
            if (typeof out !== "string") {
                return undefined;
            }
            return out;
        })();
        sessionMiddleware(req, res, () => resolve(), connect_sid);
    });
    exports.getReadonlyAuthenticatedSession = async (connect_sid) => {
        const { session, touch } = await sessionMiddleware.getReadonlySession(connect_sid);
        if (!isAuthenticated(session)) {
            throw new Error("user not authenticated");
        }
        touch().then(isSuccess => {
            if (isSuccess) {
                return;
            }
            debug("Session could not be touched");
        });
        return session;
    };
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
    Object.assign(req.session, authenticatedSessionDescriptor);
    const connect_sid = req.connect_sid;
    req.session.shared.connect_sid = connect_sid;
    return { connect_sid };
}
exports.authenticateSession = authenticateSession;
function eraseSessionAuthentication(session) {
    if (isAuthenticated(session)) {
        delete session.user;
    }
}
exports.eraseSessionAuthentication = eraseSessionAuthentication;
