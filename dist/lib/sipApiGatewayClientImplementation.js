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
var semasim_gateway_1 = require("../semasim-gateway");
var protocol = semasim_gateway_1.sipApi.protocol;
var apiDeclaration = semasim_gateway_1.sipApi.gatewayDeclaration;
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var sanityChecks = {};
function init(gatewaySocket) {
    new protocol.Client(gatewaySocket, 3600 * 1000, sanityChecks);
}
exports.init = init;
sanityChecks[apiDeclaration.getDongles.methodName] =
    function (response) {
        if (!(response instanceof Array)) {
            return false;
        }
        try {
            for (var response_1 = __values(response), response_1_1 = response_1.next(); !response_1_1.done; response_1_1 = response_1.next()) {
                var dongle = response_1_1.value;
                if (!chan_dongle_extended_client_1.DongleController.Dongle.sanityCheck(dongle)) {
                    return false;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (response_1_1 && !response_1_1.done && (_a = response_1.return)) _a.call(response_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return true;
        var e_1, _a;
    };
function getDongles(gatewaySocket) {
    return __awaiter(this, void 0, void 0, function () {
        var methodName, params, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    methodName = apiDeclaration.getDongles.methodName;
                    params = undefined;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, protocol.Client.getFromSocket(gatewaySocket)
                            .sendRequest(methodName, params, 3000)];
                case 2: return [2 /*return*/, _b.sent()];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.getDongles = getDongles;
sanityChecks[apiDeclaration.unlockDongle.methodName] =
    chan_dongle_extended_client_1.DongleController.UnlockResult.sanityCheck;
function unlockDongle(gatewaySocket, imei, pin) {
    return __awaiter(this, void 0, void 0, function () {
        var methodName, params, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    methodName = apiDeclaration.unlockDongle.methodName;
                    params = { imei: imei, pin: pin };
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, protocol.Client.getFromSocket(gatewaySocket)
                            .sendRequest(methodName, params, 20 * 1000)];
                case 2: return [2 /*return*/, _b.sent()];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, undefined];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.unlockDongle = unlockDongle;
sanityChecks[apiDeclaration.reNotifySimOnline.methodName] =
    function (response) { return response === undefined; };
function reNotifySimOnline(gatewaySocket, imsi) {
    return __awaiter(this, void 0, void 0, function () {
        var methodName, params;
        return __generator(this, function (_a) {
            methodName = apiDeclaration.reNotifySimOnline.methodName;
            params = { imsi: imsi };
            protocol.Client.getFromSocket(gatewaySocket)
                .sendRequest(methodName, params, 5 * 1000)
                .catch(function () { });
            return [2 /*return*/, undefined];
        });
    });
}
exports.reNotifySimOnline = reNotifySimOnline;
