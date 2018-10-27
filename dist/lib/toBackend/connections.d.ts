/// <reference types="node" />
import * as sip from "ts-sip";
import * as net from "net";
import { types as lbTypes } from "../../load-balancer";
export declare function listen(server: net.Server): void;
export declare function connect(runningInstance: lbTypes.RunningInstance, isInstanceStillRunning: () => Promise<boolean>): void;
export declare function getByIpEndpoint(remoteAddress: string, remotePort: number): sip.Socket | undefined;
export declare function getAll(): sip.Socket[];
export declare function bindToImsi(imsi: string, socket: sip.Socket): void;
export declare function unbindFromImsi(imsi: string, socket: sip.Socket): void;
export declare function getBindedToImsi(imsi: string): sip.Socket | undefined;
/**
 * If there is an other socket currently binded to the
 * email the previous socket is first unbind.
 * This is not an error, it happen when a user open an other tab.
 */
export declare function bindToEmail(email: string, socket: sip.Socket): void;
/**
 * If at the time this function is called the
 * socket is no longer binded to this email
 * nothing is done, this is not an error.
 */
export declare function unbindFromEmail(email: string, socket: sip.Socket): void;
export declare function getBindedToEmail(email: string): sip.Socket | undefined;
export declare function bindToUaAddress(uaAddress: string, socket: sip.Socket): void;
export declare function unbindFromUaAddress(uaAddress: string, socket: sip.Socket): void;
export declare function getBindedToUaAddress(uaAddress: string): Set<sip.Socket>;
export declare function bindToGatewayAddress(gatewayAddress: string, socket: sip.Socket): void;
export declare function unbindFromGatewayAddress(gatewayAddress: string, socket: sip.Socket): void;
export declare function getBindedToGatewayAddress(uaAddress: string): Set<sip.Socket>;
