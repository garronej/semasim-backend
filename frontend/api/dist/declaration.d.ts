export declare const apiPath = "api";
export declare namespace registerUser {
    const methodName = "register-user";
    type Params = {
        email: string;
        password: string;
    };
    type Response = "CREATED" | "EMAIL NOT AVAILABLE";
}
export declare namespace loginUser {
    const methodName = "login-user";
    type Params = {
        email: string;
        password: string;
    };
    /** isGranted */
    type Response = boolean;
}
export declare namespace logoutUser {
    const methodName = "logout-user";
    type Params = undefined;
    type Response = undefined;
}
export declare namespace sendRenewPasswordEmail {
    const methodName = "send-renew-password-email";
    type Params = {
        email: string;
    };
    /** true if email exist */
    type Response = boolean;
}
export declare namespace getSims {
    const methodName = "get-sim";
    type Params = undefined;
    type Response = Types.UserSim[];
}
export declare namespace getUnregisteredLanDongles {
    const methodName = "get-unregistered-lan-dongles";
    type Params = undefined;
    type Response = Types.Dongle[];
}
export declare namespace unlockSim {
    const methodName = "unlock-sim";
    type Params = {
        imei: string;
        pin: string;
    };
    type Response = Types.UnlockResult;
}
export declare namespace registerSim {
    const methodName = "register-sim";
    type Params = {
        imsi: string;
        friendlyName: string;
    };
    type Response = undefined;
}
export declare namespace unregisterSim {
    const methodName = "unregister-sim";
    type Params = {
        imsi: string;
    };
    type Response = undefined;
}
export declare namespace shareSim {
    const methodName = "share-sim";
    type Params = {
        imsi: string;
        emails: string[];
        message: string;
    };
    type Response = Types.AffectedUsers;
}
export declare namespace stopSharingSim {
    const methodName = "stop-sharing-sim";
    type Params = {
        imsi: string;
        emails: string[];
    };
    type Response = undefined;
}
/** Used for accepting sharing request or changing name */
export declare namespace setSimFriendlyName {
    const methodName = "set-sim-friendly-name";
    type Params = {
        imsi: string;
        friendlyName: string;
    };
    type Response = undefined;
}
export declare namespace getUaConfig {
    const methodName = "get-user-linphone-config";
    type Params = {
        email_as_hex: string;
        password_as_hex: string;
    };
    type Response = string;
}
export declare namespace Types {
    type Contact = {
        readonly index: number;
        readonly name: {
            readonly asStored: string;
            full: string;
        };
        readonly number: {
            readonly asStored: string;
            localFormat: string;
        };
    };
    type SimStorage = {
        number?: string;
        infos: {
            contactNameMaxLength: number;
            numberMaxLength: number;
            storageLeft: number;
        };
        contacts: Contact[];
        digest: string;
    };
    type LockedPinState = "SIM PIN" | "SIM PUK" | "SIM PIN2" | "SIM PUK2";
    interface LockedDongle {
        imei: string;
        sim: {
            iccid?: string;
            pinState: LockedPinState;
            tryLeft: number;
        };
    }
    namespace LockedDongle {
        function match(dongle: Dongle): dongle is LockedDongle;
    }
    interface ActiveDongle {
        imei: string;
        isVoiceEnabled?: boolean;
        sim: {
            iccid: string;
            imsi: string;
            serviceProvider: {
                fromImsi?: string;
                fromNetwork?: string;
            };
            storage: SimStorage;
        };
    }
    namespace ActiveDongle {
        function match(dongle: Dongle): dongle is ActiveDongle;
    }
    type Dongle = LockedDongle | ActiveDongle;
    type SimOwnership = SimOwnership.Owned | SimOwnership.Shared;
    namespace SimOwnership {
        type Owned = {
            status: "OWNED";
            sharedWith: {
                confirmed: string[];
                notConfirmed: string[];
            };
        };
        type Shared = Shared.Confirmed | Shared.NotConfirmed;
        namespace Shared {
            type Confirmed = {
                status: "SHARED CONFIRMED";
                ownerEmail: string;
            };
            type NotConfirmed = {
                status: "SHARED NOT CONFIRMED";
                ownerEmail: string;
                sharingRequestMessage: string | undefined;
            };
        }
    }
    type UserSim = UserSim.Base<SimOwnership>;
    namespace UserSim {
        type Base<T extends SimOwnership> = {
            sim: ActiveDongle["sim"];
            friendlyName: string;
            password: string;
            isVoiceEnabled: boolean | undefined;
            isOnline: boolean;
            ownership: T;
        };
        type Owned = Base<SimOwnership.Owned>;
        namespace Owned {
            function match(userSim: UserSim): userSim is Owned;
        }
        type Shared = Base<SimOwnership.Shared>;
        namespace Shared {
            function match(userSim: UserSim): userSim is Shared;
            type Confirmed = Base<SimOwnership.Shared.Confirmed>;
            namespace Confirmed {
                function match(userSim: UserSim): userSim is Confirmed;
            }
            type NotConfirmed = Base<SimOwnership.Shared.NotConfirmed>;
            namespace NotConfirmed {
                function match(userSim: UserSim): userSim is NotConfirmed;
            }
        }
        type Usable = Base<SimOwnership.Owned | SimOwnership.Shared.Confirmed>;
        namespace Usable {
            function match(userSim: UserSim): userSim is Usable;
        }
    }
    type AffectedUsers = {
        registered: string[];
        notRegistered: string[];
    };
    type UnlockResult = UnlockResult.WrongPin | UnlockResult.ValidPin;
    namespace UnlockResult {
        type WrongPin = {
            wasPinValid: false;
            pinState: Types.LockedPinState;
            tryLeft: number;
        };
        type ValidPin = ValidPin.Registerable | ValidPin.NotRegisterable;
        namespace ValidPin {
            type Registerable = {
                wasPinValid: true;
                isSimRegisterable: true;
                dongle: Types.ActiveDongle;
            };
            type NotRegisterable = {
                wasPinValid: true;
                isSimRegisterable: false;
                simRegisteredBy: {
                    who: "MYSELF";
                } | {
                    who: "OTHER USER";
                    email: string;
                };
            };
        }
    }
}
export declare namespace JSON {
    function stringify(obj: any): string;
    function parse(str: string): any;
}
