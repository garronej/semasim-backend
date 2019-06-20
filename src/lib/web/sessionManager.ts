import * as mysql from "mysql";
import * as express_session from "express-session";
import * as express_mysql_session from "express-mysql-session";
import * as http from "http";
import * as express from "express";
import { deploy } from "../../deploy";
import { AuthenticatedSessionDescriptorSharedData } from "../../frontend";
const MySQLStore= express_mysql_session(express_session);
import * as logger from "logger";

const debug= logger.debugFactory();

export function beforeExit(){
    return beforeExit.impl();
}

export namespace beforeExit {
    export let impl= ()=> Promise.resolve();
}

export function launch(cookieSecret: string) {

    const pool= mysql.createPool({
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

    const sessionMiddleware: any = express_session({
        "secret": cookieSecret,
        "store": new MySQLStore({}, pool),
        "resave": false,
        "saveUninitialized": false
    });

    loadRequestSession = (req, res) => new Promise<void>(
        resolve => sessionMiddleware(req, res, () => resolve())
    );

}

/** 
 * Available only once lunched 
 * 
 * Once called on an res.session will be defined
 * so res.session is defined ( regardless if the user 
 * is auth or not ). 
 * 
 * */
export let loadRequestSession: (req: express.Request, res: express.Response) => Promise<void>;

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

/**
 * Used to get the Auth from a Websocket connection request.
 */
export function getSessionFromHttpIncomingMessage(req: http.IncomingMessage): Promise<AuthenticatedSession | undefined> {

    const session = (req as express.Request).session;;

    return session != undefined ?
        Promise.resolve(
            isAuthenticated(session) ?
                session :
                undefined
        ) :
        new Promise<AuthenticatedSession | undefined>(
            resolve => loadRequestSession(req as express.Request, {} as express.Response)
                .then(() => {

                    const { session } = (req as express.Request);;

                    delete (req as express.Request).session;

                    resolve(
                        session !== undefined && isAuthenticated(session) ?
                            session :
                            undefined
                    );

                })
        );


}

/** Properties listed in shared are written in cookie to enable 
 * access from browser.
 */
export type AuthenticatedSessionDescriptor = {
    user: number;
    shared: AuthenticatedSessionDescriptorSharedData;
    towardUserEncryptKeyStr: string;
};

export type AuthenticatedSession = Express.Session & AuthenticatedSessionDescriptor;

//NOTE: Session assignable
export type UserAuthentication = {
    user: number;
    shared: { email: string; };
};

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
export function authenticateSession(req: express.Request, authenticatedSessionDescriptor: AuthenticatedSessionDescriptor): void {

    AuthenticatedSessionDescriptorSharedData.set(
        authenticatedSessionDescriptor.shared,
        (key, value) => req.res!.cookie(key, value, { "httpOnly": false })
    );

    Object.assign(req.session!, authenticatedSessionDescriptor);

}

export function eraseSessionAuthentication(session: Express.Session): void {
    if (isAuthenticated(session)) {
        delete session.user;
    }
}

