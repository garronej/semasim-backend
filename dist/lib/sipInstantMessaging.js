"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var gatewaySipProxy_1 = require("./gatewaySipProxy");
var c = require("./_constants");
var _debug = require("debug");
var debug = _debug("_sipInstantMessaging");
exports.evtMessage = gatewaySipProxy_1.evtIncomingMessage;
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var ami, matchAllExt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
                    matchAllExt = "_.";
                    return [4 /*yield*/, ami.dialplanExtensionRemove(matchAllExt, c.sipMessageContext)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, ami.dialplanExtensionAdd(c.sipMessageContext, matchAllExt, 1, "Hangup")];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.start = start;
;
function sendMessage(contact, from_number, headers, text, from_number_sim_name) {
    return new Promise(function (resolve, reject) {
        //debug("sendMessage", { contact, from_number, headers, text, from_number_sim_name });
        var actionId = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
        var uri = contact.path.split(",")[0].match(/^<(.*)>$/)[1].replace(/;lr/, "");
        chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.messageSend("pjsip:" + contact.endpoint + "/" + uri, from_number, actionId).catch(function (error) { return reject(error); });
        gatewaySipProxy_1.evtOutgoingMessage.attachOnce(function (_a) {
            var sipRequest = _a.sipRequest;
            return sipRequest.content === actionId;
        }, function (_a) {
            var sipRequest = _a.sipRequest, evtReceived = _a.evtReceived;
            //TODO: inform that the name come from the SD card
            if (from_number_sim_name)
                sipRequest.headers.from.name = "\"" + from_number_sim_name + " (sim)\"";
            sipRequest.uri = contact.uri;
            sipRequest.headers.to = { "name": undefined, "uri": contact.uri, "params": {} };
            delete sipRequest.headers.contact;
            sipRequest.content = text;
            sipRequest.headers = __assign({}, sipRequest.headers, headers);
            evtReceived.waitFor(3500).then(function () { return resolve(true); }).catch(function () { return resolve(false); });
        });
    });
}
exports.sendMessage = sendMessage;
