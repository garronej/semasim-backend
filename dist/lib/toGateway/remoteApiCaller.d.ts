import * as sip from "ts-sip";
import { apiDeclaration } from "../../sip_api_declarations/gatewayToBackend";
export declare const getDongle: (imei: string, gatewaySocket: sip.Socket) => Promise<import("../../../../frontend/shared/node_modules/chan-dongle-extended-client/dist/lib/types").Dongle.Locked | import("../../../../frontend/shared/node_modules/chan-dongle-extended-client/dist/lib/types").Dongle.Usable | undefined>;
export declare const getDongleAndSipPassword: (imsi: string) => Promise<apiDeclaration.getDongleAndSipPassword.Response>;
export declare const unlockSim: {
    (imei: string, pin: string, gatewayAddress: string): Promise<import("../../../../frontend/shared/node_modules/chan-dongle-extended-client/dist/lib/types").UnlockResult.Success | import("../../../../frontend/shared/node_modules/chan-dongle-extended-client/dist/lib/types").UnlockResult.Failed | undefined>;
    (imei: string, pin: string, gatewaySocket: sip.Socket): Promise<import("../../../../frontend/shared/node_modules/chan-dongle-extended-client/dist/lib/types").UnlockResult.Success | import("../../../../frontend/shared/node_modules/chan-dongle-extended-client/dist/lib/types").UnlockResult.Failed | undefined>;
};
export declare const rebootDongle: (imsi: string) => Promise<apiDeclaration.rebootDongle.Response>;
export declare const reNotifySimOnline: (imsi: string) => Promise<undefined>;
export declare const createContact: (imsi: string, name: string, number: string) => Promise<apiDeclaration.createContact.Response>;
export declare const updateContactName: (imsi: string, mem_index: number, newName: string) => Promise<apiDeclaration.updateContactName.Response>;
export declare const deleteContact: (imsi: string, mem_index: number) => Promise<apiDeclaration.deleteContact.Response>;
