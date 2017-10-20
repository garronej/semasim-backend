(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
exports.__esModule = true;
exports.data = {
    "title": "My SIMs",
    "table_panel_title": "My SIM cards",
    "table_rows": [
        { "title": "Number", "key": "sim_number" },
        { "title": "Operator", "key": "sim_service_provider" },
        { "title": "SIM ICCID", "key": "sim_iccid" },
        { "title": "Host Dongle's IMEI", "key": "dongle_imei" }
    ],
    "form_instructions": [
        "The SIM you want to add must be inserted inside a Huawei USB dongle connected to a Semasim Gateway.",
        "The Gateway must be up and connected to internet at the time you attempt the registration."
    ].join("\n"),
    "form_fields": {
        "imei": {
            "text": "Huawei USB Dongle's IMEI",
            "placeholder": "15 digits, printed on Dongle."
        },
        "last_four_digits_of_iccid": {
            "text": "Last four digits of SIM's ICCID",
            "placeholder": "4 digits, Printed on SIM"
        },
        "pin_first_try": {
            "text": "SIM card's PIN code",
            "placeholder": "e.g 0000"
        },
        "pin_second_try": {
            "text": "PIN code second try",
            "placeholder": "Not required, e.g. 1234"
        }
    },
    "form_title": "Add new SIM card",
    "success": "Success!",
    "wait": "Please wait...",
    "submit": "Submit"
};
function buildData(email, userEndpoints) {
    return __assign({}, exports.data, { email: email, userEndpoints: userEndpoints });
}
exports.buildData = buildData;

},{}],3:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var webApi = require("../../api");
var data_1 = require("./data");
$(document).ready(function () {
    $("#new_endpoint_config").on("submit", function (event) {
        event.preventDefault();
        var panelModal = $("#panelModal");
        var h1 = panelModal.find(".panel-body h1");
        h1.html(data_1.data.wait);
        panelModal.modal("toggle");
        webApi.createUserEndpoint.makeCall($, {
            "imei": $("#imei").val(),
            "last_four_digits_of_iccid": $("#last_four_digits_of_iccid").val(),
            "pin_first_try": $("#pin_first_try").val() || undefined,
            "pin_second_try": $("#pin_second_try").val() || undefined
        }, function (status) {
            switch (status) {
                case "USER_NOT_LOGGED":
                    location.reload();
                    break;
                case "SUCCESS":
                    h1.html(data_1.data.success);
                    setTimeout(function () {
                        window.scrollTo(0, 0);
                        location.reload();
                    }, 1000);
                    break;
                default:
                    h1.html(status.toLowerCase().replace(/_/g, " "));
                    break;
            }
        });
    });
    $(".endpoint_config_delete_btn").on("click", function () {
        var imei = $(this).attr("data-semasim-imei");
        webApi.deleteUserEndpoint.makeCall($, { imei: imei }, function (status) {
            if (status === "SUCCESS" || status === "USER_NOT_LOGGED")
                location.reload();
            else
                alert(status.toLowerCase().replace(/_/g, " "));
        });
    });
});

},{"../../api":1,"./data":2}]},{},[3]);
