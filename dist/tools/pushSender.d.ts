export declare type PushNotificationCredentials = {
    android: {
        pathToServiceAccount: string;
    };
    iOS: {
        pathToKey: string;
        keyId: string;
        teamId: string;
        appId: string;
    };
};
export declare type Platform = "android" | "iOS";
export declare let send: (platform: Platform, token: string) => Promise<void>;
export declare function initialize(credentials: PushNotificationCredentials): void;
