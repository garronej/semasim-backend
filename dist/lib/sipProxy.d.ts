import { sipLibrary } from "../semasim-gateway";
import "colors";
/** Map connectionId => socket */
export declare const clientSockets: Map<number, sipLibrary.Socket>;
/** Map imei => socket */
export declare const gatewaySockets: Map<string, sipLibrary.Socket>;
export declare function startServer(): Promise<void>;
