/// <reference types="node" />
import * as sip from "ts-sip";
import * as tls from "tls";
export declare function listen(server: tls.Server, spoofedLocalAddressAndPort: {
    localAddress: string;
    localPort: number;
}): void;
/** Will notify route */
export declare function bindToImsi(imsi: string, socket: sip.Socket): void;
/** Will notify route and set sim as offline in db */
export declare function unbindFromImsi(imsi: string, socket: sip.Socket): void;
export declare function getBindedToImsi(imsi: string): sip.Socket | undefined;
export declare function getImsis(): string[];
export declare function getByAddress(gatewayAddress: string): Set<sip.Socket>;
export declare function getAddresses(): string[];
export declare function addImei(socket: sip.Socket, imei: string): void;
export declare function deleteImei(socket: sip.Socket, imei: string): void;
export declare function getImeis(socket: sip.Socket): string[];
