import * as mysql from "mysql";
import * as express_session from "express-session";
import * as express_mysql_session from "express-mysql-session";
import * as http from "http";
import * as express from "express";
import * as i from "../../bin/installer";
import { networkTools } from "../../semasim-load-balancer";
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
        ...i.dbAuth,
        "database": "semasim_express_session",
        "localAddress": networkTools.getInterfaceAddressInRange(i.semasim_lan),
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

/** Available only once lunched */
export let loadRequestSession: (req: express.Request, res: express.Response) => Promise<void>;

export function getAuth(session: Express.Session): Auth | undefined;
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

export function setAuth(session: Express.Session, auth: Auth | undefined): void {

    if (!auth) {
        delete session["auth"];
    } else {

        session["auth"] = auth;

    }

}

