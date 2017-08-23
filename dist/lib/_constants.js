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
exports.dbParams = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "abcde12345"
};
exports.dbParamsBackend = __assign({}, exports.dbParams, { "password": fs.readFileSync(path.join("/", "home", "admin", "mysql_root_user_password.txt"), "utf8").replace(/\s/g, ""), "database": "semasim_backend" });
exports.gain = "" + 4000;
exports.jitterBuffer = {
    //type: "fixed",
    //params: "2500,10000"
    //type: "fixed",
    //params: "default"
    type: "adaptive",
    params: "default"
};
//TODO: not defined here get from chan-dongle-extended-client
exports.dongleCallContext = "from-dongle";
exports.phoneNumber = "_[+0-9].";
exports.sipCallContext = "from-sip-call";
exports.sipMessageContext = "from-sip-message";
exports.serviceAccount = require("../../res/semasimdev-firebase-adminsdk.json");
exports.backendSipProxyListeningPortForGateways = 50610;
exports.flowTokenKey = "flowtoken";
exports.backendHostname = "semasim.com";
function getTlsOptions() {
    var pathToCerts = path.join("/", "home", "admin", "ns.semasim.com");
    var key = fs.readFileSync(path.join(pathToCerts, "privkey2.pem"), "utf8");
    var cert = fs.readFileSync(path.join(pathToCerts, "fullchain2.pem"), "utf8");
    var ca = fs.readFileSync(path.join(pathToCerts, "chain2.pem"), "utf8");
    return { key: key, cert: cert, ca: ca };
}
exports.getTlsOptions = getTlsOptions;
exports.webApiPath = "api";
exports.webApiPort = 4430;
exports.reg_expires = 21600;