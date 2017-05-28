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
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var ts_events_extended_1 = require("ts-events-extended");
var _debug = require("debug");
var debug = _debug("_pjsip/endpointsContacts");
function getContacts() {
    var _this = this;
    return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
        var ami, proxyEvt, actionId, contactsByEndpoint, evt, endpoint, concatContacts, contacts, out, _a, _b, endpoint, contacts, contacts_1, contacts_1_1, contact, status, e_1_1, e_2_1, e_2, _c, e_1, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
                    proxyEvt = ami.evt.createProxy();
                    ami.postAction({ "action": "PJSIPShowEndpoints" }).catch(function (error) {
                        proxyEvt.stopWaiting();
                        resolve({});
                    });
                    actionId = ami.lastActionId;
                    contactsByEndpoint = {};
                    _e.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 3];
                    return [4 /*yield*/, proxyEvt.waitFor(function (evt) { return evt.actionid === actionId; })];
                case 2:
                    evt = _e.sent();
                    if (evt.event === "EndpointListComplete")
                        return [3 /*break*/, 3];
                    endpoint = evt.objectname;
                    concatContacts = evt.contacts;
                    contacts = concatContacts.split(",");
                    contacts.pop();
                    contactsByEndpoint[endpoint] = contacts;
                    return [3 /*break*/, 1];
                case 3:
                    out = {};
                    _e.label = 4;
                case 4:
                    _e.trys.push([4, 15, 16, 17]);
                    _a = __values(Object.keys(contactsByEndpoint)), _b = _a.next();
                    _e.label = 5;
                case 5:
                    if (!!_b.done) return [3 /*break*/, 14];
                    endpoint = _b.value;
                    contacts = contactsByEndpoint[endpoint];
                    out[endpoint] = [];
                    _e.label = 6;
                case 6:
                    _e.trys.push([6, 11, 12, 13]);
                    contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next();
                    _e.label = 7;
                case 7:
                    if (!!contacts_1_1.done) return [3 /*break*/, 10];
                    contact = contacts_1_1.value;
                    return [4 /*yield*/, getContactStatus(contact)];
                case 8:
                    status = _e.sent();
                    if (!status)
                        return [3 /*break*/, 9];
                    out[endpoint].push({ contact: contact, status: status });
                    _e.label = 9;
                case 9:
                    contacts_1_1 = contacts_1.next();
                    return [3 /*break*/, 7];
                case 10: return [3 /*break*/, 13];
                case 11:
                    e_1_1 = _e.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 13];
                case 12:
                    try {
                        if (contacts_1_1 && !contacts_1_1.done && (_d = contacts_1.return)) _d.call(contacts_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 13:
                    _b = _a.next();
                    return [3 /*break*/, 5];
                case 14: return [3 /*break*/, 17];
                case 15:
                    e_2_1 = _e.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 17];
                case 16:
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 17:
                    resolve(out);
                    return [2 /*return*/];
            }
        });
    }); });
}
function getContactStatus(contact) {
    return __awaiter(this, void 0, void 0, function () {
        var output;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.runCliCommand("pjsip show contact " + contact)];
                case 1:
                    output = _a.sent();
                    try {
                        return [2 /*return*/, output
                                .split("\n")
                                .filter(function (line) { return line.match(/^[ \t]*Contact:/); })
                                .pop()
                                .match(/^[ \t]*Contact:[ \t]*[^ \t]+[ \t]*[0-9a-fA-F]+[ \t]*([^ \t]+).*$/)[1]];
                    }
                    catch (error) {
                        return [2 /*return*/, undefined];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function getAvailableContactsOfEndpoint(endpoint) {
    return __awaiter(this, void 0, void 0, function () {
        var contacts, availableContacts, contacts_2, contacts_2_1, _a, contact, status, e_3, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getContacts()];
                case 1:
                    contacts = (_c.sent())[endpoint] || [];
                    availableContacts = [];
                    try {
                        for (contacts_2 = __values(contacts), contacts_2_1 = contacts_2.next(); !contacts_2_1.done; contacts_2_1 = contacts_2.next()) {
                            _a = contacts_2_1.value, contact = _a.contact, status = _a.status;
                            if (status !== "Avail")
                                continue;
                            availableContacts.push(contact);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (contacts_2_1 && !contacts_2_1.done && (_b = contacts_2.return)) _b.call(contacts_2);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    return [2 /*return*/, availableContacts];
            }
        });
    });
}
exports.getAvailableContactsOfEndpoint = getAvailableContactsOfEndpoint;
var evtNewContact = undefined;
function getEvtNewContact() {
    if (evtNewContact)
        return evtNewContact;
    var out = new ts_events_extended_1.SyncEvent();
    var pendingRegistrations = new Set();
    chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.evt.attach(function (managerEvt) { return (managerEvt.event === "ContactStatus" &&
        managerEvt.contactstatus === "Created" &&
        managerEvt.uri); }, function callee(contactStatusEvt) {
        return __awaiter(this, void 0, void 0, function () {
            var endpointname, uri, endpoint, contact, match, port, rinstance, registrationId, status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        endpointname = contactStatusEvt.endpointname, uri = contactStatusEvt.uri;
                        endpoint = endpointname;
                        contact = endpoint + "/" + uri;
                        match = contact.match(/@[^:]+:([0-9]+).*rinstance=([^;]+)/);
                        port = parseInt(match[1]);
                        rinstance = match[2];
                        registrationId = port + "_" + rinstance;
                        if (pendingRegistrations.has(registrationId))
                            return [2 /*return*/];
                        pendingRegistrations.add(registrationId);
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 5000); })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, getContactStatus(contact)];
                    case 2:
                        status = _a.sent();
                        switch (status) {
                            case undefined:
                                break;
                            case "Avail":
                                pendingRegistrations.delete(registrationId);
                                out.post({ contact: contact, endpoint: endpoint });
                                break;
                            default:
                                console.log("Unexpected contact status " + status);
                                callee(contactStatusEvt);
                                break;
                        }
                        return [2 /*return*/];
                }
            });
        });
    });
    evtNewContact = out;
    return getEvtNewContact();
}
exports.getEvtNewContact = getEvtNewContact;
//# sourceMappingURL=endpointsContacts.js.map