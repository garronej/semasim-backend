/// <reference types="jquery" />
export declare const webApiPath = "api";
export declare function loginUser($: JQueryStatic<any>, request: createUser.Request, callback: (success: boolean) => void): void;
export declare namespace loginUser {
    const methodName = "login-user";
    type Request = {
        email: string;
        password: string;
    };
}
export declare function createUser($: JQueryStatic<any>, request: createUser.Request, callback: (status: createUser.StatusMessage) => void): void;
export declare namespace createUser {
    const methodName = "create-user";
    type Request = {
        email: string;
        password: string;
    };
    type StatusMessage = "CREATED" | "EMAIL_NOT_AVAILABLE";
}
export declare function createDongleConfig($: JQueryStatic<any>, request: createDongleConfig.Request, callback: (status: createDongleConfig.StatusMessage) => void): void;
export declare namespace createDongleConfig {
    const methodName = "create-dongle-config";
    type Request = {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try: string;
        pin_second_try?: string;
    };
    type StatusMessage = string;
}
export declare namespace getUserConfig {
    const methodName = "get-user-config";
    type Request = {
        email: string;
        password: string;
    };
}
