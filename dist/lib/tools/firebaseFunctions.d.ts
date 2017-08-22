import * as fbAdmin from "firebase-admin";
export declare function init(serviceAccount: fbAdmin.ServiceAccount): void;
export declare function sendPushNotification(registrationToken: string): Promise<fbAdmin.messaging.MessagingDevicesResponse>;
