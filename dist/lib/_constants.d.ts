import * as fbAdmin from "firebase-admin";
export declare class c {
    static readonly shared: {
        new (): {};
        readonly gatewayPort: 80;
        readonly domain: "semasim.com";
        readonly dnsSrv_sips_tcp: Promise<{
            name: string;
            port: number;
        }>;
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
    static readonly regExpIccid: RegExp;
    static readonly regExpEmail: RegExp;
    static readonly regExpPassword: RegExp;
    static readonly regExpFourDigits: RegExp;
}
