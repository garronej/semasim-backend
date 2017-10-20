"use strict";
exports.__esModule = true;
exports.webApiPath = "api";
function buildAjaxPostQuery(methodName, params) {
    return {
        "url": "/" + exports.webApiPath + "/" + methodName,
        "method": "POST",
        "contentType": "application/json; charset=UTF-8",
        "data": JSON.stringify(params)
    };
}
exports.unknownError = "UNKNOWN_ERROR";
var loginUser;
(function (loginUser) {
    loginUser.methodName = "login-user";
    function makeCall($, params, callback) {
        $.ajax(buildAjaxPostQuery(loginUser.methodName, params))
            .fail(function (jqXHR, textStatus, statusMessage) { return callback(false); })
            .done(function (data) { return callback(true); });
    }
    loginUser.makeCall = makeCall;
})(loginUser = exports.loginUser || (exports.loginUser = {}));
var registerUser;
(function (registerUser) {
    registerUser.methodName = "register-user";
    function makeCall($, params, callback) {
        $.ajax(buildAjaxPostQuery(registerUser.methodName, params))
            .fail(function (jqXHR, textStatus, statusMessage) { return callback(statusMessage); })
            .done(function (data) { return callback("CREATED"); });
    }
    registerUser.makeCall = makeCall;
})(registerUser = exports.registerUser || (exports.registerUser = {}));
var createUserEndpoint;
(function (createUserEndpoint) {
    createUserEndpoint.methodName = "create-user-endpoint";
    function makeCall($, params, callback) {
        $.ajax(buildAjaxPostQuery(createUserEndpoint.methodName, params))
            .fail(function (jqXHR, textStatus, statusMessage) { return callback(statusMessage); })
            .done(function () { return callback("SUCCESS"); });
    }
    createUserEndpoint.makeCall = makeCall;
})(createUserEndpoint = exports.createUserEndpoint || (exports.createUserEndpoint = {}));
var deleteUserEndpoint;
(function (deleteUserEndpoint) {
    deleteUserEndpoint.methodName = "delete-user-endpoint";
    function makeCall($, params, callback) {
        $.ajax(buildAjaxPostQuery(deleteUserEndpoint.methodName, params))
            .fail(function (jqXHR, textStatus, statusMessage) { return callback(statusMessage); })
            .done(function (data) { return callback("SUCCESS"); });
    }
    deleteUserEndpoint.makeCall = makeCall;
})(deleteUserEndpoint = exports.deleteUserEndpoint || (exports.deleteUserEndpoint = {}));
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
