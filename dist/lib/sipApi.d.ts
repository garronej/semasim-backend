import { sipLibrary, Contact } from "../semasim-gateway";
import "colors";
export declare function startListening(gatewaySocket: sipLibrary.Socket): void;
export declare function qualifyContact(contact: Contact, timeout?: number): Promise<boolean> | false;
