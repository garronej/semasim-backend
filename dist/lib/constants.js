"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
exports.dbParams = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "abcde12345"
};
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
exports.outboundSipProxyListeningPortForDevices = 50610;
exports.flowTokenKey = "flowtoken";
exports.outboundHostname = "semasim.com";
function getTlsOptions() {
    var pathToCerts = path.join("/", "home", "admin", "ns.semasim.com");
    var key = fs.readFileSync(path.join(pathToCerts, "privkey2.pem"), "utf8");
    var cert = fs.readFileSync(path.join(pathToCerts, "fullchain2.pem"), "utf8");
    var ca = fs.readFileSync(path.join(pathToCerts, "chain2.pem"), "utf8");
    return { key: key, cert: cert, ca: ca };
}
exports.getTlsOptions = getTlsOptions;
