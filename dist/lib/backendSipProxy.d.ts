import * as sip from "./tools/sipLibrary";
import { Contact } from "./sipContacts";
import "colors";
export declare function getPublicIp(): Promise<string>;
export declare function extraParamFlowToken(flowToken: string): Record<string, string>;
export declare function qualifyContact(contact: Contact, timeout?: number): Promise<boolean>;
export declare let gatewaySockets: sip.Store;
export declare function startServer(): Promise<void>;
