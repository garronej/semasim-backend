import * as sip from "ts-sip";
import { api_decl_gatewayToBackend as apiDeclaration } from "../../gateway";
export declare const getDongle: (imei: string, gatewaySocket: sip.Socket) => Promise<apiDeclaration.getDongle.Response>;
export declare const getDongleSipPasswordAndTowardSimEncryptKeyStr: (imsi: string) => Promise<apiDeclaration.getDongleSipPasswordAndTowardSimEncryptKeyStr.Response>;
export declare const unlockSim: {
    (imei: string, pin: string, gatewayAddress: string): Promise<import("../../sip_api_declarations/backendToBackend").unlockSimProxy.Response>;
    (imei: string, pin: string, gatewaySocket: sip.Socket): Promise<import("../../sip_api_declarations/backendToBackend").unlockSimProxy.Response>;
};
export declare const rebootDongle: (imsi: string) => Promise<apiDeclaration.rebootDongle.Response>;
export declare const reNotifySimOnline: (imsi: string) => Promise<undefined>;
export declare const createContact: (imsi: string, name: string, number: string) => Promise<apiDeclaration.createContact.Response>;
export declare const updateContactName: (imsi: string, mem_index: number, newName: string) => Promise<apiDeclaration.updateContactName.Response>;
export declare const deleteContact: (imsi: string, mem_index: number) => Promise<apiDeclaration.deleteContact.Response>;
