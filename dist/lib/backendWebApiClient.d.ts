export declare const webApiPath = "api";
export declare namespace loginUser {
    const methodName = "login-user";
    type Params = {
        email: string;
        password: string;
    };
    function run($: any, params: Params, callback: (success: boolean) => void): void;
}
export declare namespace registerUser {
    const methodName = "register-user";
    type Params = {
        email: string;
        password: string;
    };
    type StatusMessage = "CREATED" | "EMAIL_NOT_AVAILABLE";
    function run($: any, params: Params, callback: (status: StatusMessage) => void): void;
}
export declare namespace createDongleConfig {
    const methodName = "create-dongle-config";
    type Params = {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try: string;
        pin_second_try?: string;
    };
    type StatusMessage = string;
    function run($: any, params: Params, callback: (status: StatusMessage) => void): void;
}
export declare namespace getUserConfig {
    const methodName = "get-user-config";
    type Params = {
        email: string;
        password: string;
    };
}
