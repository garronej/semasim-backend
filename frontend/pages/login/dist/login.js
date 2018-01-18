"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var api_1 = require("../../../api");
var tools = require("../../../tools");
var requestRenewPassword_1 = require("./requestRenewPassword");
var bootbox = global["bootbox"];
function setHandlers() {
    /* Start import from theme */
    $("#login-form").validate({
        ignore: 'input[type="hidden"]',
        errorPlacement: function (error, element) {
            var place = element.closest('.input-group');
            if (!place.get(0)) {
                place = element;
            }
            if (error.text() !== '') {
                place.after(error);
            }
        },
        errorClass: 'help-block',
        rules: {
            email: {
                required: true,
                email: true
            },
            password: {
                required: true,
                minlength: 5
            }
        },
        messages: {
            password: {
                required: "Please provide a password",
                minlength: "Your password must be at least 5 characters long"
            },
            email: "Please type your email"
        },
        highlight: function (label) {
            $(label).closest('.form-group').removeClass('has-success').addClass('has-error');
        },
        success: function (label) {
            $(label).closest('.form-group').removeClass('has-error');
            label.remove();
        }
    });
    /* End import from theme */
    $("#login-form").on("submit", function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var isSuccess;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        event.preventDefault();
                        if (!$(this).valid())
                            return [2 /*return*/];
                        return [4 /*yield*/, api_1.client.loginUser($("#email").val(), $("#password").val())];
                    case 1:
                        isSuccess = _a.sent();
                        if (!isSuccess) {
                            $("#password").val("");
                            bootbox.alert("Authentication failed, please retry");
                        }
                        else {
                            window.location.href = "/";
                        }
                        return [2 /*return*/];
                }
            });
        });
    });
    $("#forgot-password").click(function (event) {
        event.preventDefault();
        requestRenewPassword_1.requestRenewPassword();
    });
}
function handleQueryString() {
    var emailAsHex = tools.getURLParameter("email-as-hex");
    if (emailAsHex) {
        $("#email").val(tools.hexString.dec(emailAsHex));
    }
    var passwordAsHex = tools.getURLParameter("password-as-hex");
    if (passwordAsHex) {
        $("#password").val(tools.hexString.dec(passwordAsHex));
    }
    if (emailAsHex && passwordAsHex) {
        $("#login-form").submit();
    }
}
$(document).ready(function () {
    setHandlers();
    handleQueryString();
});
