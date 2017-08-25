"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webApiPath = "api";
function loginUser($, request, callback) {
    $.ajax({
        "url": "/" + exports.webApiPath + "/" + loginUser.methodName,
        "method": "POST",
        "data": request
    })
        .fail(function (jqXHR, textStatus, statusMessage) { return callback(false); })
        .done(function (data) { return callback(true); });
}
exports.loginUser = loginUser;
(function (loginUser) {
    loginUser.methodName = "login-user";
})(loginUser = exports.loginUser || (exports.loginUser = {}));
function createUser($, request, callback) {
    $.ajax({
        "url": "/" + exports.webApiPath + "/" + createDongleConfig.methodName,
        "method": "POST",
        "data": request
    })
        .fail(function (jqXHR, textStatus, statusMessage) { return callback(statusMessage); })
        .done(function (data) { return callback("CREATED"); });
}
exports.createUser = createUser;
(function (createUser) {
    createUser.methodName = "create-user";
})(createUser = exports.createUser || (exports.createUser = {}));
function createDongleConfig($, request, callback) {
    $.ajax({
        "url": "/" + exports.webApiPath + "/" + createDongleConfig.methodName,
        "method": "POST",
        "data": request
    })
        .fail(function (jqXHR, textStatus, statusMessage) { return callback(statusMessage); })
        .done(function (data) { return callback("SUCCESS"); });
}
exports.createDongleConfig = createDongleConfig;
(function (createDongleConfig) {
    createDongleConfig.methodName = "create-dongle-config";
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
