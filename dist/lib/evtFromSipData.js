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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var ts_events_extended_1 = require("ts-events-extended");
;
exports.evtFromSipData = new ts_events_extended_1.SyncEvent();
var dialplanContext = "from-sip-data";
var ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
(function initDialplan() {
    return __awaiter(this, void 0, void 0, function () {
        var variables, extension, priority, _i, variables_1, variable;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    variables = [
                        "MESSAGE(to)",
                        "MESSAGE(from)",
                        "MESSAGE_DATA(Via)",
                        "MESSAGE_DATA(To)",
                        "MESSAGE_DATA(From)",
                        "MESSAGE_DATA(Call-ID)",
                        "MESSAGE_DATA(CSeq)",
                        "MESSAGE_DATA(Allow)",
                        "MESSAGE_DATA(Content-Type)",
                        "MESSAGE_DATA(User-Agent)",
                        "MESSAGE_DATA(Authorization)",
                        "MESSAGE_DATA(Content-Length)"
                    ];
                    extension = "_.";
                    priority = 1;
                    return [4 /*yield*/, ami.removeExtension(extension, dialplanContext)];
                case 1:
                    _a.sent();
                    _i = 0, variables_1 = variables;
                    _a.label = 2;
                case 2:
                    if (!(_i < variables_1.length)) return [3 /*break*/, 5];
                    variable = variables_1[_i];
                    return [4 /*yield*/, ami.addDialplanExtension(extension, priority++, "NoOp(" + variable + "===${" + variable + "})", dialplanContext)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [4 /*yield*/, ami.addDialplanExtension(extension, priority++, "NoOp(MESSAGE(base-64-encoded-body)===${BASE64_ENCODE(${MESSAGE(body)})})", dialplanContext)];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, ami.addDialplanExtension(extension, priority, "Hangup()", dialplanContext)];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
})();
ami.evt.attach(function (_a) {
    var event = _a.event, context = _a.context, priority = _a.priority;
    return (event === "Newexten" &&
        context === dialplanContext &&
        priority === "1");
}, function (newExten) { return __awaiter(_this, void 0, void 0, function () {
    var variables, uniqueId, application, appdata, match, variable, value, key, key_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                variables = {};
                uniqueId = newExten.uniqueid;
                _a.label = 1;
            case 1:
                if (!true) return [3 /*break*/, 3];
                application = newExten.application, appdata = newExten.appdata;
                if (application === "Hangup")
                    return [3 /*break*/, 3];
                match = void 0;
                if (application === "NoOp" &&
                    (match = appdata.match(/^([^\(]+)(?:\(([^\)]+)\))?===(.*)$/))) {
                    variable = match[1];
                    value = match[3];
                    key = void 0;
                    if (key = match[2]) {
                        key_1 = match[2];
                        variables[variable] || (variables[variable] = {});
                        variables[variable][key_1] = value;
                    }
                    else
                        variables[variable] = value;
                }
                return [4 /*yield*/, ami.evt.waitFor(function (_a) {
                        var uniqueid = _a.uniqueid;
                        return uniqueid === uniqueId;
                    })];
            case 2:
                newExten = _a.sent();
                return [3 /*break*/, 1];
            case 3:
                console.log("new message: ", { variables: variables });
                exports.evtFromSipData.post(variables);
                return [2 /*return*/];
        }
    });
}); });
//# sourceMappingURL=evtFromSipData.js.map