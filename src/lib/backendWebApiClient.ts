export const webApiPath = "api";

function buildAjaxPostQuery(
    methodName: string,
    params: Object,
): JQuery.AjaxSettings<any>{

    return {
            "url": `/${webApiPath}/${methodName}`,
            "method": "POST",
            "contentType": "application/json; charset=UTF-8",
            "data": JSON.stringify(params)
    };

}

export namespace loginUser {

    export const methodName = "login-user";

    export type Params = {
        email: string;
        password: string;
    };

    export function run(
        $: any,
        params: Params,
        callback: (success: boolean) => void
    ) {

        ($ as JQueryStatic<any>).ajax(
            buildAjaxPostQuery(methodName, params)
        )
            .fail((jqXHR, textStatus, statusMessage) => callback(false))
            .done(data => callback(true));

    }

}

export namespace registerUser {

    export const methodName = "register-user";

    export type Params = {
        email: string;
        password: string;
    }

    export type StatusMessage = "CREATED" | "EMAIL_NOT_AVAILABLE";

    export function run(
        $: any,
        params: Params,
        callback: (status: StatusMessage) => void
    ) {

        ($ as JQueryStatic<any>).ajax(
            buildAjaxPostQuery(methodName, params)
        )
            .fail((jqXHR, textStatus, statusMessage) => callback(statusMessage as StatusMessage))
            .done(data => callback("CREATED"));

    }

}


export namespace createdUserEndpointConfig {

    export const methodName = "create-user-endpoint_config";

    export type Params = {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try?: string;
        pin_second_try?: string;
    }

    export type StatusMessage = "USER_NOT_LOGGED" | "DONGLE_NOT_FOUND" | "ICCID_MISMATCH" | "WRONG_PIN" | "SIM_PIN_LOCKED_AND_NO_PIN_PROVIDED" | "SUCCESS";

    export function run(
        $: any,
        params: Params,
        callback: (status: StatusMessage) => void
    ) {

        ($ as JQueryStatic<any>).ajax(
            buildAjaxPostQuery(methodName, params)
        )
            .fail((jqXHR, textStatus, statusMessage) => callback(statusMessage as StatusMessage))
            .done(data => callback("SUCCESS"));

    }

}

export namespace deleteUserEndpointConfig {

    export const methodName= "delete-user-endpoint-config";

    export type Params = {
        imei: string;
    };

    export type StatusMessage = "USER_NOT_LOGGED" | "ENDPOINT_CONFIG_NOT_FOUND" | "SUCCESS";

    export function run(
        $: any,
        params: Params,
        callback: (status: StatusMessage) => void
    ) {

        ($ as JQueryStatic<any>).ajax(
            buildAjaxPostQuery(methodName, params)
        )
            .fail((jqXHR, textStatus, statusMessage) => callback(statusMessage as StatusMessage))
            .done(data => callback("SUCCESS"));

    }

}

export namespace getUserEndpointConfigs {

    export const methodName = "get-user-endpoint-configs";

    export type ReturnValue = {
        dongle_imei: string;
        sim_iccid: string;
        sim_service_provider: string | null;
        sim_number: string | null;
    }[];

    export function run(
        nodeRestClientInst, 
        host: string,
        cookie: string
    ): Promise<ReturnValue> {

        return new Promise((resolve, reject) => {

            nodeRestClientInst.post(
                `https://${host}/${webApiPath}/${methodName}`,
                { 
                    "data": {}, 
                    "headers": { 
                        "Content-Type": "application/json",
                        "Cookie": cookie
                    } 
                },
                (data, { statusCode, statusMessage }) => {

                    if (statusCode !== 200){
                        reject(new Error(statusMessage));
                        return;
                    }

                    resolve(data);

                }
            );



        });

    }

}



export namespace getUserLinphoneConfig {

    export const methodName = "get-user-linphone-config";

    export type Params = {
        email: string;
        password: string;
    }

}



/*
function buildUrl(
    methodName: string,
    params: Record<string, string | undefined>
): string {

    let query: string[] = [];

    for (let key of Object.keys(params)) {

        let value = params[key];

        if (value === undefined) continue;

        query[query.length] = `${key}=${params[key]}`;

    }

    let url = `https://${c.backendHostname}:${c.webApiPort}/${c.webApiPath}/${methodName}?${query.join("&")}`;

    console.log(`GET ${url}`);

    return url;
}
*/