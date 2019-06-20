import { AuthenticatedSessionDescriptor, UserAuthentication } from "./web/sessionManager";
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
 * User not yet registered but that already exist in the database
 * are created by the shareSim function
 * those user have no salt and no password and does not need to verify their email.
 * */
export declare function createUserAccount(email: string, secret: string, towardUserEncryptKeyStr: string, encryptedSymmetricKey: string, ip: string): Promise<{
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
export declare function authenticateUser(email: string, secret: string): Promise<{
    status: "SUCCESS";
    authenticatedSessionDescriptor: AuthenticatedSessionDescriptor;
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
export declare function renewPassword(email: string, newSecret: string, newTowardUserEncryptKeyStr: string, newEncryptedSymmetricKey: string, token: string): Promise<{
    wasTokenStillValid: true;
    user: number;
} | {
    wasTokenStillValid: false;
}>;
export declare function deleteUser(auth: UserAuthentication): Promise<boolean>;
/** Only request that is make with two SQL queries */
export declare function addGatewayLocation(ip: string): Promise<void>;
/**
 *  returns locked dongles with unreadable SIM iccid,
 *  locked dongles with readable iccid registered by user
 *  active dongles not registered
 */
export declare function filterDongleWithRegistrableSim(auth: UserAuthentication, dongles: Iterable<dcTypes.Dongle>): Promise<dcTypes.Dongle[]>;
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
export declare function registerSim(auth: UserAuthentication, sim: dcTypes.Sim, friendlyName: string, password: string, towardSimEncryptKeyStr: string, dongle: feTypes.UserSim["dongle"], gatewayIp: string): Promise<gwTypes.Ua[]>;
export declare function getUserSims(auth: UserAuthentication): Promise<feTypes.UserSim[]>;
export declare function addOrUpdateUa(ua: Omit<gwTypes.Ua, "towardUserEncryptKeyStr">): Promise<void>;
export declare namespace addOrUpdateUa {
    function getQuery(ua: Omit<gwTypes.Ua, "towardUserEncryptKeyStr">): string;
}
export declare function setSimOnline(imsi: string, password: string, replacementPassword: string, towardSimEncryptKeyStr: string, gatewayAddress: string, dongle: feTypes.UserSim["dongle"]): Promise<{
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
export declare function unregisterSim(auth: UserAuthentication, imsi: string): Promise<{
    affectedUas: gwTypes.Ua[];
    owner: UserAuthentication;
}>;
/** assert emails not empty, return affected user email */
export declare function shareSim(auth: UserAuthentication, imsi: string, emails: string[], sharingRequestMessage: string | undefined): Promise<{
    registered: UserAuthentication[];
    notRegistered: string[]; /** list of emails */
}>;
/** Return no longer registered UAs, assert email list not empty*/
export declare function stopSharingSim(auth: UserAuthentication, imsi: string, emails: string[]): Promise<gwTypes.Ua[]>;
/** Return user UAs */
export declare function setSimFriendlyName(auth: UserAuthentication, imsi: string, friendlyName: string): Promise<gwTypes.Ua[]>;
export declare function getSimOwner(imsi: string): Promise<undefined | UserAuthentication>;
