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
exports.__esModule = true;
var webApi = require("../../api");
$(document).ready(function () {
    $("#login-form").on("submit", function (event) {
        event.preventDefault();
        if (!$(this).valid())
            return;
        webApi.loginUser.makeCall($, { "email": $("#emailLogin").val(), "password": $("#passwordLogin").val() }, function (success) {
            if (!success)
                alert("Authentication failed, please retry");
            else
                location.reload();
        });
    });
    $("#register-form").on("submit", function (event) {
        event.preventDefault();
        if (!$(this).valid())
            return;
        webApi.registerUser.makeCall($, {
            "email": $("#emailRegister").val(),
            "password": $("#passwordRegister").val()
        }, function (status) {
            if (status !== "CREATED") {
                alert("Error: " + status.toLowerCase().replace(/_/g, " "));
                $("#emailRegister").val("");
                return;
            }
            $("#myTab a:first").tab("show");
            $("#emailLogin").val($("#emailRegister").val());
            $("#passwordLogin").val($("#passwordRegister").val());
            setTimeout(function () { return $("#btnLogin").trigger("click"); }, 500);
        });
    });
    //activate tabs
    $("#myTab a:" + ((window.location.pathname === "/register.ejs") ? "last" : "first"))
        .tab('show');
    //for custom checkboxes
    $('input').not('.noStyle').iCheck({
        "checkboxClass": 'icheckbox_minimal-teal'
    });
    //validate login form 
    $("#login-form").validate({
        "ignore": 'input[type="hidden"]',
        "errorPlacement": function (error, element) {
            var wrap = element.parent();
            var wrap1 = wrap.parent();
            if (wrap1.hasClass('checkbox')) {
                error.insertAfter(wrap1);
            }
            else {
                if (element.attr('type') == 'file') {
                    error.insertAfter(element.next());
                }
                else {
                    error.insertAfter(element);
                }
            }
        },
        "errorClass": 'help-block',
        "rules": {
            "email": {
                "required": true,
                "email": true
            },
            "password": {
                "required": true,
                "minlength": 6
            }
        },
        "messages": {
            "password": {
                "required": "Please provide a password",
                "minlength": "Your password must be at least 6 characters long"
            },
            "email": "Please type your email"
        },
        "highlight": function (element) {
            if ($(element).offsetParent().parent().hasClass("form-group")) {
                $(element).offsetParent().parent().removeClass("has-success").addClass("has-error");
            }
            else {
                if ($(element).attr("type") == "file") {
                    $(element).parent().parent().removeClass("has-success").addClass("has-error");
                }
                $(element).offsetParent().parent().parent().parent().removeClass("has-success").addClass("has-error");
            }
        },
        "unhighlight": function (element, errorClass) {
            if ($(element).offsetParent().parent().hasClass("form-group")) {
                $(element).offsetParent().parent().removeClass("has-error").addClass("has-success");
                $(element["form"]).find("label[for=" + element.id + "]").removeClass(errorClass);
            }
            else if ($(element).offsetParent().parent().hasClass('checkbox')) {
                $(element).offsetParent().parent().parent().parent().removeClass("has-error").addClass("has-success");
                $(element["form"]).find("label[for=" + element.id + "]").removeClass(errorClass);
            }
            else if ($(element).next().hasClass("bootstrap-filestyle")) {
                $(element).parent().parent().removeClass("has-error").addClass("has-success");
            }
            else {
                $(element).offsetParent().parent().parent().removeClass("has-error").addClass("has-success");
            }
        }
    });
});

},{"../../api":1}]},{},[2]);
