import * as fbAdmin from "firebase-admin";
export declare function init(pathToFirebaseAdminAccount: string): void;
export declare function sendPushNotification(registrationToken: string): Promise<fbAdmin.messaging.MessagingDevicesResponse>;
