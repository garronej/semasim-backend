export const webApiPath = "api";

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

        ($ as JQueryStatic<any>).ajax({
            "url": `/${webApiPath}/${methodName}`,
            "method": "POST",
            "data": params
        })
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

        ($ as JQueryStatic<any>).ajax({
            "url": `/${webApiPath}/${methodName}`,
            "method": "POST",
            "data": params
        })
            .fail((jqXHR, textStatus, statusMessage) => callback(statusMessage as StatusMessage))
            .done(data => callback("CREATED"));

    }

}


export namespace createDongleConfig {

    export const methodName = "create-dongle-config";

    export type Params = {
        imei: string;
        last_four_digits_of_iccid: string;
        pin_first_try: string;
        pin_second_try?: string;
    }

    export type StatusMessage = string;

    export function run(
        $: any,
        params: Params,
        callback: (status: StatusMessage) => void
    ) {

        ($ as JQueryStatic<any>).ajax({
            "url": `/${webApiPath}/${methodName}`,
            "method": "POST",
            "data": params
        })
            .fail((jqXHR, textStatus, statusMessage) => callback(statusMessage as StatusMessage))
            .done(data => callback("SUCCESS"));

    }

}

export namespace getUserConfig {

    export const methodName = "get-user-config";

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