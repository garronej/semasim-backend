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
function diagnostics(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var _, gain, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _ = channel.relax;
                    gain = "4000";
                    _a = channel.request.extension;
                    switch (_a) {
                        case "1234": return [3 /*break*/, 1];
                        case "4321": return [3 /*break*/, 6];
                    }
                    return [3 /*break*/, 15];
                case 1:
                    console.log("Record test with answer after AGC");
                    //await _.setVariable("AGC(rx)", "off");
                    return [4 /*yield*/, _.setVariable("AGC(tx)", gain)];
                case 2:
                    //await _.setVariable("AGC(rx)", "off");
                    _b.sent();
                    //await _.setVariable("DENOISE(rx)", "off");
                    //await _.setVariable("DENOISE(tx)", "off");
                    return [4 /*yield*/, _.answer()];
                case 3:
                    //await _.setVariable("DENOISE(rx)", "off");
                    //await _.setVariable("DENOISE(tx)", "off");
                    _b.sent();
                    return [4 /*yield*/, _.streamFile("demo-echotest", ["#", "*"])];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, _.recordFile("my-record", "wav", ["#", "*"], 120000, true)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    console.log("Playback test !");
                    if (!(channel.request.extension === "4321")) return [3 /*break*/, 8];
                    console.log("AGC off");
                    //await _.setVariable("AGC(tx)", "8000");
                    /*
                    Sur sip sans ajustement du gain il y a une diférence de volume enorme entre le recorde et le fichers
                    stradart de son.
                    Si on met le gain afond ça sature pas mais on a du bruit.
                    Si on utilise denoise on a une voix métalique.
                    */
                    return [4 /*yield*/, _.answer()];
                case 7:
                    //await _.setVariable("AGC(tx)", "8000");
                    /*
                    Sur sip sans ajustement du gain il y a une diférence de volume enorme entre le recorde et le fichers
                    stradart de son.
                    Si on met le gain afond ça sature pas mais on a du bruit.
                    Si on utilise denoise on a une voix métalique.
                    */
                    _b.sent();
                    _b.label = 8;
                case 8:
                    //await _.streamFile("playback_mode");
                    console.log("playback no denoise");
                    return [4 /*yield*/, _.setVariable("DENOISE(tx)", "off")];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, _.streamFile("my-record")];
                case 10:
                    _b.sent();
                    console.log("playback denoise");
                    return [4 /*yield*/, _.setVariable("DENOISE(tx)", "on")];
                case 11:
                    _b.sent();
                    return [4 /*yield*/, _.streamFile("my-record")];
                case 12:
                    _b.sent();
                    return [4 /*yield*/, _.streamFile("demo-echodone")];
                case 13:
                    _b.sent();
                    return [4 /*yield*/, _.hangup()];
                case 14:
                    _b.sent();
                    _b.label = 15;
                case 15: return [2 /*return*/];
            }
        });
    });
}
exports.diagnostics = diagnostics;
//# sourceMappingURL=diagnostics.js.map