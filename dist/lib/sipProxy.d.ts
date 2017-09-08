import { Contact, sipLibrary } from "../semasim-gateway";
import "colors";
export declare function qualifyContact(contact: Contact, timeout?: number): Promise<boolean>;
export declare let gatewaySockets: sipLibrary.Store;
export declare function startServer(): Promise<void>;
