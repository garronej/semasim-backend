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
var _this = this;
exports.__esModule = true;
var api_1 = require("../../../api");
var Types = api_1.declaration.Types;
var ButtonBar_1 = require("./ButtonBar");
var SimRow_1 = require("./SimRow");
var registeringProcess = require("./registeringProcess");
var validateSharingRequestProcess = require("./validateSharingRequestProcess");
var bootbox = global["bootbox"];
function loadMainWidget() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var useableUserSims, structure, buttonBar, simRows, _loop_1, useableUserSims_1, useableUserSims_1_1, userSim, e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, registeringProcess.start()];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, validateSharingRequestProcess.start()];
                case 2:
                    useableUserSims = _b.sent();
                    if (!useableUserSims.length) {
                        return [2 /*return*/];
                    }
                    structure = $(require("../templates/wrapper.html"));
                    $("#page-payload").html("").append(structure);
                    buttonBar = new ButtonBar_1.ButtonBar();
                    structure.find("#_1").append(buttonBar.structure);
                    simRows = [];
                    _loop_1 = function (userSim) {
                        var simRow = new SimRow_1.SimRow(userSim);
                        structure.find("#_1").append(simRow.structure);
                        simRows.push(simRow);
                        simRow.evtSelected.attach(function () {
                            if (buttonBar.state.isSimRowSelected) {
                                simRows.find(function (simRow_) { return (simRow_ !== simRow &&
                                    simRow_.isSelected); }).unselect();
                            }
                            buttonBar.setState({
                                "isSimRowSelected": true,
                                "isSimSharable": Types.UserSim.Owned.match(userSim)
                            });
                        });
                    };
                    try {
                        for (useableUserSims_1 = __values(useableUserSims), useableUserSims_1_1 = useableUserSims_1.next(); !useableUserSims_1_1.done; useableUserSims_1_1 = useableUserSims_1.next()) {
                            userSim = useableUserSims_1_1.value;
                            _loop_1(userSim);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (useableUserSims_1_1 && !useableUserSims_1_1.done && (_a = useableUserSims_1["return"])) _a.call(useableUserSims_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    buttonBar.evtClickDetail.attach(function () {
                        try {
                            for (var simRows_1 = __values(simRows), simRows_1_1 = simRows_1.next(); !simRows_1_1.done; simRows_1_1 = simRows_1.next()) {
                                var simRow = simRows_1_1.value;
                                if (simRow.isSelected) {
                                    simRow.setDetailsVisibility("SHOWN");
                                }
                                else {
                                    simRow.setVisibility("HIDDEN");
                                }
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (simRows_1_1 && !simRows_1_1.done && (_a = simRows_1["return"])) _a.call(simRows_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        var e_2, _a;
                    });
                    buttonBar.evtClickBack.attach(function () {
                        try {
                            for (var simRows_2 = __values(simRows), simRows_2_1 = simRows_2.next(); !simRows_2_1.done; simRows_2_1 = simRows_2.next()) {
                                var simRow = simRows_2_1.value;
                                if (simRow.isSelected) {
                                    simRow.setDetailsVisibility("HIDDEN");
                                }
                                else {
                                    simRow.setVisibility("SHOWN");
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (simRows_2_1 && !simRows_2_1.done && (_a = simRows_2["return"])) _a.call(simRows_2);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                        var e_3, _a;
                    });
                    buttonBar.evtClickDelete.attach(function () { return __awaiter(_this, void 0, void 0, function () {
                        var userSim, shouldProceed;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    userSim = simRows.find(function (_a) {
                                        var isSelected = _a.isSelected;
                                        return isSelected;
                                    }).userSim;
                                    return [4 /*yield*/, new Promise(function (resolve) { return bootbox.confirm({
                                            "title": "Unregister SIM",
                                            "message": "Do you really want to unregister " + userSim.friendlyName + "?",
                                            callback: function (result) { return resolve(result); }
                                        }); })];
                                case 1:
                                    shouldProceed = _a.sent();
                                    if (!shouldProceed) return [3 /*break*/, 3];
                                    return [4 /*yield*/, api_1.client.unregisterSim(userSim.sim.imsi)];
                                case 2:
                                    _a.sent();
                                    buttonBar.evtClickRefresh.post();
                                    _a.label = 3;
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    buttonBar.evtClickRename.attach(function () { return __awaiter(_this, void 0, void 0, function () {
                        var userSim, friendlyNameSubmitted;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    userSim = simRows.find(function (_a) {
                                        var isSelected = _a.isSelected;
                                        return isSelected;
                                    }).userSim;
                                    return [4 /*yield*/, new Promise(function (resolve) { return bootbox.prompt({
                                            "title": "Friendly name for this sim?",
                                            "value": userSim.friendlyName,
                                            "callback": function (result) { return resolve(result); }
                                        }); })];
                                case 1:
                                    friendlyNameSubmitted = _a.sent();
                                    if (!friendlyNameSubmitted) return [3 /*break*/, 3];
                                    return [4 /*yield*/, api_1.client.setSimFriendlyName(userSim.sim.imsi, friendlyNameSubmitted)];
                                case 2:
                                    _a.sent();
                                    buttonBar.evtClickRefresh.post();
                                    _a.label = 3;
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    buttonBar.evtClickRefresh.attach(function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    structure.remove();
                                    return [4 /*yield*/, loadMainWidget()];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
            }
        });
    });
}
$(document).ready(function () {
    $("#logout").click(function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api_1.client.logoutUser()];
                case 1:
                    _a.sent();
                    window.location.href = "/login";
                    return [2 /*return*/];
            }
        });
    }); });
    $("#jumbotron-refresh").click(function () { return loadMainWidget(); });
    loadMainWidget();
});
