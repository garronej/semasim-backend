import * as declaration from "./declaration";
export declare function registerUser(email: string, password: string): Promise<declaration.registerUser.Response>;
export declare function loginUser(email: string, password: string): Promise<boolean>;
export declare function logoutUser(): Promise<undefined>;
/** Return true if email has account */
export declare function sendRenewPasswordEmail(email: string): Promise<boolean>;
export declare function getSims(): Promise<declaration.Types.UserSim.Base<declaration.Types.SimOwnership>[]>;
export declare function getUnregisteredLanDongles(): Promise<declaration.Types.Dongle[]>;
export declare function unlockSim(imei: string, pin: string): Promise<declaration.Types.UnlockResult>;
export declare function registerSim(imsi: string, friendlyName: string): Promise<undefined>;
export declare function unregisterSim(imsi: string): Promise<undefined>;
export declare function shareSim(imsi: string, emails: string[], message: string): Promise<declaration.Types.AffectedUsers>;
export declare function stopSharingSim(imsi: string, emails: string[]): Promise<undefined>;
export declare function setSimFriendlyName(imsi: string, friendlyName: string): Promise<undefined>;
