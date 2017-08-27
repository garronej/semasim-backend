"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webApiPath = "api";
function buildAjaxPostQuery(methodName, params) {
    return {
        "url": "/" + exports.webApiPath + "/" + methodName,
        "method": "POST",
        "contentType": "application/json; charset=UTF-8",
        "data": JSON.stringify(params)
    };
}
var loginUser;
(function (loginUser) {
    loginUser.methodName = "login-user";
    function run($, params, callback) {
        $.ajax(buildAjaxPostQuery(loginUser.methodName, params))
            .fail(function (jqXHR, textStatus, statusMessage) { return callback(false); })
            .done(function (data) { return callback(true); });
    }
    loginUser.run = run;
})(loginUser = exports.loginUser || (exports.loginUser = {}));
var registerUser;
(function (registerUser) {
    registerUser.methodName = "register-user";
    function run($, params, callback) {
        $.ajax(buildAjaxPostQuery(registerUser.methodName, params))
            .fail(function (jqXHR, textStatus, statusMessage) { return callback(statusMessage); })
            .done(function (data) { return callback("CREATED"); });
    }
    registerUser.run = run;
})(registerUser = exports.registerUser || (exports.registerUser = {}));
var createdUserEndpointConfig;
(function (createdUserEndpointConfig) {
    createdUserEndpointConfig.methodName = "create-dongle-config";
    function run($, params, callback) {
        $.ajax(buildAjaxPostQuery(createdUserEndpointConfig.methodName, params))
            .fail(function (jqXHR, textStatus, statusMessage) { return callback(statusMessage); })
            .done(function (data) { return callback("SUCCESS"); });
    }
    createdUserEndpointConfig.run = run;
})(createdUserEndpointConfig = exports.createdUserEndpointConfig || (exports.createdUserEndpointConfig = {}));
var getUserEndpointConfigs;
(function (getUserEndpointConfigs) {
    getUserEndpointConfigs.methodName = "get-user-endpoint-configs";
    function run(nodeRestClientInst, host, cookie) {
        return new Promise(function (resolve, reject) {
            nodeRestClientInst.post("https://" + host + "/" + exports.webApiPath + "/" + getUserEndpointConfigs.methodName, {
                "data": {},
                "headers": {
                    "Content-Type": "application/json",
                    "Cookie": cookie
                }
            }, function (data, _a) {
                var statusCode = _a.statusCode, statusMessage = _a.statusMessage;
                if (statusCode !== 200) {
                    reject(new Error(statusMessage));
                    return;
                }
                resolve(data);
            });
        });
    }
    getUserEndpointConfigs.run = run;
})(getUserEndpointConfigs = exports.getUserEndpointConfigs || (exports.getUserEndpointConfigs = {}));
var getUserLinphoneConfig;
(function (getUserLinphoneConfig) {
    getUserLinphoneConfig.methodName = "get-user-linphone-config";
})(getUserLinphoneConfig = exports.getUserLinphoneConfig || (exports.getUserLinphoneConfig = {}));
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
