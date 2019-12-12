import * as sip from "ts-sip";
import * as ws from "ws";
export declare function listen(server: ws.Server, spoofedLocalAddressAndPort: {
    localAddress: string;
    localPort: number;
}): void;
export declare function getByConnectionId(connectionId: string): sip.Socket | undefined;
export declare function getByUaInstanceId(uaInstanceId: string): sip.Socket | undefined;
export declare function getUaInstanceIds(): string[];
export declare function getByAddress(uaAddress: string): Set<sip.Socket>;
export declare function getAddresses(): string[];
