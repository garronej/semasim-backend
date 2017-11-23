import * as apn from "apn";
export declare function init(options: apn.ProviderOptions): void;
export declare function sendPushNotification(registrationToken: string, appId: string): Promise<void>;
