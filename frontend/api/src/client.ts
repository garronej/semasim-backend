import * as declaration from "./declaration";
//TODO: import in webpage as we do for jQuerry so we do not have to host it, it can be cached ext...
import "es6-promise/auto";

async function makeRequest<Params, Response>(
    methodName, params: Params
): Promise<Response> {

    return new Promise<Response>(
        resolve => (window["$"] as JQueryStatic).ajax({
            "url": `/${declaration.apiPath}/${methodName}`,
            "method": "POST",
            "contentType": "application/json; charset=UTF-8",
            "data": declaration.JSON.stringify(params),
            "dataType": "text",
            "statusCode": {
                "400": () => alert("Bad request"),
                "401": () => window.location.reload(),
                "500": () => alert("Internal server error"),
                "200": (data: string) =>
                    resolve(declaration.JSON.parse(data))
            }
        })
    );

}

export function registerUser(
    email: string,
    password: string
) {

    const methodName = declaration.registerUser.methodName;
    type Params = declaration.registerUser.Params;
    type Response = declaration.registerUser.Response;

    return makeRequest<Params, Response>(
        methodName,
        { email, password }
    );

}

export function loginUser(
    email: string,
    password: string
) {

    const methodName = declaration.loginUser.methodName;
    type Params = declaration.loginUser.Params;
    type Response = declaration.loginUser.Response;

    return makeRequest<Params, Response>(
        methodName,
        { email, password }
    );

}

export function getSims() {

    const methodName = declaration.getSims.methodName;
    type Params = declaration.getSims.Params;
    type Response = declaration.getSims.Response;

    return makeRequest<Params, Response>(
        methodName,
        undefined
    );

}

export function getUnregisteredLanDongles() {

    const methodName = declaration.getUnregisteredLanDongles.methodName;
    type Params = declaration.getUnregisteredLanDongles.Params;
    type Response = declaration.getUnregisteredLanDongles.Response;

    return makeRequest<Params, Response>(
        methodName,
        undefined
    );

}

export function unlockSim(
    imei: string,
    pin: string
) {

    const methodName = declaration.unlockSim.methodName;
    type Params = declaration.unlockSim.Params;
    type Response = declaration.unlockSim.Response;

    return makeRequest<Params, Response>(
        methodName,
        { imei, pin }
    );

}

export function registerSim(
    imsi: string,
    friendlyName: string
) {

    const methodName = declaration.registerSim.methodName;
    type Params = declaration.registerSim.Params;
    type Response = declaration.registerSim.Response;

    return makeRequest<Params, Response>(
        methodName,
        { imsi, friendlyName }
    );

}

export function unregisterSim(
    imsi: string
) {

    const methodName = declaration.unregisterSim.methodName;
    type Params = declaration.unregisterSim.Params;
    type Response = declaration.unregisterSim.Response;

    return makeRequest<Params, Response>(
        methodName,
        { imsi }
    );


}

export function shareSim(
    imsi: string,
    emails: string[],
    message: string
) {

    const methodName = declaration.shareSim.methodName;
    type Params = declaration.shareSim.Params;
    type Response = declaration.shareSim.Response;

    return makeRequest<Params, Response>(
        methodName,
        { imsi, emails, message }
    );


}

export function stopSharingSim(
    imsi: string,
    emails: string[]
) {

    const methodName = declaration.stopSharingSim.methodName;
    type Params = declaration.stopSharingSim.Params;
    type Response = declaration.stopSharingSim.Response;

    return makeRequest<Params, Response>(
        methodName,
        { imsi, emails }
    );

}

export function setSimFriendlyName(
    imsi: string,
    friendlyName: string
) {

    const methodName = declaration.setSimFriendlyName.methodName;
    type Params = declaration.setSimFriendlyName.Params;
    type Response = declaration.setSimFriendlyName.Response;

    return makeRequest<Params, Response>(
        methodName,
        { imsi, friendlyName }
    );


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