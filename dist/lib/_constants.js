"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var semasim_gateway_1 = require("../semasim-gateway");
var pathToPrivate = path.join(__dirname, "..", "..", "..", "private");
var c = /** @class */ (function () {
    function c() {
    }
    Object.defineProperty(c, "serviceAccount", {
        get: function () {
            if (this.__serviceAccount__)
                return this.__serviceAccount__;
            this.__serviceAccount__ = require(path.join(pathToPrivate, "semasimdev-firebase-adminsdk.json"));
            return this.serviceAccount;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(c, "tlsOptions", {
        get: function () {
            if (this.__tlsOptions__)
                return this.__tlsOptions__;
            var pathToCerts = path.join(pathToPrivate, "tls-certs");
            var key = fs.readFileSync(path.join(pathToCerts, "privkey.pem"), "utf8");
            var cert = fs.readFileSync(path.join(pathToCerts, "fullchain.pem"), "utf8");
            var ca = fs.readFileSync(path.join(pathToCerts, "chain.pem"), "utf8");
            this.__tlsOptions__ = { key: key, cert: cert, ca: ca };
            return this.tlsOptions;
        },
        enumerable: true,
        configurable: true
    });
    c.shared = semasim_gateway_1.c;
    c.dbParamsBackend = {
        "host": "127.0.0.1",
        "user": "root",
        "password": fs.readFileSync(path.join(pathToPrivate, "mysql_root_user_password.txt"), "utf8").replace(/\s/g, ""),
        "database": "semasim_backend"
    };
    c.__serviceAccount__ = undefined;
    c.__tlsOptions__ = undefined;
    c.reg_expires = 21601;
    c.regExpImei = /^[0-9]{15}$/;
    c.regExpEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    c.regExpPassword = /^[0-9a-zA-Z]{6,}$/;
    c.regExpFourDigits = /^[0-9]{4}$/;
    return c;
}());
exports.c = c;
