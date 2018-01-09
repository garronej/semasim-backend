import { sipLibrary } from "../semasim-gateway";
import "colors";
/** Map connectionId => socket */
export declare const clientSockets: Map<number, sipLibrary.Socket>;
/** Map imsi => gatewaySocket */
export declare namespace gatewaySockets {
    function add(gwSocket: sipLibrary.Socket): void;
    function getConnectedFrom(remoteAddress: string): Set<sipLibrary.Socket>;
    function setSimRoute(gatewaySocket: sipLibrary.Socket, imsi: string): void;
    function removeSimRoute(imsi: string): void;
    function getSimRoute(imsi: string): sipLibrary.Socket | undefined;
}
export declare function start(): Promise<void>;
