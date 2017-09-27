import { sipLibrary } from "../semasim-gateway";
import "colors";
export declare const gatewaySockets: sipLibrary.Store;
export declare const clientSockets: sipLibrary.Store;
export declare function startServer(): Promise<void>;
export declare function buildFlowToken(connectionId: string, imei: string): string;
export declare function parseFlowToken(flowToken: string): {
    connectionId: string;
    imei: string;
};
