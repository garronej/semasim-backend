import { ExecQueue } from "ts-exec-queue";
import { Contact } from "./endpointsContacts";
export declare const callContext = "from-sip-call";
export declare const messageContext = "from-sip-message";
export declare const subscribeContext: (imei: string) => string;
export declare namespace dbAsterisk {
    const queryEndpoints: ((callback?: any) => Promise<string[]>) & ExecQueue;
    const truncateContacts: ((callback?: any) => Promise<void>) & ExecQueue;
    const queryContacts: ((callback?: any) => Promise<Contact[]>) & ExecQueue;
    const queryLastConnectionTimestampOfDonglesEndpoint: ((endpoint: string, callback?: any) => Promise<number>) & ExecQueue;
    const deleteContact: ((id: string, callback?: any) => Promise<boolean>) & ExecQueue;
    const addOrUpdateEndpoint: ((endpoint: string, password: string, callback?: any) => Promise<void>) & ExecQueue;
}
export declare namespace dbSemasim {
    const addDongleIfNew: ((imei: string, callback?: any) => Promise<void>) & ExecQueue;
    const addContactIfNew: ((contact: Contact, callback?: any) => Promise<void>) & ExecQueue;
    interface Notification {
        endpoint: string;
        date: number;
        payload: string;
    }
    function addNotificationAsUndelivered(notification: Notification): Promise<void>;
    function addNotificationAsUndelivered(notification: Notification, contact: Contact): Promise<void>;
    const getUndeliveredNotificationsOfContact: ((contact: Contact, callback?: any) => Promise<Notification[]>) & ExecQueue;
}
