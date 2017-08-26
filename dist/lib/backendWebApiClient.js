"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webApiPath = "api";
var loginUser;
(function (loginUser) {
    loginUser.methodName = "login-user";
    function run($, params, callback) {
        $.ajax({
            "url": "/" + exports.webApiPath + "/" + loginUser.methodName,
            "method": "POST",
            "data": params
        })
            .fail(function (jqXHR, textStatus, statusMessage) { return callback(false); })
            .done(function (data) { return callback(true); });
    }
    loginUser.run = run;
})(loginUser = exports.loginUser || (exports.loginUser = {}));
var registerUser;
(function (registerUser) {
    registerUser.methodName = "register-user";
    function run($, params, callback) {
        $.ajax({
            "url": "/" + exports.webApiPath + "/" + registerUser.methodName,
            "method": "POST",
            "data": params
        })
            .fail(function (jqXHR, textStatus, statusMessage) { return callback(statusMessage); })
            .done(function (data) { return callback("CREATED"); });
    }
    registerUser.run = run;
})(registerUser = exports.registerUser || (exports.registerUser = {}));
var createDongleConfig;
(function (createDongleConfig) {
    createDongleConfig.methodName = "create-dongle-config";
    function run($, params, callback) {
        $.ajax({
            "url": "/" + exports.webApiPath + "/" + createDongleConfig.methodName,
            "method": "POST",
            "data": params
        })
            .fail(function (jqXHR, textStatus, statusMessage) { return callback(statusMessage); })
            .done(function (data) { return callback("SUCCESS"); });
    }
    createDongleConfig.run = run;
})(createDongleConfig = exports.createDongleConfig || (exports.createDongleConfig = {}));
var getUserConfig;
(function (getUserConfig) {
    getUserConfig.methodName = "get-user-config";
})(getUserConfig = exports.getUserConfig || (exports.getUserConfig = {}));
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
