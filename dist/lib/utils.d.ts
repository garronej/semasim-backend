import { DongleController as Dc } from "chan-dongle-extended-client";
import { sipLibrary, Contact } from "../semasim-gateway";
export declare function createSelfMaintainedSocketMap<Key>(): Map<Key, sipLibrary.Socket>;
export declare namespace simPassword {
    function store(gwSocket: sipLibrary.Socket, imsi: string, password: string): void;
    function read(gwSocket: sipLibrary.Socket, imsi: string): string | undefined;
}
export declare function qualifyContact(contact: Contact, timeout?: number): Promise<boolean> | false;
export declare namespace qualifyContact {
    const pending: Map<number, Promise<boolean>>;
}
export declare function sendPushNotification(ua: Contact.UaSim.Ua, reloadConfig?: "RELOAD CONFIG" | undefined): Promise<boolean>;
export declare namespace sendPushNotification {
    let isInitialized: boolean;
    namespace pending {
        function get(ua: Contact.UaSim.Ua): Promise<boolean> | undefined;
        function set(ua: Contact.UaSim.Ua, prIsSent: Promise<boolean>): void;
    }
    function toUas(uas: Iterable<Contact.UaSim.Ua>, reloadConfig?: "RELOAD CONFIG" | undefined): Promise<void>;
}
export declare function getDonglesConnectedFrom(remoteAddress: string): Promise<Map<Dc.Dongle, sipLibrary.Socket>>;
