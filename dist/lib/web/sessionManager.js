"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
const express_session = require("express-session");
const express_mysql_session = require("express-mysql-session");
const deploy_1 = require("../../deploy");
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
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        const pool = mysql.createPool(Object.assign({}, (yield deploy_1.deploy.getDbAuth()), { "database": "semasim_express_session", "multipleStatements": true, "connectionLimit": 50 }));
        beforeExit.impl = () => __awaiter(this, void 0, void 0, function* () {
            debug("BeforeExit...");
            try {
                yield new Promise((resolve, reject) => pool.end(error => !error ? resolve() : reject(error)));
            }
            catch (error) {
                debug(error);
                throw error;
            }
            debug("BeforeExit success");
        });
        const sessionStore = new MySQLStore({}, pool);
        const sessionMiddleware = express_session({
            "secret": "xSoLe9d3=",
            "store": sessionStore,
            "resave": false,
            "saveUninitialized": false
        });
        exports.loadRequestSession = (req, res) => {
            return new Promise(resolve => sessionMiddleware(req, res, () => resolve()));
        };
    });
}
exports.launch = launch;
function getAuth(arg) {
    if (arg["cookie"]) {
        let session = arg;
        return session["auth"];
    }
    else {
        let req = arg;
        if (!!req["session"]) {
            return getAuth(req["session"]);
        }
        return new Promise(resolve => exports.loadRequestSession(req, {}).then(() => {
            let session = req["session"];
            delete req["session"];
            resolve(getAuth(session));
        }));
    }
}
exports.getAuth = getAuth;
/**
 *
 * Setting the auth object on a session
 * after checking the provided credentials.
 *
 * @param session req.session! ( Assert loadRequestSession have resolved )
 * @param auth The auth to associate to this session or undefined if
 * we wish to logout the user.
 *
 */
function setAuth(session, auth) {
    if (!auth) {
        delete session["auth"];
    }
    else {
        session["auth"] = auth;
    }
}
exports.setAuth = setAuth;
