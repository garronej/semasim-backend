import * as sip from "ts-sip";
import { api_decl_uaToBackend as apiDeclaration } from "../../frontend/sip_api";
import { types as dcTypes } from "chan-dongle-extended-client";
import { types as gwTypes } from "../../gateway";
export declare const notifyUserSimChange: ({ params, uas }: {
    params: apiDeclaration.notifyUserSimChange.Params;
    uas: gwTypes.Ua[];
}) => Promise<void>;
export declare const notifyDongleOnLan: {
    (args: {
        dongle: dcTypes.Dongle;
    } & {
        gatewayAddress: string;
    }): Promise<void>;
    (args: {
        dongle: dcTypes.Dongle;
    } & {
        uaSocket: sip.Socket;
    }): Promise<void>;
};
export declare const notifyLoggedFromOtherTab: {
    (args: {
        uaInstanceId: string;
    }): Promise<void>;
    (args: {
        uaSocket: sip.Socket;
    }): Promise<void>;
};
export declare const notifyIceServer: ({ uaSocket, iceServer }: {
    uaSocket: sip.Socket;
    iceServer: apiDeclaration.notifyIceServer.Params;
}) => Promise<void>;
export declare const wd_notifyActionFromOtherUa: ({ methodNameAndParams, uas }: {
    methodNameAndParams: apiDeclaration.wd_notifyActionFromOtherUa.Params;
    uas: gwTypes.Ua[];
}) => Promise<void>;
