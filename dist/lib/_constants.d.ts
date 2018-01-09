import { PushNotificationCredentials } from "../tools/pushSender";
export declare class c {
    static readonly shared: {
        new (): {};
        readonly gatewayPort: 80;
        readonly domain: "semasim.com";
        isValidEmail(email: string, mustBeLc?: "MUST BE LOWER CASE" | undefined): boolean;
    };
    static readonly serviceName: string;
    static readonly dbParamsBackend: {
        "host": string;
        "user": string;
        "password": string;
        "database": string;
    };
    static pushNotificationCredentials: PushNotificationCredentials;
    private static __tlsOptions__;
    static readonly tlsOptions: any;
    static readonly reg_expires: number;
    static readonly regExpImeiImsi: RegExp;
    static readonly regExpIccid: RegExp;
    static readonly regExpEmail: RegExp;
    static readonly regExpPassword: RegExp;
}
