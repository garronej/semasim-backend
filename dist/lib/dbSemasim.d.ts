import { Auth } from "./web/sessionManager";
import { types as gwTypes } from "../gateway";
import * as f from "../tools/mysqlCustom";
import { types as dcTypes } from "chan-dongle-extended-client";
import { types as feTypes } from "../frontend";
/** exported only for tests */
export declare let query: f.Api["query"];
export declare let esc: f.Api["esc"];
/** Must be called and before use */
export declare function launch(): void;
/** For test purpose only */
export declare function flush(): Promise<void>;
/**
 * Return user.id_ or undefined
 *
 * User not yet registered are created by the shareSim function
 * those user have no salt and no password.
 *
 * */
export declare function createUserAccount(email: string, password: string, ip: string): Promise<{
    user: number;
    activationCode: string | null;
} | undefined>;
/**
 * Return true if the account was validated
 * False may occur if the user try to validate again
 * an email that have been validated already.
 */
export declare function validateUserEmail(email: string, activationCode: string): Promise<boolean>;
/** Return user.id_ or undefined if auth failed */
export declare function authenticateUser(email: string, password: string): Promise<{
    status: "SUCCESS";
    auth: Auth;
} | {
    status: "NO SUCH ACCOUNT";
} | {
    status: "WRONG PASSWORD";
    retryDelay: number;
} | {
    status: "RETRY STILL FORBIDDEN";
    retryDelayLeft: number;
} | {
    status: "NOT VALIDATED YET";
}>;
/**Work for account that have been automatically created due to sharing request. */
export declare function setPasswordRenewalToken(email: string): Promise<string | undefined>;
/** return true if token was still valid for email */
export declare function renewPassword(email: string, token: string, newPassword: string): Promise<boolean>;
export declare function deleteUser(auth: Auth): Promise<boolean>;
/** Only request that is make with two SQL queries */
export declare function addGatewayLocation(ip: string): Promise<void>;
/**
 *  returns locked dongles with unreadable SIM iccid,
 *  locked dongles with readable iccid registered by user
 *  active dongles not registered
 */
export declare function filterDongleWithRegistrableSim(auth: Auth, dongles: Iterable<dcTypes.Dongle>): Promise<dcTypes.Dongle[]>;
export declare function updateSimStorage(imsi: string, storage: dcTypes.Sim.Storage): Promise<void>;
export declare function getUserUa(email: string): Promise<gwTypes.Ua[]>;
/** Return UAs registered to sim */
export declare function createOrUpdateSimContact(imsi: string, name: string, number_raw: string, storageInfos?: {
    mem_index: number;
    name_as_stored: string;
    new_storage_digest: string;
}): Promise<gwTypes.Ua[]>;
/** Return UAs registered to sim */
export declare function deleteSimContact(imsi: string, contactRef: {
    mem_index: number;
    new_storage_digest: string;
} | {
    number_raw: string;
}): Promise<gwTypes.Ua[]>;
/** return user UAs */
export declare function registerSim(auth: Auth, sim: dcTypes.Sim, friendlyName: string, password: string, dongle: feTypes.UserSim["dongle"], gatewayIp: string): Promise<gwTypes.Ua[]>;
export declare function getUserSims(auth: Auth): Promise<feTypes.UserSim[]>;
export declare function addOrUpdateUa(ua: gwTypes.Ua): Promise<void>;
export declare function setSimOnline(imsi: string, password: string, replacementPassword: string, gatewayAddress: string, dongle: feTypes.UserSim["dongle"]): Promise<{
    isSimRegistered: false;
} | {
    isSimRegistered: true;
    storageDigest: string;
    passwordStatus: "UNCHANGED" | "WAS DIFFERENT" | "PASSWORD REPLACED";
    gatewayLocation: feTypes.UserSim.GatewayLocation;
    uasRegisteredToSim: gwTypes.Ua[];
}>;
export declare function setAllSimOffline(imsis?: string[]): Promise<void>;
/** Return userSims by imsi */
export declare function setSimsOffline(imsis: string[]): Promise<{
    [imsi: string]: gwTypes.Ua[];
}>;
export declare function unregisterSim(auth: Auth, imsi: string): Promise<{
    affectedUas: gwTypes.Ua[];
    owner: Auth;
}>;
/** assert emails not empty, return affected user email */
export declare function shareSim(auth: Auth, imsi: string, emails: string[], sharingRequestMessage: string | undefined): Promise<{
    registered: Auth[];
    notRegistered: string[]; /** list of emails */
}>;
/** Return no longer registered UAs, assert email list not empty*/
export declare function stopSharingSim(auth: Auth, imsi: string, emails: string[]): Promise<gwTypes.Ua[]>;
/** Return user UAs */
export declare function setSimFriendlyName(auth: Auth, imsi: string, friendlyName: string): Promise<gwTypes.Ua[]>;
export declare function getSimOwner(imsi: string): Promise<undefined | Auth>;
