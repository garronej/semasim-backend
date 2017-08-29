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
export declare namespace createdUserEndpointConfig {
    const methodName = "create-user-endpoint_config";
    type Params = {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try?: string;
        pin_second_try?: string;
    };
    type StatusMessage = "USER_NOT_LOGGED" | "DONGLE_NOT_FOUND" | "ICCID_MISMATCH" | "WRONG_PIN" | "SIM_PIN_LOCKED_AND_NO_PIN_PROVIDED" | "SUCCESS";
    function run($: any, params: Params, callback: (status: StatusMessage) => void): void;
}
export declare namespace deleteUserEndpointConfig {
    const methodName = "delete-user-endpoint-config";
    type Params = {
        imei: string;
    };
    type StatusMessage = "USER_NOT_LOGGED" | "ENDPOINT_CONFIG_NOT_FOUND" | "SUCCESS";
    function run($: any, params: Params, callback: (status: StatusMessage) => void): void;
}
export declare namespace getUserEndpointConfigs {
    const methodName = "get-user-endpoint-configs";
    type ReturnValue = {
        dongle_imei: string;
        sim_iccid: string;
        sim_service_provider: string | null;
        sim_number: string | null;
    }[];
    function run(nodeRestClientInst: any, host: string, cookie: string): Promise<ReturnValue>;
}
export declare namespace getUserLinphoneConfig {
    const methodName = "get-user-linphone-config";
    type Params = {
        email: string;
        password: string;
    };
}
