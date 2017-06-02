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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
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
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var endpointsContacts_1 = require("./endpointsContacts");
var ts_events_extended_1 = require("ts-events-extended");
var js_base64_1 = require("js-base64");
var dbInterface_1 = require("./dbInterface");
var _debug = require("debug");
var debug = _debug("_pjsip/message");
function toSipHeaders(message_type, headers) {
    var appKeyword = "semasim";
    var sipHeaders = {};
    sipHeaders[appKeyword + "-message_type"] = message_type;
    try {
        for (var _a = __values(Object.keys(headers)), _b = _a.next(); !_b.done; _b = _a.next()) {
            var key = _b.value;
            sipHeaders[appKeyword + "-" + message_type + "-" + key] = headers[key];
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return sipHeaders;
    var e_1, _c;
}
function __sendMessage__(contacts, from, extraHeaders, message_type, params, payload_id) {
    return __awaiter(this, void 0, void 0, function () {
        var payloadSplit, headers, imei, name, contacts_1, contacts_1_1, contact, part_number, payloadPart, partHeader, body, e_2_1, e_2, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!contacts.length)
                        return [2 /*return*/];
                    payloadSplit = chan_dongle_extended_client_1.Ami.base64TextSplit(params.isHiddenPayload ? params.hidden_payload : params.payload);
                    headers = __assign({}, extraHeaders, { "payload_id": payload_id || chan_dongle_extended_client_1.Ami.generateUniqueActionId(), "parts_count": "" + payloadSplit.length });
                    if (!payload_id)
                        payload_id = chan_dongle_extended_client_1.Ami.generateUniqueActionId();
                    imei = contacts[0].match(/^([0-9]{15})\//)[1];
                    return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().getContactName(imei, from)];
                case 1:
                    name = _b.sent();
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 9, 10, 11]);
                    contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next();
                    _b.label = 3;
                case 3:
                    if (!!contacts_1_1.done) return [3 /*break*/, 8];
                    contact = contacts_1_1.value;
                    part_number = 1;
                    _b.label = 4;
                case 4:
                    if (!(part_number <= payloadSplit.length)) return [3 /*break*/, 7];
                    payloadPart = payloadSplit[part_number - 1];
                    partHeader = __assign({}, headers, { "part_number": "" + part_number });
                    body = void 0;
                    if (params.isHiddenPayload) {
                        partHeader = __assign({}, partHeader, { "base64_payload": payloadPart });
                        body = (part_number === payloadSplit.length) ? params.body : "";
                    }
                    else
                        body = js_base64_1.Base64.decode(payloadPart);
                    return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.messageSend("pjsip:" + contact, name ? "\"" + name + "\" <sip:" + from + "@semasim>" : from, body, toSipHeaders(message_type, partHeader))];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    part_number++;
                    return [3 /*break*/, 4];
                case 7:
                    contacts_1_1 = contacts_1.next();
                    return [3 /*break*/, 3];
                case 8: return [3 /*break*/, 11];
                case 9:
                    e_2_1 = _b.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 11];
                case 10:
                    try {
                        if (contacts_1_1 && !contacts_1_1.done && (_a = contacts_1.return)) _a.call(contacts_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function sendHiddenMessage(contacts, from, extraHeaders, hidden_payload, body, message_type, response_to_call_id) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, __sendMessage__(contacts, from, extraHeaders, message_type, { "isHiddenPayload": true, hidden_payload: hidden_payload, body: body }, response_to_call_id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.sendHiddenMessage = sendHiddenMessage;
function sendMessage(contacts, from, extraHeaders, payload, message_type, response_to_call_id) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, __sendMessage__(contacts, from, extraHeaders, message_type, { "isHiddenPayload": false, payload: payload }, response_to_call_id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.sendMessage = sendMessage;
function getActualTo(toUri) {
    return toUri.match(/^pjsip:([^@]+)/)[1];
}
function getEndpoint(from) {
    return from.match(/^.*<sip:([^@]+)/)[1];
}
var evtPacketSipMessage = undefined;
function getEvtPacketSipMessage() {
    if (evtPacketSipMessage)
        return evtPacketSipMessage;
    evtPacketSipMessage = new ts_events_extended_1.SyncEvent();
    getEvtPacketReassembled().attach(function (_a) {
        var to = _a.to, from = _a.from, headers = _a.headers, body = _a.body;
        var packet = {
            "to": getActualTo(to),
            "from_endpoint": getEndpoint(from),
            headers: headers,
            body: body
        };
        evtPacketSipMessage.post(packet);
    });
    return evtPacketSipMessage;
}
exports.getEvtPacketSipMessage = getEvtPacketSipMessage;
function getEvtPacketReassembled() {
    var _this = this;
    var evt = new ts_events_extended_1.SyncEvent();
    var evtPacketWithExtraHeaders = getEvtPacketWithExtraHeaders();
    evtPacketWithExtraHeaders.attach(function (_a) {
        var to = _a.to, from = _a.from, headers = _a.headers, body = _a.body;
        return __awaiter(_this, void 0, void 0, function () {
            var payload_id, parts_count, part_number, restHeaders, packet, bodyParts, _a, headers_1, body_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        payload_id = headers.payload_id, parts_count = headers.parts_count, part_number = headers.part_number, restHeaders = __rest(headers, ["payload_id", "parts_count", "part_number"]);
                        packet = {
                            to: to, from: from,
                            "headers": restHeaders
                        };
                        bodyParts = [];
                        bodyParts[part_number] = body;
                        _b.label = 1;
                    case 1:
                        if (!(bodyParts.filter(function (v) { return v; }).length !== parseInt(parts_count))) return [3 /*break*/, 3];
                        return [4 /*yield*/, evtPacketWithExtraHeaders.waitFor(function (newPacket) { return (newPacket.to === to &&
                                newPacket.from === from &&
                                newPacket.headers.payload_id === payload_id); })];
                    case 2:
                        _a = _b.sent(), headers_1 = _a.headers, body_1 = _a.body;
                        bodyParts[headers_1.part_number] = body_1;
                        return [3 /*break*/, 1];
                    case 3:
                        packet.body = bodyParts.join("");
                        evt.post(packet);
                        return [2 /*return*/];
                }
            });
        });
    });
    return evt;
}
function getEvtPacketWithExtraHeaders() {
    var evt = new ts_events_extended_1.SyncEvent();
    getEvtPacketRaw().attach(function (packetRaw) {
        var mainBody = js_base64_1.Base64.decode(packetRaw.base64_body);
        var packet = {
            "to": packetRaw.to,
            "from": packetRaw.from,
            "headers": {
                "call_id": packetRaw.call_id,
                "payload_id": "" + undefined,
                "parts_count": "" + 1,
                "part_number": "" + 1
            },
            "body": mainBody
        };
        try {
            var _a = JSON.parse(mainBody), body = _a.body, extra_headers = __rest(_a, ["body"]);
            if (!body)
                throw new Error();
            packet.body = body;
            packet.headers = __assign({}, packet.headers, extra_headers);
        }
        catch (error) { }
        evt.post(packet);
    });
    return evt;
}
function getEvtPacketRaw() {
    var _this = this;
    var evt = new ts_events_extended_1.SyncEvent();
    var ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
    initDialplan().then(function () {
        ami.evt.attach(function (_a) {
            var event = _a.event, context = _a.context, priority = _a.priority;
            return (event === "Newexten" &&
                context === dbInterface_1.messageContext &&
                priority === "1");
        }, function (newExten) { return __awaiter(_this, void 0, void 0, function () {
            var packet, uniqueId, application, appdata, match, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        packet = {};
                        uniqueId = newExten.uniqueid;
                        _b.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 3];
                        application = newExten.application, appdata = newExten.appdata;
                        if (application === "Hangup")
                            return [3 /*break*/, 3];
                        match = void 0;
                        if (application === "NoOp" &&
                            (match = appdata.match(/^([^=]+)===(.*)$/)))
                            packet[match[1]] = match[2];
                        return [4 /*yield*/, ami.evt.waitFor(function (_a) {
                                var uniqueid = _a.uniqueid;
                                return uniqueid === uniqueId;
                            })];
                    case 2:
                        newExten = _b.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        if (!(!packet.base64_body && packet.content_length)) return [3 /*break*/, 5];
                        _a = sendMessage;
                        return [4 /*yield*/, endpointsContacts_1.getAvailableContactsOfEndpoint(getEndpoint(packet.from))];
                    case 4:
                        _a.apply(void 0, [_b.sent(),
                            getActualTo(packet.to),
                            {},
                            "TOO LONG!",
                            "error",
                            packet.call_id]);
                        return [2 /*return*/];
                    case 5:
                        evt.post(packet);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    return evt;
}
function initDialplan() {
    return __awaiter(this, void 0, void 0, function () {
        var ami, arrAppData, matchAllExt, priority, arrAppData_1, arrAppData_1_1, appData, e_3_1, e_3, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
                    arrAppData = [
                        "to===${MESSAGE(to)}",
                        "from===${MESSAGE(from)}",
                        "call_id===${MESSAGE_DATA(Call-ID)}",
                        "content_length===${MESSAGE_DATA(Content-Length)}",
                        "base64_body===${BASE64_ENCODE(${MESSAGE(body)})}"
                    ];
                    matchAllExt = "_.";
                    return [4 /*yield*/, ami.dialplanExtensionRemove(matchAllExt, dbInterface_1.messageContext)];
                case 1:
                    _b.sent();
                    priority = 1;
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 7, 8, 9]);
                    arrAppData_1 = __values(arrAppData), arrAppData_1_1 = arrAppData_1.next();
                    _b.label = 3;
                case 3:
                    if (!!arrAppData_1_1.done) return [3 /*break*/, 6];
                    appData = arrAppData_1_1.value;
                    return [4 /*yield*/, ami.dialplanExtensionAdd(dbInterface_1.messageContext, matchAllExt, priority++, "NoOp", appData)];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    arrAppData_1_1 = arrAppData_1.next();
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 9];
                case 7:
                    e_3_1 = _b.sent();
                    e_3 = { error: e_3_1 };
                    return [3 /*break*/, 9];
                case 8:
                    try {
                        if (arrAppData_1_1 && !arrAppData_1_1.done && (_a = arrAppData_1.return)) _a.call(arrAppData_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                    return [7 /*endfinally*/];
                case 9: 
                //await ami.addDialplanExtension(messageContext, matchAllExt, priority++, "DumpChan");
                return [4 /*yield*/, ami.dialplanExtensionAdd(dbInterface_1.messageContext, matchAllExt, priority++, "Hangup")];
                case 10:
                    //await ami.addDialplanExtension(messageContext, matchAllExt, priority++, "DumpChan");
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/* let arrAppData = [
        ...[
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
            "MESSAGE_DATA(Content-Length)",
            "MESSAGE_DATA(True-Content-Type)"
        ].map(variable => `${variable}===\${${variable}}`),
        `MESSAGE(base-64-encoded-body)===\${BASE64_ENCODE(\${MESSAGE(body)})}`
    ];
    */ 
//# sourceMappingURL=message.js.map