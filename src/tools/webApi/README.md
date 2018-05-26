#Implementation example:

declaration.ts:
````typescript
export namespace fooBar {

    export const methodName = "foo-bar";

    export type Params = {
        p1: string;
        p2: string;
    };

    export type Response = undefined;

}
````

apiHandlers.ts
````typescript

import * as d  from "./declaration";

(() => {

    let methodName = d.registerUser.methodName;
    type Params = d.registerUser.Params;
    type Response = d.registerUser.Response;

    let handler: Handler<Params, Response>= {
        "needAuth": false,
        "contentType": "application/json-custom; charset=utf-8",
        "sanityChecks": params => (
            params instanceof Object &&
            typeof p1 === "string" &&
            typeof p2 === "string"
        ),
        "handler": async (params, remoteAddress, session) => {

            let { p1, p2 } = params;

            //Do stuffs..

            return undefined;

        }
    };

    handlers[methodName]= handler;

})();
````

web.ts:
````typescript

import * as session from "express-session";
import * as express from "express";
import { handlers } from "./apiHandlers";
import * as webApiServer from "./webApi/server";

const sessionMiddleware= session({ 
    "secret": "xSoLe9d3=", 
    "resave": false, 
    "saveUninitialized": false 
});

let app = express();

app.use(sessionMiddleware) ;

webApiServer.init({
    app,
    "apiPath": "my-api",
    handlers,
    "isAuthenticated": (req)=> !!req.session!.auth,
    "onError": { "badRequest": req=> { delete (req.session || {}).auth; }}
});

//...webPagesServer.start(app);

let httpsServer = https.createServer( { "key": "...", "cert": "...", "ca": "..."});

httpsServer
    .on("request", app)
    .listen(443, interfaceIp)
    .once("listening", () => resolve())
    ;

````

client.ts:
````typescript

import * as d from "./declaration";
import * as ttJC from "transfer-tools/dist/lib/JSON_CUSTOM";

const JSON_CUSTOM= ttJC.get();

async function makeRequest<Params, Response>(
    methodName, params: Params
): Promise<Response> {
    return new Promise<Response>(
        resolve => (window["$"] as JQueryStatic).ajax({
            "url": `/${d.apiPath}/${methodName}`,
            "method": "POST",
            "contentType": "application/json; charset=UTF-8",
            "data": JSON_CUSTOM.stringify(params),
            "dataType": "text",
            "statusCode": {
                "400": () => alert("Bad request"),
                "401": () => window.location.reload(), //unauthorized
                "500": () => alert("Internal server error"),
                "200": (data: string) =>
                    resolve(JSON_CUSTOM.parse(data))
            }
        })
    );
}

/** return undefined **/
export function fooBar(
    p1: string,
    p2: number
) {

    const methodName = d.registerUser.methodName;
    type Params = d.registerUser.Params;
    type Response = d.registerUser.Response;

    return makeRequest<Params, Response>(
        methodName,
        { email, password }
    );

}

````

calling via get: GET https://my-domain.com/my-api/foo-bar?p1=jhon&p2=doo