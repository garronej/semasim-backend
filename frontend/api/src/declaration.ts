
export const apiPath= "api";

export namespace registerUser {

    export const methodName = "register-user";

    export type Params = {
        email: string;
        password: string;
    };

    export type Response = "CREATED" | "EMAIL NOT AVAILABLE";

}


export namespace loginUser {

    export const methodName = "login-user";

    export type Params = {
        email: string;
        password: string;
    };

    /** isGranted */
    export type Response = boolean;

}


export namespace getSims {

    export const methodName = "get-sim";

    export type Params = undefined;

    export type Response = Types.UserSim[];

}

export namespace getUnregisteredLanDongles {

    export const methodName = "get-unregistered-lan-dongles";

    export type Params = undefined;

    export type Response = Types.Dongle[];

}

export namespace unlockSim {

    export const methodName = "unlock-sim";

    export type Params = {
        imei: string;
        pin: string;
    };

    export type Response = 
    {
        unlockResult: Types.UnlockResult.Success;
        isSimRegisterable: true;
        dongle: Types.ActiveDongle["sim"];
    } | {
        unlockResult: Types.UnlockResult.Success;
        isSimRegisterable: false;
        simRegisteredBy: 
        { who: "MYSELF" } | { who: "OTHER USER"; email: string; };
    } | {
        unlockResult: Types.UnlockResult.Failed;
    };

}


export namespace registerSim {

    export const methodName = "register-sim";

    export type Params = {
        imsi: string;
        friendlyName: string;
    };

    export type Response = undefined;

}

export namespace unregisterSim {

    export const methodName = "unregister-sim";

    export type Params = {
        imsi: string;
    };

    export type Response = undefined;

}

export namespace shareSim {

    export const methodName = "share-sim";

    export type Params = {
        imsi: string;
        emails: string[];
        message: string;
    };

    export type Response = Types.AffectedUsers;

}

export namespace stopSharingSim {

    export const methodName= "stop-sharing-sim";

    export type Params ={
        imsi: string;
        emails: string[];
    };

    export type Response = undefined;

}

/** Used for accepting sharing request or changing name */
export namespace setSimFriendlyName {

    export const methodName = "set-sim-friendly-name";

    export type Params = {
        imsi: string;
        friendlyName: string;
    };

    export type Response = undefined;

}

export namespace getUaConfig {

    //TODO: change after client updated
    export const methodName = "get-user-linphone-config";

    export type Params = {
        email_as_hex: string;
        password_as_hex: string;
    };

    export type Response = string;

}


export namespace Types {

    //Imported

    export type Contact = {
        readonly index: number;
        readonly name: {
            readonly asStored: string;
            full: string;
        };
        readonly number: {
            readonly asStored: string;
            localFormat: string;
        };
    }


    export type SimStorage = {
        number?: string;
        infos: {
            contactNameMaxLength: number;
            numberMaxLength: number;
            storageLeft: number;
        };
        contacts: Contact[];
        digest: string;
    };

    export type LockedPinState = "SIM PIN" | "SIM PUK" | "SIM PIN2" | "SIM PUK2";

    export type UnlockResult = UnlockResult.Success | UnlockResult.Failed;

    export namespace UnlockResult {

        export type Success = { success: true; };
        export type Failed = { success: false; pinState: LockedPinState; tryLeft: number; };

    }

    export interface LockedDongle {
        imei: string;
        sim: {
            iccid?: string;
            pinState: LockedPinState;
            tryLeft: number;
        }
    }

    export namespace LockedDongle {

        export function match(dongle: Dongle): dongle is LockedDongle {
            return (dongle.sim as LockedDongle['sim']).pinState !== undefined;
        }

    }

    export interface ActiveDongle {
        imei: string;
        isVoiceEnabled?: boolean;
        sim: {
            iccid: string;
            imsi: string;
            serviceProvider: {
                fromImsi?: string;
                fromNetwork?: string;
            },
            storage: SimStorage;
        }
    }

    export namespace ActiveDongle {

        export function match(dongle: Dongle): dongle is ActiveDongle {
            return !LockedDongle.match(dongle);
        }

    }

    export type Dongle = LockedDongle | ActiveDongle;

    //End Imported


    //TODO: do not share the password if not confirmed
    export type UserSim = {
        sim: ActiveDongle["sim"];
        friendlyName: string;
        ownership: UserSim.Ownership;
        password: string;
        isVoiceEnabled: boolean | undefined;
        isOnline: boolean;
    };

    export namespace UserSim {

        export type Ownership = Ownership.Owner | Ownership.Shared;

        export namespace Ownership {

            export type Owner = {
                status: "OWNED";
                sharedWith: {
                    confirmed: string[];
                    notConfirmed: string[];
                };
            };

            export type Shared = Shared.Confirmed | Shared.NotConfirmed;

            export namespace Shared {

                export type Confirmed = {
                    status: "SHARED CONFIRMED";
                    ownerEmail: string
                };

                export type NotConfirmed = {
                    status: "SHARED NOT CONFIRMED";
                    ownerEmail: string;
                    sharingRequestMessage: string | undefined;
                };

            }

        }

    }

    export type AffectedUsers= {
        registered: string[];
        notRegistered: string[];
    };

}

export namespace JSON {

    export function stringify(obj: any): string {

        if (obj === undefined) {
            return "undefined";
        }

        return global.JSON.stringify([obj]);

    }

    export function parse(str: string): any {

        if (str === "undefined") {
            return undefined;
        }

        return global.JSON.parse(str).pop();
    }

}