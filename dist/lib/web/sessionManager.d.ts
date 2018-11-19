/// <reference types="express-session" />
/// <reference types="node" />
import * as http from "http";
import * as express from "express";
export declare type Auth = {
    user: number;
    email: string;
};
export declare function beforeExit(): Promise<void>;
export declare namespace beforeExit {
    let impl: () => Promise<void>;
}
export declare function launch(): void;
/**
 * Available only once lunched
 *
 * Once called on an res.session will be defined
 * so res.session is defined ( regardless if the user
 * is auth or not ).
 *
 * */
export declare let loadRequestSession: (req: express.Request, res: express.Response) => Promise<void>;
/**
 * Assert loadRequestSession have been called and has resolved.
 *
 * return undefined if the user is not authenticated.
 *
 * @param session req.session!
 *
 */
export declare function getAuth(session: Express.Session): Auth | undefined;
/**
 * Used to get the Auth from a Websocket connection request.
 */
export declare function getAuth(req: http.IncomingMessage): Promise<Auth | undefined>;
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
export declare function setAuth(session: Express.Session, auth: Auth | undefined): void;
