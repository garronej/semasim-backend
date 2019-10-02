import * as express from "express";
import { AuthenticatedSessionDescriptorSharedData } from "../../frontend";
export declare function beforeExit(): Promise<void>;
export declare namespace beforeExit {
    let impl: () => Promise<void>;
}
export declare function launch(cookieSecret: string): void;
/**
 * Available only once lunched.
 *
 * Once called on an res.session will be defined
 * so res.session is defined ( regardless if the user
 * is auth or not ).
 *
 * */
export declare let loadRequestSession: (req: express.Request, res: express.Response) => Promise<void>;
/**
 *
 * Available only once lunched.
 *
 * Used to authenticate websocket connection.
 * Can and will throw if anything goes wrong or if the user is not(longer) authenticated.
 * The session object is readonly.
*/
export declare let getReadonlyAuthenticatedSession: (connect_sid: string) => Promise<AuthenticatedSession>;
/**
 * Assert loadRequestSession have been called and has resolved. ( req.session exist )
 *
 * return false if the user is not authenticated.
 *
 * @param session req.session!
 *
 */
export declare function isAuthenticated(session: Express.Session): session is AuthenticatedSession;
/** Properties listed in shared should be accessible from client side */
export declare type AuthenticatedSessionDescriptor = {
    user: number;
    shared: AuthenticatedSessionDescriptorSharedData;
    towardUserEncryptKeyStr: string;
};
export declare type AuthenticatedSession = Express.Session & AuthenticatedSessionDescriptor;
export declare type UserAuthentication = {
    user: number;
    shared: {
        email: string;
    };
};
export declare type AuthenticatedSessionDescriptorWithoutConnectSid = Omit<AuthenticatedSessionDescriptor, "shared"> & {
    shared: Omit<AuthenticatedSessionDescriptorSharedData, "connect_sid">;
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
export declare function authenticateSession(req: express.Request, authenticatedSessionDescriptor: AuthenticatedSessionDescriptorWithoutConnectSid): {
    connect_sid: string;
};
export declare function eraseSessionAuthentication(session: Express.Session): void;
