import * as fbAdmin from "firebase-admin";
export declare function wakeUpDevice(registrationToken: string): Promise<fbAdmin.messaging.MessagingDevicesResponse>;
