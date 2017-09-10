import * as fbAdmin from "firebase-admin";
export declare class c {
    static readonly shared: {
        new (): {};
        readonly backendSipProxyListeningPortForGateways: 50610;
        readonly flowTokenKey: "flowtoken";
        readonly backendHostname: "semasim.com";
        readonly reg_expires: 21601;
        readonly regExpImei: RegExp;
        readonly regExpFourDigits: RegExp;
    };
    static readonly serviceName: string;
    static readonly dbParamsBackend: {
        "host": string;
        "user": string;
        "password": string;
        "database": string;
    };
    private static __serviceAccount__;
    static readonly serviceAccount: fbAdmin.ServiceAccount;
    private static __tlsOptions__;
    static readonly tlsOptions: any;
    static readonly reg_expires: number;
    static readonly regExpImei: RegExp;
    static readonly regExpEmail: RegExp;
    static readonly regExpPassword: RegExp;
    static readonly regExpFourDigits: RegExp;
}
