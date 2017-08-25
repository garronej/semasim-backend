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
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts_async_agi_1 = require("ts-async-agi");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var _debug = require("debug");
var debug = _debug("_agiClient");
var outboundHandlers = {};
function startServer(scripts) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, initDialplan(scripts)];
                case 1:
                    _a.sent();
                    new ts_async_agi_1.AsyncAGIServer(function (channel) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, context, threadid, extensionPattern;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = channel.request, context = _a.context, threadid = _a.threadid;
                                    return [4 /*yield*/, channel.relax.getVariable("EXTENSION_PATTERN")];
                                case 1:
                                    extensionPattern = _b.sent();
                                    if (!!extensionPattern) return [3 /*break*/, 3];
                                    //We send to outbound
                                    return [4 /*yield*/, outboundHandlers[context + "_" + threadid](channel)];
                                case 2:
                                    //We send to outbound
                                    _b.sent();
                                    return [2 /*return*/];
                                case 3: 
                                //We call specific script
                                return [4 /*yield*/, scripts[context][extensionPattern](channel)];
                                case 4:
                                    //We call specific script
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }, chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.connection);
                    return [2 /*return*/];
            }
        });
    });
}
exports.startServer = startServer;
function dialAndGetOutboundChannel(channel, dialString, outboundHandler) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, context, threadid, context_threadid, failure, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = channel.request, context = _a.context, threadid = _a.threadid;
                    context_threadid = context + "_" + threadid;
                    outboundHandlers[context_threadid] = outboundHandler;
                    setTimeout(function () { return delete outboundHandlers[context_threadid]; }, 2000);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, channel.exec("Dial", [dialString, "", "b(" + context + "^outbound^1)"])];
                case 2:
                    failure = (_b.sent()).failure;
                    return [2 /*return*/, failure];
                case 3:
                    error_1 = _b.sent();
                    return [2 /*return*/, true];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.dialAndGetOutboundChannel = dialAndGetOutboundChannel;
function initDialplan(scripts) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var ami, _loop_1, _a, _b, context, e_1_1, e_1, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
                    _loop_1 = function (context) {
                        var _loop_2, _a, _b, extensionPattern, e_2_1, priority, pushExt, e_2, _c;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    _loop_2 = function (extensionPattern) {
                                        var priority_1, pushExt_1;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, ami.dialplanExtensionRemove(extensionPattern, context)];
                                                case 1:
                                                    _a.sent();
                                                    priority_1 = 1;
                                                    pushExt_1 = function (application, applicationData) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0: return [4 /*yield*/, ami.dialplanExtensionAdd(context, extensionPattern, priority_1++, application, applicationData)];
                                                            case 1: return [2 /*return*/, _a.sent()];
                                                        }
                                                    }); }); };
                                                    return [4 /*yield*/, pushExt_1("Set", "EXTENSION_PATTERN=" + extensionPattern)];
                                                case 2:
                                                    _a.sent();
                                                    return [4 /*yield*/, pushExt_1("AGI", "agi:async")];
                                                case 3:
                                                    _a.sent();
                                                    return [4 /*yield*/, pushExt_1("Hangup")];
                                                case 4:
                                                    _a.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    };
                                    _d.label = 1;
                                case 1:
                                    _d.trys.push([1, 6, 7, 8]);
                                    _a = __values(Object.keys(scripts[context])), _b = _a.next();
                                    _d.label = 2;
                                case 2:
                                    if (!!_b.done) return [3 /*break*/, 5];
                                    extensionPattern = _b.value;
                                    return [5 /*yield**/, _loop_2(extensionPattern)];
                                case 3:
                                    _d.sent();
                                    _d.label = 4;
                                case 4:
                                    _b = _a.next();
                                    return [3 /*break*/, 2];
                                case 5: return [3 /*break*/, 8];
                                case 6:
                                    e_2_1 = _d.sent();
                                    e_2 = { error: e_2_1 };
                                    return [3 /*break*/, 8];
                                case 7:
                                    try {
                                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                    }
                                    finally { if (e_2) throw e_2.error; }
                                    return [7 /*endfinally*/];
                                case 8:
                                    priority = 1;
                                    pushExt = function (application, applicationData) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, ami.dialplanExtensionAdd(context, "outbound", priority++, application, applicationData)];
                                            case 1: return [2 /*return*/, _a.sent()];
                                        }
                                    }); }); };
                                    return [4 /*yield*/, pushExt("AGI", "agi:async")];
                                case 9:
                                    _d.sent();
                                    return [4 /*yield*/, pushExt("Return")];
                                case 10:
                                    _d.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 6, 7, 8]);
                    _a = __values(Object.keys(scripts)), _b = _a.next();
                    _d.label = 2;
                case 2:
                    if (!!_b.done) return [3 /*break*/, 5];
                    context = _b.value;
                    return [5 /*yield**/, _loop_1(context)];
                case 3:
                    _d.sent();
                    _d.label = 4;
                case 4:
                    _b = _a.next();
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 8];
                case 6:
                    e_1_1 = _d.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 8];
                case 7:
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
