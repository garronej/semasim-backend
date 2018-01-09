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
    type Response = {
        unlockResult: Types.UnlockResult.Success;
        isSimRegisterable: true;
        dongle: Types.ActiveDongle["sim"];
    } | {
        unlockResult: Types.UnlockResult.Success;
        isSimRegisterable: false;
        simRegisteredBy: {
            who: "MYSELF";
        } | {
            who: "OTHER USER";
            email: string;
        };
    } | {
        unlockResult: Types.UnlockResult.Failed;
    };
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
    type UnlockResult = UnlockResult.Success | UnlockResult.Failed;
    namespace UnlockResult {
        type Success = {
            success: true;
        };
        type Failed = {
            success: false;
            pinState: LockedPinState;
            tryLeft: number;
        };
    }
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
    type UserSim = {
        sim: ActiveDongle["sim"];
        friendlyName: string;
        ownership: UserSim.Ownership;
        password: string;
        isVoiceEnabled: boolean | undefined;
        isOnline: boolean;
    };
    namespace UserSim {
        type Ownership = Ownership.Owner | Ownership.Shared;
        namespace Ownership {
            type Owner = {
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
    }
    type AffectedUsers = {
        registered: string[];
        notRegistered: string[];
    };
}
export declare namespace JSON {
    function stringify(obj: any): string;
    function parse(str: string): any;
}
