export declare type PushNotificationCredentials = {
    android: {
        pathToServiceAccount: string;
    };
    ios: {
        pathToKey: string;
        keyId: string;
        teamId: string;
        appId: string;
    };
};
export declare type Platform = "android" | "ios";
export declare function launch(credentials: PushNotificationCredentials): void;
export declare function close(): Promise<void>;
export declare function send(platform: Platform, tokens: string[], data?: Record<string, string>): Promise<void>;
