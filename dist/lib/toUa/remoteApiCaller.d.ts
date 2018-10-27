import * as sip from "ts-sip";
import { apiDeclaration } from "../../sip_api_declarations/uaToBackend";
import { types as dcTypes } from "chan-dongle-extended-client";
import { types as gwTypes } from "../../gateway";
export declare const notifySimOffline: {
    (imsi: string, emails: string[]): Promise<void>;
    (imsi: string, uas: gwTypes.Ua[]): Promise<void>;
};
export declare const notifySimOnline: {
    (params: apiDeclaration.notifySimOnline.Params, emails: string[]): Promise<void>;
    (params: apiDeclaration.notifySimOnline.Params, uas: gwTypes.Ua[]): Promise<void>;
};
export declare const notifyContactCreatedOrUpdated: (params: apiDeclaration.notifyContactCreatedOrUpdated.Params, emails: string[]) => Promise<void>;
export declare const notifyContactDeleted: (params: apiDeclaration.notifyContactDeleted.Params, emails: string[]) => Promise<void>;
export declare const notifyDongleOnLan: {
    (dongle: dcTypes.Dongle, gatewayAddress: string): Promise<void>;
    (dongle: dcTypes.Dongle, uaSocket: sip.Socket): Promise<void>;
};
export declare const notifySimPermissionLost: (imsi: string, emails: string[]) => Promise<void>;
export declare const notifySimSharingRequest: (userSim: import("../../../../frontend/shared/dist/lib/types").UserSim._Base<import("../../../../frontend/shared/dist/lib/types").SimOwnership.Shared.NotConfirmed>, email: string) => Promise<void>;
export declare const notifySharingRequestResponse: (params: apiDeclaration.notifySharingRequestResponse.Params, email: string) => Promise<void>;
export declare const notifySharedSimUnregistered: (params: apiDeclaration.notifySharedSimUnregistered.Params, email: string) => Promise<void>;
export declare const notifyLoggedFromOtherTab: {
    (email: string): Promise<void>;
    (uaSocket: sip.Socket): Promise<void>;
};
export declare const notifyIceServer: (uaSocket: sip.Socket, iceServer: apiDeclaration.notifyIceServer.Params) => Promise<void>;
