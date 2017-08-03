import { Contact } from "../admin";
import "colors";
export declare const listeningPortForDevices = 50610;
export declare const flowTokenKey = "flowtoken";
export declare const hostname = "semasim.com";
export declare function getPublicIp(): Promise<string>;
export declare function getTlsOptions(): {
    key: string;
    cert: string;
    ca: string;
};
export declare function extraParamFlowToken(flowToken: string): Record<string, string>;
export declare function qualifyContact(contact: Contact, timeout?: number): Promise<boolean>;
export declare function startServer(): Promise<void>;
