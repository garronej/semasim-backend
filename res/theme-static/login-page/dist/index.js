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
