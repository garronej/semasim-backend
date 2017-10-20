export declare const webApiPath = "api";
export declare const unknownError = "UNKNOWN_ERROR";
export declare namespace loginUser {
    const methodName = "login-user";
    type Params = {
        email: string;
        password: string;
    };
    function makeCall($: any, params: Params, callback: (success: boolean) => void): void;
}
export declare namespace registerUser {
    const methodName = "register-user";
    type Params = {
        email: string;
        password: string;
    };
    type StatusMessage = "CREATED" | "EMAIL_NOT_AVAILABLE" | typeof unknownError;
    function makeCall($: any, params: Params, callback: (status: StatusMessage) => void): void;
}
export declare namespace createUserEndpoint {
    const methodName = "create-user-endpoint";
    type Params = {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try?: string;
        pin_second_try?: string;
    };
    type StatusMessage = "USER_NOT_LOGGED" | "DONGLE_NOT_FOUND" | "ICCID_MISMATCH" | "WRONG_PIN" | "SIM_PIN_LOCKED_AND_NO_PIN_PROVIDED" | "SUCCESS" | typeof unknownError;
    function makeCall($: any, params: Params, callback: (status: StatusMessage) => void): void;
}
export declare namespace deleteUserEndpoint {
    const methodName = "delete-user-endpoint";
    type Params = {
        imei: string;
    };
    type StatusMessage = "USER_NOT_LOGGED" | "ENDPOINT_NOT_FOUND" | "SUCCESS" | typeof unknownError;
    function makeCall($: any, params: Params, callback: (status: StatusMessage) => void): void;
}
