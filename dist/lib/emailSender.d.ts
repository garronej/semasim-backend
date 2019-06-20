import { types as feTypes } from "../frontend";
export declare const sharingRequest: (simOwnerEmail: string, userSim: feTypes.UserSim._Base<feTypes.SimOwnership.Owned>, message: string, targetUsers: {
    email: string;
    isRegistered: boolean;
}[]) => Promise<void>;
export declare const passwordRenewalRequest: (email: string, token: string) => Promise<void>;
export declare const emailValidation: (email: string, activationCode: string) => Promise<void>;
