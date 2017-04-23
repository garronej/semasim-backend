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
var ts_async_agi_1 = require("ts-async-agi");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var evtFromSipData_1 = require("./evtFromSipData");
var fromSip_1 = require("./fromSip");
var fromDongle_1 = require("./fromDongle");
console.log("AGI Server is running");
var ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
(function initDialplan() {
    return __awaiter(this, void 0, void 0, function () {
        var arr_extension_context, _i, arr_extension_context_1, _a, extension, context;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    arr_extension_context = [
                        ["_[+0-9].", "from-dongle"],
                        ["reassembled-sms", "from-dongle"],
                        ["sms-status-report", "from-dongle"],
                        ["_[+0-9].", "from-sip-call"]
                    ];
                    _i = 0, arr_extension_context_1 = arr_extension_context;
                    _b.label = 1;
                case 1:
                    if (!(_i < arr_extension_context_1.length)) return [3 /*break*/, 6];
                    _a = arr_extension_context_1[_i], extension = _a[0], context = _a[1];
                    return [4 /*yield*/, ami.removeExtension(extension, context)];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, ami.addDialplanExtension(extension, 1, "AGI(agi:async)", context)];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, ami.addDialplanExtension(extension, 2, "Hangup()", context)];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
})();
new ts_async_agi_1.AsyncAGIServer(function (channel) { return __awaiter(_this, void 0, void 0, function () {
    var _, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _ = channel.relax;
                console.log("AGI REQUEST...");
                _a = channel.request.context;
                switch (_a) {
                    case "from-dongle": return [3 /*break*/, 1];
                    case "from-sip-call": return [3 /*break*/, 3];
                }
                return [3 /*break*/, 5];
            case 1: return [4 /*yield*/, fromDongle_1.fromDongle(channel)];
            case 2:
                _b.sent();
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, fromSip_1.fromSip.call(channel)];
            case 4:
                _b.sent();
                return [3 /*break*/, 5];
            case 5: return [4 /*yield*/, _.hangup()];
            case 6:
                _b.sent();
                console.log("Script returned");
                return [2 /*return*/];
        }
    });
}); }, ami.ami);
evtFromSipData_1.evtFromSipData.attach(function (data) { return fromSip_1.fromSip.data(data); });
var DongleStatus;
(function (DongleStatus) {
    DongleStatus[DongleStatus["DISCONNECTED"] = 1] = "DISCONNECTED";
    DongleStatus[DongleStatus["CONNECTED_AND_FREE"] = 2] = "CONNECTED_AND_FREE";
    DongleStatus[DongleStatus["CONNECTED_AND_BUSY"] = 3] = "CONNECTED_AND_BUSY";
})(DongleStatus = exports.DongleStatus || (exports.DongleStatus = {}));
/*


export async function fromDongle_(channel: AGIChannel): Promise<void> {

    let _ = channel.relax;

    console.log("FROM DONGLE");

    console.log("callerId:", channel.request.callerid);


    let activeDongle = {
        "id": await _.getVariable("DONGLENAME"),
        "provider": await _.getVariable("DONGLEPROVIDER"),
        "imei": await _.getVariable("DONGLEIMEI"),
        "imsi": await _.getVariable("DONGLEIMSI"),
        "number": await _.getVariable("DONGLENUMBER")
    };

    console.log("activeDongle: ", activeDongle);

    let callerId = {
        "name": await _.getVariable("CALLERID(name)"),
        "num": await _.getVariable("CALLERID(num)"),
        "all": await _.getVariable("CALLERID(all)"),
        "ani": await _.getVariable("CALLERID(ani)"),
        "dnid": await _.getVariable("CALLERID(dnid)"),
        "rdnis": await _.getVariable("CALLERID(rdnis)"),
        "pres": await _.getVariable("CALLERID(pres)"),
        "ton": await _.getVariable("CALLERID(ton)")
    };

    console.log("CALLERID: ", callerId);

    let { extension } = channel.request;

    if (extension === "sms") {

        let sms64 = await _.getVariable("SMS_BASE64");

        console.log("SMS from chan dongle: ", await _.getVariable(`BASE64_DECODE(${sms64})`));

    } else if (extension === "reassembled-sms") {

        let sms = await _.getVariable("SMS");

        console.log("SMS: ", sms);

        let date = new Date((await _.getVariable("SMS_DATE"))!);

        console.log("SMS_NUMBER: ", await _.getVariable("SMS_NUMBER"));

        console.log("DATE: ", date.toUTCString());

        let textSplitCount = parseInt((await _.getVariable("SMS_TEXT_SPLIT_COUNT"))!);

        let reassembledSms = "";

        for (let i = 0; i < textSplitCount; i++)
            reassembledSms += await _.getVariable(`SMS_TEXT_P${i}`);

        console.log("SMS (REASSEMLED): ", decodeURI(reassembledSms));

    } else if (extension === "sms-status-report") {

        let statusReport = {
            "dischargeTime": await _.getVariable("STATUS_REPORT_DISCHARGE_TIME"),
            "isDelivered": await _.getVariable("STATUS_REPORT_IS_DELIVERED"),
            "id": await _.getVariable("STATUS_REPORT_ID"),
            "status": await _.getVariable("STATUS_REPORT_STATUS")
        };

        console.log("status report: ", statusReport);

    } else {

        await _.exec("DongleStatus", [activeDongle.id!, "DONGLE_STATUS"]);

        let dongleStatus = parseInt((await _.getVariable("DONGLE_STATUS"))!) as DongleStatus;

        console.log("Dongle status: ", DongleStatus[dongleStatus]);

        await _.exec("Dial", ["SIP/alice", "10"]);

    }
}

async function fromSip_(channel: AGIChannel): Promise<void> {

    console.log("FROM SIP");

    let _ = channel.relax;

    await _.answer();

    console.log(await _.streamFile("hello-world"));

    //exten = s,1,Dial(Dongle/${DONGLE}/${DEST_NUM})

}

*/
//# sourceMappingURL=main.js.map