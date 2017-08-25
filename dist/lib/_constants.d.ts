import * as fbAdmin from "firebase-admin";
export declare class c {
    static readonly dbParamsGateway: {
        "host": string;
        "user": string;
        "password": string;
        "database": string;
    };
    private static __dbParamsBackend__;
    static readonly dbParamsBackend: {
        host: string;
        user: string;
        password: string;
        database: string;
    };
    static readonly gain: string;
    static readonly jitterBuffer: {
        type: string;
        params: string;
    };
    static readonly dongleCallContext: string;
    static readonly phoneNumber: string;
    static readonly sipCallContext: string;
    static readonly sipMessageContext: string;
    static readonly serviceAccount: fbAdmin.ServiceAccount;
    static readonly backendSipProxyListeningPortForGateways: number;
    static readonly flowTokenKey: string;
    static readonly backendHostname: string;
    private static __tlsOptions__;
    static readonly tlsOptions: {
        key: string;
        cert: string;
        ca: string;
    };
    static readonly reg_expires: number;
    static readonly regExpImei: RegExp;
    static readonly regExpEmail: RegExp;
    static readonly regExpPassword: RegExp;
    static readonly regExpFourDigits: RegExp;
}
