import * as fbAdmin from "firebase-admin";
export declare const dbParams: {
    "host": string;
    "user": string;
    "password": string;
};
export declare const dbParamsBackend: {
    "password": string;
    "database": string;
    "host": string;
    "user": string;
};
export declare const gain: string;
export declare const jitterBuffer: {
    type: string;
    params: string;
};
export declare const dongleCallContext = "from-dongle";
export declare const phoneNumber = "_[+0-9].";
export declare const sipCallContext = "from-sip-call";
export declare const sipMessageContext = "from-sip-message";
export declare const serviceAccount: fbAdmin.ServiceAccount;
export declare const backendSipProxyListeningPortForGateways = 50610;
export declare const flowTokenKey = "flowtoken";
export declare const backendHostname = "semasim.com";
export declare function getTlsOptions(): {
    key: string;
    cert: string;
    ca: string;
};
export declare const webApiPath = "api";
export declare const webApiPort = 4430;
export declare const reg_expires = 21600;
