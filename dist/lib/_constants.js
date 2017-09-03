"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var c = (function () {
    function c() {
    }
    Object.defineProperty(c, "dbParamsBackend", {
        get: function () {
            if (this.__dbParamsBackend__)
                return this.__dbParamsBackend__;
            this.__dbParamsBackend__ = __assign({}, c.dbParamsGateway, { "password": fs.readFileSync(path.join("/", "home", "admin", "mysql_root_user_password.txt"), "utf8").replace(/\s/g, ""), "database": "semasim_backend" });
            return this.__dbParamsBackend__;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(c, "serviceAccount", {
        get: function () {
            return require(path.join(__dirname, "..", "..", "res", "semasimdev-firebase-adminsdk.json"));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(c, "tlsOptions", {
        get: function () {
            if (this.__tlsOptions__)
                return this.__tlsOptions__;
            var pathToCerts = path.join("/", "home", "admin", "ns.semasim.com");
            var key = fs.readFileSync(path.join(pathToCerts, "privkey2.pem"), "utf8");
            var cert = fs.readFileSync(path.join(pathToCerts, "fullchain2.pem"), "utf8");
            var ca = fs.readFileSync(path.join(pathToCerts, "chain2.pem"), "utf8");
            this.__tlsOptions__ = { key: key, cert: cert, ca: ca };
            return this.__tlsOptions__;
        },
        enumerable: true,
        configurable: true
    });
    c.dbParamsGateway = {
        "host": "127.0.0.1",
        "user": "root",
        "password": "abcde12345",
        "database": "semasim"
    };
    c.__dbParamsBackend__ = undefined;
    c.gain = "" + 4000;
    c.jitterBuffer = {
        //type: "fixed",
        //params: "2500,10000"
        //type: "fixed",
        //params: "default"
        type: "adaptive",
        params: "default"
    };
    //TODO: not defined here get from chan-dongle-extended-client
    c.dongleCallContext = "from-dongle";
    c.phoneNumber = "_[+0-9].";
    c.sipCallContext = "from-sip-call";
    c.sipMessageContext = "from-sip-message";
    c.backendSipProxyListeningPortForGateways = 50610;
    c.flowTokenKey = "flowtoken";
    c.backendHostname = "semasim.com";
    c.__tlsOptions__ = undefined;
    c.reg_expires = 21601;
    c.regExpImei = /^[0-9]{15}$/;
    c.regExpEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    c.regExpPassword = /^[0-9a-zA-Z]{6,}$/;
    c.regExpFourDigits = /^[0-9]{4}$/;
    return c;
}());
exports.c = c;
