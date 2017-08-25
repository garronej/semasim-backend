
export const webApiPath = "api";

export function loginUser(
    $: JQueryStatic<any>,
    request: createUser.Request,
    callback: (success: boolean) => void
){

    $.ajax({
        "url": `/${webApiPath}/${loginUser.methodName}`,
        "method": "POST",
        "data": request
    })
        .fail((jqXHR, textStatus, statusMessage) => callback(false))
        .done(data => callback(true));

}

export namespace loginUser {

    export const methodName= "login-user";

    export type Request= {
        email: string;
        password: string;
    };

}


export function createUser(
    $: JQueryStatic<any>,
    request: createUser.Request,
    callback: (status: createUser.StatusMessage) => void
){

    $.ajax({
        "url": `/${webApiPath}/${createDongleConfig.methodName}`,
        "method": "POST",
        "data": request
    })
        .fail((jqXHR, textStatus, statusMessage) => callback(statusMessage as createUser.StatusMessage))
        .done(data => callback("CREATED"));

}

export namespace createUser {

    export const methodName= "create-user";

    export type Request = {
        email: string;
        password: string;
    }

    export type StatusMessage= "CREATED" | "EMAIL_NOT_AVAILABLE";

}

export function createDongleConfig(
    $: JQueryStatic<any>,
    request: createDongleConfig.Request,
    callback: (status: createDongleConfig.StatusMessage) => void
) {

    $.ajax({
        "url": `/${webApiPath}/${createDongleConfig.methodName}`,
        "method": "POST",
        "data": request
    })
        .fail((jqXHR, textStatus, statusMessage) => callback(statusMessage as createDongleConfig.StatusMessage))
        .done(data => callback("SUCCESS"));

}

export namespace createDongleConfig {

    export const methodName = "create-dongle-config";

    export type Request = {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try: string;
        pin_second_try?: string;
    }

    export type StatusMessage= string;

}

export namespace getUserConfig {

    export const methodName = "get-user-config";

    export type Request = {
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