import * as mysql from "mysql";
import * as express_session_custom from "express-session-custom";
import * as express_mysql_session from "express-mysql-session";
//import * as http from "http";
import * as express from "express";
import { deploy } from "../../deploy";
import * as types from "../../frontend/types";
const MySQLStore = express_mysql_session(express_session_custom);
import * as logger from "logger";
//import * as cookieLib from "cookie";

const debug = logger.debugFactory();

export function beforeExit() {
    return beforeExit.impl();
}

export namespace beforeExit {
    export let impl = () => Promise.resolve();
}

const _name = "connect.sid";
const _path = "/";

export function launch(cookieSecret: string) {

    const pool = mysql.createPool({
        ...deploy.dbAuth.value!,
        "database": "semasim_express_session",
        "multipleStatements": true,
        "connectionLimit": 50
    });

    beforeExit.impl = async () => {

        debug("BeforeExit...");

        try {

            await new Promise<void>(
                (resolve, reject) => pool.end(
                    error => !error ? resolve() : reject(error)
                )
            );

        } catch (error) {

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

    loadRequestSession = (req, res) => new Promise<void>(resolve => {

        const connect_sid = (() => {

            const out = req.headers[types.connectSidHttpHeaderName];

            if (typeof out !== "string") {
                return undefined;
            }

            return out;

        })();

        sessionMiddleware(req, res, () => resolve(), connect_sid);

    });

    getReadonlyAuthenticatedSession = async connect_sid => {

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

/** 
 * Available only once lunched.
 * 
 * Once called on an res.session will be defined
 * so res.session is defined ( regardless if the user 
 * is auth or not ). 
 * 
 * */
export let loadRequestSession: (req: express.Request, res: express.Response) => Promise<void>;

/** 
 * 
 * Available only once lunched.
 * 
 * Used to authenticate websocket connection.
 * Can and will throw if anything goes wrong or if the user is not(longer) authenticated.
 * The session object is readonly.
*/

export let getReadonlyAuthenticatedSession: (connect_sid: string) => Promise<AuthenticatedSession>;

/**
 * Assert loadRequestSession have been called and has resolved. ( req.session exist )
 * 
 * return false if the user is not authenticated.
 * 
 * @param session req.session!
 * 
 */
export function isAuthenticated(session: Express.Session): session is AuthenticatedSession {
    return typeof (session as AuthenticatedSession).user === "number";
}


/** Properties listed in shared should be accessible from client side */
export type AuthenticatedSessionDescriptor = {
    user: number;
    shared: types.AuthenticatedSessionDescriptorSharedData;
    towardUserEncryptKeyStr: string;
};

export type AuthenticatedSession = Express.Session & AuthenticatedSessionDescriptor;

//NOTE: Session assignable
export type UserAuthentication = {
    user: number;
    shared: { email: string; };
};

export type AuthenticatedSessionDescriptorWithoutConnectSid =
    Omit<AuthenticatedSessionDescriptor, "shared"> &
    { shared: Omit<types.AuthenticatedSessionDescriptorSharedData, "connect_sid"> };

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
export function authenticateSession(
    req: express.Request,
    authenticatedSessionDescriptor: AuthenticatedSessionDescriptorWithoutConnectSid
): { connect_sid: string; } {

    Object.assign(req.session, authenticatedSessionDescriptor);

    const connect_sid = req.connect_sid!;

    (req.session as AuthenticatedSession).shared.connect_sid = connect_sid;

    return { connect_sid };

}

export function eraseSessionAuthentication(session: Express.Session): void {
    if (isAuthenticated(session)) {
        delete session.user;
    }
}

