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
var dns = require("dns");
var network = require("network");
function retrieveIpFromHostname(hostname) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var interfacePublicIp, interfaceLocalIp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve, reject) {
                        return dns.resolve4(hostname, function (error, addresses) {
                            if (error) {
                                reject(error);
                                return;
                            }
                            resolve(addresses[0]);
                        });
                    })];
                case 1:
                    interfacePublicIp = _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve, reject) { return network.get_interfaces_list(function (error, interfaces) { return __awaiter(_this, void 0, void 0, function () {
                            var _loop_1, interfaces_1, interfaces_1_1, currentInterface, state_1, e_1_1, e_1, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (error) {
                                            reject(error);
                                            return [2 /*return*/];
                                        }
                                        _loop_1 = function (currentInterface) {
                                            var currentInterfaceLocalIp, currentInterfacePublicIp;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        currentInterfaceLocalIp = currentInterface.ip_address;
                                                        return [4 /*yield*/, new Promise(function (resolve) { return network.get_public_ip({ "localAddress": currentInterfaceLocalIp }, function (error, res) { return resolve(error ? undefined : res); }); })];
                                                    case 1:
                                                        currentInterfacePublicIp = _a.sent();
                                                        if (currentInterfacePublicIp === interfacePublicIp) {
                                                            resolve(currentInterfaceLocalIp);
                                                            return [2 /*return*/, { value: void 0 }];
                                                        }
                                                        return [2 /*return*/];
                                                }
                                            });
                                        };
                                        _b.label = 1;
                                    case 1:
                                        _b.trys.push([1, 6, 7, 8]);
                                        interfaces_1 = __values(interfaces), interfaces_1_1 = interfaces_1.next();
                                        _b.label = 2;
                                    case 2:
                                        if (!!interfaces_1_1.done) return [3 /*break*/, 5];
                                        currentInterface = interfaces_1_1.value;
                                        return [5 /*yield**/, _loop_1(currentInterface)];
                                    case 3:
                                        state_1 = _b.sent();
                                        if (typeof state_1 === "object")
                                            return [2 /*return*/, state_1.value];
                                        _b.label = 4;
                                    case 4:
                                        interfaces_1_1 = interfaces_1.next();
                                        return [3 /*break*/, 2];
                                    case 5: return [3 /*break*/, 8];
                                    case 6:
                                        e_1_1 = _b.sent();
                                        e_1 = { error: e_1_1 };
                                        return [3 /*break*/, 8];
                                    case 7:
                                        try {
                                            if (interfaces_1_1 && !interfaces_1_1.done && (_a = interfaces_1.return)) _a.call(interfaces_1);
                                        }
                                        finally { if (e_1) throw e_1.error; }
                                        return [7 /*endfinally*/];
                                    case 8:
                                        reject(new Error(hostname + "(" + interfacePublicIp + ") does not point on any local interface"));
                                        return [2 /*return*/];
                                }
                            });
                        }); }); })];
                case 2:
                    interfaceLocalIp = _a.sent();
                    return [2 /*return*/, {
                            interfaceLocalIp: interfaceLocalIp,
                            interfacePublicIp: interfacePublicIp
                        }];
            }
        });
    });
}
exports.retrieveIpFromHostname = retrieveIpFromHostname;
