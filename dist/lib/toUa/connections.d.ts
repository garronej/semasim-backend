import * as sip from "ts-sip";
import * as ws from "ws";
import * as sessionManager from "../web/sessionManager";
export declare function listen(server: ws.Server, spoofedLocalAddressAndPort: {
    localAddress: string;
    localPort: number;
}): void;
/**
 * Assert socket has auth ( i.e: it's a web socket )
 * If the session have expired there is no longer the "user" field on the session
 * object.
 * TODO: Manually test if session has expired.
 * Maybe implement it with a getter in sessionManager.
 * */
export declare function getSession(socket: sip.Socket): sessionManager.AuthenticatedSession | Express.Session;
export declare function getByConnectionId(connectionId: string): sip.Socket | undefined;
export declare function getByUaInstanceId(uaInstanceId: string): sip.Socket | undefined;
export declare function getUaInstanceIds(): string[];
export declare function getByAddress(uaAddress: string): Set<sip.Socket>;
export declare function getAddresses(): string[];
