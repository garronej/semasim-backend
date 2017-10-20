export const webApiPath = "api";

function buildAjaxPostQuery(
    methodName: string,
    params: Object,
): JQueryAjaxSettings {

    return {
        "url": `/${webApiPath}/${methodName}`,
        "method": "POST",
        "contentType": "application/json; charset=UTF-8",
        "data": JSON.stringify(params)
    };

}

export const unknownError = "UNKNOWN_ERROR";

export namespace loginUser {

    export const methodName = "login-user";

    export type Params = {
        email: string;
        password: string;
    };

    export function makeCall(
        $: any,
        params: Params,
        callback: (success: boolean) => void
    ) {

        ($ as JQueryStatic).ajax(
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

    export type StatusMessage =
        "CREATED" |
        "EMAIL_NOT_AVAILABLE" |
        typeof unknownError;

    export function makeCall(
        $: any,
        params: Params,
        callback: (status: StatusMessage) => void
    ) {

        ($ as JQueryStatic).ajax(
            buildAjaxPostQuery(methodName, params)
        )
            .fail((jqXHR, textStatus, statusMessage) => callback(statusMessage as StatusMessage))
            .done(data => callback("CREATED"));

    }

}


export namespace createUserEndpoint {

    export const methodName = "create-user-endpoint";

    export type Params = {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try?: string;
        pin_second_try?: string;
    }

    export type StatusMessage =
        "USER_NOT_LOGGED" |
        "DONGLE_NOT_FOUND" |
        "ICCID_MISMATCH" |
        "WRONG_PIN" |
        "SIM_PIN_LOCKED_AND_NO_PIN_PROVIDED" |
        "SUCCESS" |
        typeof unknownError;

    export function makeCall(
        $: any,
        params: Params,
        callback: (status: StatusMessage) => void
    ) {

        ($ as JQueryStatic).ajax(
            buildAjaxPostQuery(methodName, params)
        )
            .fail((jqXHR, textStatus, statusMessage) => callback(statusMessage as StatusMessage))
            .done(() => callback("SUCCESS"));

    }

}

export namespace deleteUserEndpoint {

    export const methodName = "delete-user-endpoint";

    export type Params = {
        imei: string;
    };

    export type StatusMessage =
        "USER_NOT_LOGGED" |
        "ENDPOINT_NOT_FOUND" |
        "SUCCESS" |
        typeof unknownError;

    export function makeCall(
        $: any,
        params: Params,
        callback: (status: StatusMessage) => void
    ) {

        ($ as JQueryStatic).ajax(
            buildAjaxPostQuery(methodName, params)
        )
            .fail((jqXHR, textStatus, statusMessage) => callback(statusMessage as StatusMessage))
            .done(data => callback("SUCCESS"));

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