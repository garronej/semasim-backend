import * as mysql from "mysql";
import * as express_session from "express-session";
import * as express_mysql_session from "express-mysql-session";
import * as http from "http";
import * as express from "express";
import * as i from "../../../bin/installer";
import * as networkTools from "../../../tools/networkTools";
const MySQLStore= express_mysql_session(express_session);

export type Auth = { user: number; email: string; };

export async function launch(): Promise<void> {

    const connection = mysql.createConnection({
        ...i.dbAuth,
        "database": "semasim_express_session",
        "localAddress": networkTools.getInterfaceAddressInRange(i.semasim_lan)
    });

    await new Promise<void>(
        (resolve, reject) => connection.connect(
            error => error ? reject(error) : resolve()
        )
    );

    let sessionStore = new MySQLStore({}, connection);

    const sessionMiddleware: any = express_session({
        "secret": "xSoLe9d3=",
        "store": sessionStore,
        "resave": false,
        "saveUninitialized": false
    });

    loadRequestSession= (req, res) => {
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

