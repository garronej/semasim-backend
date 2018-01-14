
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

    export type Response = Types.UnlockResult;

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

    export type SimOwnership = SimOwnership.Owned | SimOwnership.Shared;

    export namespace SimOwnership {

        export type Owned = {
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

    export type UserSim = UserSim.Base<SimOwnership>;

    export namespace UserSim {

        export type Base<T extends SimOwnership> = {
            sim: ActiveDongle["sim"];
            friendlyName: string;
            password: string;
            isVoiceEnabled: boolean | undefined;
            isOnline: boolean;
            ownership: T;
        };

        export type Owned= Base<SimOwnership.Owned>;

        export namespace Owned {
            export function match(userSim: UserSim): userSim is Owned {
                return userSim.ownership.status === "OWNED";
            }
        }

        export type Shared= Base<SimOwnership.Shared>;

        export namespace Shared {

            export function match(userSim: UserSim): userSim is Shared {
                return Confirmed.match(userSim) || NotConfirmed.match(userSim);
            }

            export type Confirmed= Base<SimOwnership.Shared.Confirmed>;

            export namespace Confirmed {
                export function match(userSim: UserSim): userSim is Confirmed {
                    return userSim.ownership.status === "SHARED CONFIRMED";
                }
            }

            export type NotConfirmed= Base<SimOwnership.Shared.NotConfirmed>;

            export namespace NotConfirmed {
                export function match( userSim: UserSim): userSim is NotConfirmed {
                    return userSim.ownership.status === "SHARED NOT CONFIRMED";
                }
            }

        }

        export type Usable= Base<SimOwnership.Owned | SimOwnership.Shared.Confirmed>;

        export namespace Usable {
            export function match(userSim: UserSim): userSim is Usable {
                return Owned.match(userSim) || Shared.Confirmed.match(userSim);
            }
        }

    }

    export type AffectedUsers = {
        registered: string[];
        notRegistered: string[];
    };

    export type UnlockResult = UnlockResult.WrongPin | UnlockResult.ValidPin;

    export namespace UnlockResult {

        export type WrongPin = {
            wasPinValid: false;
            pinState: Types.LockedPinState;
            tryLeft: number;
        };

        export type ValidPin = ValidPin.Registerable | ValidPin.NotRegisterable;

        export namespace ValidPin {

            export type Registerable = {
                wasPinValid: true;
                isSimRegisterable: true;
                dongle: Types.ActiveDongle;
            };

            export type NotRegisterable = {
                wasPinValid: true;
                isSimRegisterable: false;
                simRegisteredBy: { who: "MYSELF" } | { who: "OTHER USER"; email: string; };
            };

        }

    }

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