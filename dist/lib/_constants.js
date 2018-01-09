"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var semasim_gateway_1 = require("../semasim-gateway");
var pathToPrivate = path.join(__dirname, "..", "..", "..", "private");
var c = /** @class */ (function () {
    function c() {
    }
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
    c.serviceName = "semasim-backend";
    c.dbParamsBackend = {
        "host": "127.0.0.1",
        "user": "semasim",
        "password": "semasim",
        "database": "semasim"
    };
    c.pushNotificationCredentials = {
        "android": {
            "pathToServiceAccount": path.join(pathToPrivate, "semasimdev-firebase-adminsdk.json")
        },
        "iOS": {
            "pathToKey": path.join(pathToPrivate, "AuthKey_Y84XM8SSNL.p8"),
            "keyId": "Y84XM8SSNL",
            "teamId": "TW9WZG49Q3",
            "appId": "com.semasim.semasim"
        }
    };
    c.__tlsOptions__ = undefined;
    c.reg_expires = 21601;
    //TODO: put in dongle extended client
    c.regExpImeiImsi = /^[0-9]{15}$/;
    c.regExpIccid = /^[0-9]{6,22}$/;
    c.regExpEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    //TODO: better regexp
    c.regExpPassword = /^[0-9a-zA-Z]{6,}$/;
    return c;
}());
exports.c = c;
