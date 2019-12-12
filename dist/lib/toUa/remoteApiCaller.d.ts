import * as sip from "ts-sip";
import { apiDeclaration } from "../../sip_api_declarations/uaToBackend";
import { types as dcTypes } from "chan-dongle-extended-client";
import { types as gwTypes } from "../../gateway";
export declare const notifySimOffline: (imsi: string, uas: gwTypes.Ua[]) => Promise<void>;
export declare const notifySimOnline: (params: apiDeclaration.notifySimOnline.Params, uas: gwTypes.Ua[]) => Promise<void>;
export declare const notifyGsmConnectivityChange: (params: apiDeclaration.notifyGsmConnectivityChange.Params, uas: gwTypes.Ua[]) => Promise<void>;
export declare const notifyCellSignalStrengthChange: (params: apiDeclaration.notifyCellSignalStrengthChange.Params, uas: gwTypes.Ua[]) => Promise<void>;
export declare const notifyOngoingCall: (params: apiDeclaration.notifyOngoingCall.Params, uas: gwTypes.Ua[]) => Promise<void>;
export declare const notifyContactCreatedOrUpdated: (params: apiDeclaration.notifyContactCreatedOrUpdated.Params, uas: gwTypes.Ua[]) => Promise<void>;
export declare const notifyContactDeleted: (params: apiDeclaration.notifyContactDeleted.Params, uas: gwTypes.Ua[]) => Promise<void>;
export declare const notifyDongleOnLan: {
    (dongle: dcTypes.Dongle, gatewayAddress: string): Promise<void>;
    (dongle: dcTypes.Dongle, uaSocket: sip.Socket): Promise<void>;
};
export declare const notifySimPermissionLost: (imsi: string, uas: gwTypes.Ua[]) => Promise<void>;
export declare const notifySimSharingRequest: {
    (userSim: import("../../../../frontend/shared/dist/lib/types/userSim").UserSim._Base<import("../../../../frontend/shared/dist/lib/types/userSim").SimOwnership.Shared.NotConfirmed>, uas: gwTypes.Ua[]): Promise<void>;
    (userSim: import("../../../../frontend/shared/dist/lib/types/userSim").UserSim._Base<import("../../../../frontend/shared/dist/lib/types/userSim").SimOwnership.Shared.NotConfirmed>, socket: sip.Socket): Promise<void>;
};
export declare const notifySharingRequestResponse: (params: apiDeclaration.notifySharingRequestResponse.Params, uas: gwTypes.Ua[]) => Promise<void>;
export declare const notifyOtherSimUserUnregisteredSim: (params: apiDeclaration.notifyOtherSimUserUnregisteredSim.Params, uas: gwTypes.Ua[]) => Promise<void>;
export declare const notifyLoggedFromOtherTab: {
    (uaInstanceId: string): Promise<void>;
    (uaSocket: sip.Socket): Promise<void>;
};
export declare const notifyIceServer: (uaSocket: sip.Socket, iceServer: apiDeclaration.notifyIceServer.Params) => Promise<void>;
export declare const wd_notifyActionFromOtherUa: (methodNameAndParams: apiDeclaration.wd_notifyActionFromOtherUa.Params, uas: gwTypes.Ua[]) => Promise<void>;
