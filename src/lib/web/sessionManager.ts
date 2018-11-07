import * as mysql from "mysql";
import * as express_session from "express-session";
import * as express_mysql_session from "express-mysql-session";
import * as http from "http";
import * as express from "express";
import { deploy } from "../../deploy";
const MySQLStore= express_mysql_session(express_session);
import * as logger from "logger";

const debug= logger.debugFactory();

export type Auth = { user: number; email: string; };

export function beforeExit(){
    return beforeExit.impl();
}

export namespace beforeExit {
    export let impl= ()=> Promise.resolve();
}

export async function launch(): Promise<void> {

    const pool= mysql.createPool({
        ...(await deploy.getDbAuth()),
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

    const sessionStore = new MySQLStore({}, pool);

    const sessionMiddleware: any = express_session({
        "secret": "xSoLe9d3=",
        "store": sessionStore,
        "resave": false,
        "saveUninitialized": false
    });

    loadRequestSession = (req, res) => {
        return new Promise<void>(
            resolve => sessionMiddleware(req, res, () => resolve())
        )
    };

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
 * Assert loadRequestSession have been called and has resolved.
 * 
 * return undefined if the user is not authenticated.
 * 
 * @param session req.session!
 * 
 */
export function getAuth(session: Express.Session): Auth | undefined;

/**
 * Used to get the Auth from a Websocket connection request.
 */
export function getAuth(req: http.IncomingMessage): Promise<Auth | undefined>;
export function getAuth(arg: any): any {

    if (arg["cookie"]) {

        let session: Express.Session = arg;

        return session["auth"];

    } else {

        let req: any = arg;

        if (!!req["session"]) {
            return getAuth(req["session"] as Express.Session);
        }

        return new Promise<Auth | undefined>(
            resolve => loadRequestSession(req, {} as any).then(
                () => {

                    let session: Express.Session = req["session"];

                    delete req["session"];

                    resolve(getAuth(session));

                }
            )
        );

    }

}

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
export function setAuth(session: Express.Session, auth: Auth | undefined): void {

    if (!auth) {
        delete session["auth"];
    } else {

        session["auth"] = auth;

    }

}

