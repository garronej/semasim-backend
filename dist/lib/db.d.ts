import { DongleController as Dc } from "chan-dongle-extended-client";
import { webApiDeclaration } from "../frontend";
import Types = webApiDeclaration.Types;
import { Session } from "./mainWeb";
import { mySqlFunctions as f, Contact } from "../semasim-gateway";
/** Exported only for tests */
export declare const query: (sql: string, values?: f.TSql[] | undefined) => Promise<any>;
/** For test purpose only */
export declare function flush(): Promise<void>;
/** Return user.id_ or undefined */
export declare function createUserAccount(email: string, password: string): Promise<number | undefined>;
/** Return user.id_ or undefined if auth failed */
export declare function authenticateUser(email: string, password: string): Promise<number | undefined>;
export declare function deleteUser(user: number): Promise<boolean>;
/** returns locked dongles with unreadable SIM iccid,
 *  locked dongles with readable iccid registered by user
 *  active dongles not registered
 */
export declare function filterDongleWithRegistrableSim(user: number, dongles: Dc.Dongle[]): Promise<Dc.Dongle[]>;
/** return user UAs */
export declare function registerSim(sim: Dc.ActiveDongle["sim"], password: string, user: number, friendlyName: string, isVoiceEnabled: boolean | undefined): Promise<Contact.UaSim.Ua[]>;
export declare function getUserSims(user: number): Promise<Types.UserSim[]>;
export declare function addOrUpdateUa(ua: Contact.UaSim.Ua): Promise<void>;
export declare function setSimOnline(imsi: string, password: string, isVoiceEnabled: boolean | undefined): Promise<{
    isSimRegistered: false;
} | {
    isSimRegistered: true;
    storageDigest: string;
    passwordStatus: "UNCHANGED" | "RENEWED" | "NEED RENEWAL";
    uasRegisteredToSim: Contact.UaSim.Ua[];
}>;
export declare function setSimOffline(imsi: string): Promise<void>;
/** Return UAs that no longer use sim */
export declare function unregisterSim(user: number, imsi: string): Promise<Contact.UaSim.Ua[]>;
/** Return assert emails not empty */
export declare function shareSim(auth: Session.Auth, imsi: string, emails: string[], sharingRequestMessage: string | undefined): Promise<Types.AffectedUsers>;
/** Return no longer registered UAs, assert email list not empty*/
export declare function stopSharingSim(user: number, imsi: string, emails: string[]): Promise<Contact.UaSim.Ua[]>;
/** Return user UAs */
export declare function setSimFriendlyName(user: number, imsi: string, friendlyName: string): Promise<Contact.UaSim.Ua[]>;
export declare function getSimOwner(imsi: string): Promise<undefined | Session.Auth>;
