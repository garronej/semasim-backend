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
Object.defineProperty(exports, "__esModule", { value: true });
var pjsip = require("../pjsip");
var agi = require("../agi");
var _debug = require("debug");
var debug = _debug("_fromDongle/call");
exports.gain = "" + 4000;
/*
export const jitterBuffer = {
    type: "fixed",
    params: "2500,10000"
};
*/
exports.jitterBuffer = {
    type: "adaptive",
    params: "default"
};
/*
export const jitterBuffer = {
    type: "fixed",
    params: "default"
};
*/
function call(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var _, imei, _a, _b, _c, _d, contactsToDial;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    debug("Call from " + channel.request.callerid);
                    _ = channel.relax;
                    return [4 /*yield*/, _.getVariable("DONGLEIMEI")];
                case 1:
                    imei = (_e.sent());
                    _b = (_a = _).setVariable;
                    _c = ["CALLERID(name)"];
                    _d = "\"";
                    return [4 /*yield*/, pjsip.getContactName(imei, channel.request.callerid)];
                case 2: 
                //await _.setVariable("CALLERID(name-charset)", "utf8");
                return [4 /*yield*/, _b.apply(_a, _c.concat([_d + ((_e.sent()) || channel.request.callerid) + "\""]))];
                case 3:
                    //await _.setVariable("CALLERID(name-charset)", "utf8");
                    _e.sent();
                    return [4 /*yield*/, pjsip.getAvailableContactsOfEndpoint(imei)];
                case 4:
                    contactsToDial = (_e.sent())
                        .map(function (contact) { return "PJSIP/" + contact; })
                        .join("&");
                    if (!contactsToDial) {
                        debug("No contact to dial!");
                        return [2 /*return*/];
                    }
                    debug({ contactsToDial: contactsToDial });
                    debug("Dial...");
                    return [4 /*yield*/, agi.dialAndGetOutboundChannel(channel, contactsToDial, function (outboundChannel) { return __awaiter(_this, void 0, void 0, function () {
                            var _;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _ = outboundChannel.relax;
                                        debug("...OUTBOUND PJSIP channel!");
                                        debug("set jitterbuffer", exports.jitterBuffer);
                                        return [4 /*yield*/, _.setVariable("JITTERBUFFER(" + exports.jitterBuffer.type + ")", exports.jitterBuffer.params)];
                                    case 1:
                                        _a.sent();
                                        debug("set automatic gain control rx", { gain: exports.gain });
                                        return [4 /*yield*/, _.setVariable("AGC(rx)", exports.gain)];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 5:
                    _e.sent();
                    debug("Call ended");
                    return [2 /*return*/];
            }
        });
    });
}
exports.call = call;
//# sourceMappingURL=call.js.map