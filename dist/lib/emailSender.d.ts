import * as types from "../frontend/types";
export declare const sharingRequest: (simOwnerEmail: string, userSim: types.UserSim.Owned, message: string, targetUsers: {
    email: string;
    isRegistered: boolean;
}[]) => Promise<void>;
export declare const sharingRequestSafe: (simOwnerEmail: string, userSim: types.UserSim.Owned, message: string, targetUsers: {
    email: string;
    isRegistered: boolean;
}[]) => Promise<void>;
export declare const passwordRenewalRequest: (email: string, token: string) => Promise<void>;
export declare const passwordRenewalRequestSafe: (email: string, token: string) => Promise<void>;
export declare const emailValidation: (email: string, activationCode: string) => Promise<void>;
export declare const emailValidationSafe: (email: string, activationCode: string) => Promise<void>;
