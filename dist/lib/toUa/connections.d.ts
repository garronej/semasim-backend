/// <reference types="node" />
import * as sip from "ts-sip";
import * as ws from "ws";
import * as sessionManager from "../web/sessionManager";
import * as tls from "tls";
export declare function listen(server: ws.Server | tls.Server, spoofedLocalAddressAndPort: {
    localAddress: string;
    localPort: number;
}): void;
/** Assert socket has auth ( i.e: it's a web socket ) */
export declare function getAuth(socket: sip.Socket): sessionManager.Auth;
export declare function getByConnectionId(connectionId: string): sip.Socket | undefined;
export declare function getByEmail(email: string): sip.Socket | undefined;
export declare function getEmails(): string[];
export declare function getByAddress(uaAddress: string): Set<sip.Socket>;
export declare function getAddresses(): string[];
