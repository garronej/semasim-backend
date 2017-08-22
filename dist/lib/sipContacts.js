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
var runExclusive = require("run-exclusive");
var sipLibrary = require("./tools/sipLibrary");
var db = require("./dbInterface");
var gatewaySipProxy_1 = require("./gatewaySipProxy");
var backendSipApi = require("./backendSipApi");
var c = require("./_constants");
var _debug = require("debug");
var debug = _debug("_sipContacts");
var Contact;
(function (Contact) {
    function readPushInfos(contactOrContactUri) {
        var contactUri = (typeof contactOrContactUri === "string") ? contactOrContactUri : contactOrContactUri.uri;
        var params = sipLibrary.parseUri(contactUri).params;
        var pushType = params["pn-type"] || undefined;
        var pushToken = params["pn-tok"] || undefined;
        return { pushType: pushType, pushToken: pushToken };
    }
    Contact.readPushInfos = readPushInfos;
    function buildUaInstancePk(contact) {
        return {
            "dongle_imei": contact.endpoint,
            "instance_id": readInstanceId(contact)
        };
    }
    Contact.buildUaInstancePk = buildUaInstancePk;
    function buildValueOfUserAgentField(endpoint, instanceId, realUserAgent) {
        var wrap = { endpoint: endpoint, instanceId: instanceId, realUserAgent: realUserAgent };
        return (new Buffer(JSON.stringify(wrap), "utf8")).toString("base64");
    }
    Contact.buildValueOfUserAgentField = buildValueOfUserAgentField;
    function decodeUserAgentFieldValue(contact) {
        return JSON.parse((new Buffer(contact.user_agent, "base64")).toString("utf8"));
    }
    function readInstanceId(contact) {
        return decodeUserAgentFieldValue(contact).instanceId;
    }
    Contact.readInstanceId = readInstanceId;
    function readUserAgent(contact) {
        return decodeUserAgentFieldValue(contact).realUserAgent;
    }
    Contact.readUserAgent = readUserAgent;
    function readFlowToken(contact) {
        return sipLibrary.parsePath(contact.path).pop().uri.params[c.flowTokenKey];
    }
    Contact.readFlowToken = readFlowToken;
    function readAstSocketSrcPort(contact) {
        if (!contact.path)
            return NaN;
        return sipLibrary.parsePath(contact.path)[0].uri.port;
    }
    Contact.readAstSocketSrcPort = readAstSocketSrcPort;
    function pretty(contact) {
        var parsedUri = sipLibrary.parseUri(contact.uri);
        var pnTok = parsedUri.params["pn-tok"];
        if (pnTok)
            parsedUri.params["pn-tok"] = pnTok.substring(0, 3) + "..." + pnTok.substring(pnTok.length - 3);
        return {
            "uri": sipLibrary.stringifyUri(parsedUri),
            "path": contact.path,
            "instanceId": readInstanceId(contact),
            "userAgent": readUserAgent(contact)
        };
    }
    Contact.pretty = pretty;
})(Contact = exports.Contact || (exports.Contact = {}));
function getContactFromAstSocketSrcPort(astSocketSrcPort) {
    var _this = this;
    var returned = false;
    return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
        var contacts, contacts_1, contacts_1_1, contact, e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    getEvtNewContact().waitFor(function (contact) { return Contact.readAstSocketSrcPort(contact) === astSocketSrcPort; }, 1200).then(function (contact) {
                        if (returned)
                            return;
                        returned = true;
                        resolve(contact);
                    }).catch(function () {
                        if (returned)
                            return;
                        returned = true;
                        resolve(undefined);
                    });
                    return [4 /*yield*/, db.asterisk.queryContacts()];
                case 1:
                    contacts = _b.sent();
                    if (returned)
                        return [2 /*return*/];
                    try {
                        for (contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next(); !contacts_1_1.done; contacts_1_1 = contacts_1.next()) {
                            contact = contacts_1_1.value;
                            if (Contact.readAstSocketSrcPort(contact) !== astSocketSrcPort)
                                continue;
                            returned = true;
                            resolve(contact);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (contacts_1_1 && !contacts_1_1.done && (_a = contacts_1.return)) _a.call(contacts_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return [2 /*return*/];
            }
        });
    }); });
}
exports.getContactFromAstSocketSrcPort = getContactFromAstSocketSrcPort;
function wakeUpAllContacts(endpoint, timeout, evtTracer) {
    var _this = this;
    return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
        var contactsOfEndpoint, reachableContactMap, resolver, timer, taskArray, _loop_1, contactsOfEndpoint_1, contactsOfEndpoint_1_1, contact, e_2, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db.asterisk.queryContacts()];
                case 1:
                    contactsOfEndpoint = (_b.sent())
                        .filter(function (contact) { return contact.endpoint === endpoint; });
                    reachableContactMap = new Map();
                    resolver = function () {
                        var reachableContacts = [];
                        var unreachableContacts = [];
                        try {
                            for (var _a = __values(reachableContactMap.keys()), _b = _a.next(); !_b.done; _b = _a.next()) {
                                var keyContact = _b.value;
                                var reachableContact = reachableContactMap.get(keyContact);
                                if (reachableContact)
                                    reachableContacts.push(reachableContact);
                                else
                                    unreachableContacts.push(keyContact);
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                        resolve({ reachableContacts: reachableContacts, unreachableContacts: unreachableContacts });
                        var e_3, _c;
                    };
                    timer = undefined;
                    if (timeout) {
                        timer = setTimeout(function () {
                            if (!reachableContactMap.size)
                                return;
                            resolver();
                        }, timeout);
                    }
                    taskArray = [];
                    _loop_1 = function (contact) {
                        taskArray.push(new Promise(function (resolve) {
                            return wakeUpContact(contact).then(function (reachableContact) {
                                if (reachableContact) {
                                    reachableContactMap.set(contact, reachableContact);
                                    if (evtTracer)
                                        evtTracer.post({ "type": "reachableContact", "contact": reachableContact });
                                }
                                resolve();
                            });
                        }));
                    };
                    try {
                        for (contactsOfEndpoint_1 = __values(contactsOfEndpoint), contactsOfEndpoint_1_1 = contactsOfEndpoint_1.next(); !contactsOfEndpoint_1_1.done; contactsOfEndpoint_1_1 = contactsOfEndpoint_1.next()) {
                            contact = contactsOfEndpoint_1_1.value;
                            _loop_1(contact);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (contactsOfEndpoint_1_1 && !contactsOfEndpoint_1_1.done && (_a = contactsOfEndpoint_1.return)) _a.call(contactsOfEndpoint_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    return [4 /*yield*/, Promise.all(taskArray)];
                case 2:
                    _b.sent();
                    if (timer)
                        clearTimeout(timer);
                    resolver();
                    if (evtTracer)
                        evtTracer.post({ "type": "completed" });
                    return [2 /*return*/];
            }
        });
    }); });
}
exports.wakeUpAllContacts = wakeUpAllContacts;
function wakeUpContact(contact, timeout, evtTracer) {
    return __awaiter(this, void 0, void 0, function () {
        var statusMessage, _a, newlyRegisteredContact, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (timeout === undefined)
                        timeout = 30000;
                    return [4 /*yield*/, backendSipApi.wakeUpUserAgent.run(contact)];
                case 1:
                    statusMessage = _b.sent();
                    if (evtTracer)
                        evtTracer.post(statusMessage);
                    _a = statusMessage;
                    switch (_a) {
                        case "REACHABLE": return [3 /*break*/, 2];
                        case "UNREACHABLE": return [3 /*break*/, 3];
                        case "PUSH_NOTIFICATION_SENT": return [3 /*break*/, 4];
                    }
                    return [3 /*break*/, 7];
                case 2: return [2 /*return*/, contact];
                case 3: return [2 /*return*/, null];
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, getEvtNewContact().waitFor(function (_a) {
                            var user_agent = _a.user_agent;
                            return user_agent === contact.user_agent;
                        }, timeout)];
                case 5:
                    newlyRegisteredContact = _b.sent();
                    return [2 /*return*/, newlyRegisteredContact];
                case 6:
                    error_1 = _b.sent();
                    return [2 /*return*/, null];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.wakeUpContact = wakeUpContact;
function destroyUselessAsteriskSockets() {
    return __awaiter(this, void 0, void 0, function () {
        var localPortsToKeep, destroyCount, _a, _b, socket, e_4_1, e_4, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, db.asterisk.queryContacts()];
                case 1:
                    localPortsToKeep = (_d.sent())
                        .map(function (contact) { return Contact.readAstSocketSrcPort(contact); });
                    destroyCount = 0;
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 7, 8, 9]);
                    return [4 /*yield*/, gatewaySipProxy_1.getAsteriskSockets()];
                case 3:
                    _a = __values.apply(void 0, [(_d.sent()).getAll()]), _b = _a.next();
                    _d.label = 4;
                case 4:
                    if (!!_b.done) return [3 /*break*/, 6];
                    socket = _b.value;
                    if (localPortsToKeep.indexOf(socket.localPort) < 0) {
                        destroyCount++;
                        socket.destroy();
                    }
                    _d.label = 5;
                case 5:
                    _b = _a.next();
                    return [3 /*break*/, 4];
                case 6: return [3 /*break*/, 9];
                case 7:
                    e_4_1 = _d.sent();
                    e_4 = { error: e_4_1 };
                    return [3 /*break*/, 9];
                case 8:
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_4) throw e_4.error; }
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/, destroyCount];
            }
        });
    });
}
var evtNewContact = undefined;
function getEvtNewContact() {
    var _this = this;
    if (evtNewContact)
        return evtNewContact;
    evtNewContact = new ts_events_extended_1.SyncEvent();
    chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.evt.attach(function (managerEvt) { return (managerEvt.event === "ContactStatus" &&
        managerEvt.contactstatus === "Created" &&
        managerEvt.uri); }, runExclusive.build(function (_a) {
        var endpointname = _a.endpointname, uri = _a.uri;
        return __awaiter(_this, void 0, void 0, function () {
            var contacts, newContact, oldContact;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.asterisk.queryContacts()];
                    case 1:
                        contacts = _a.sent();
                        newContact = contacts.filter(function (contact) { return contact.endpoint === endpointname && contact.uri === uri; }).pop();
                        if (!newContact) {
                            debug("No new contact as described");
                            return [2 /*return*/];
                        }
                        oldContact = contacts.filter(function (contact) {
                            return (contact !== newContact &&
                                Contact.readInstanceId(contact) === Contact.readInstanceId(newContact) &&
                                contact.endpoint === newContact.endpoint);
                        }).pop();
                        if (!(oldContact !== undefined)) return [3 /*break*/, 4];
                        debug("we had a contact for this UA, we delete it");
                        return [4 /*yield*/, db.asterisk.deleteContact(oldContact)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, destroyUselessAsteriskSockets()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        evtNewContact.post(newContact);
                        return [2 /*return*/];
                }
            });
        });
    }));
    return evtNewContact;
}
exports.getEvtNewContact = getEvtNewContact;
var evtExpiredContact = undefined;
function getEvtExpiredContact() {
    var _this = this;
    if (evtExpiredContact)
        return evtExpiredContact;
    evtExpiredContact = new ts_events_extended_1.SyncEvent();
    chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.evt.attach(function (managerEvt) { return (managerEvt.event === "ContactStatus" &&
        managerEvt.contactstatus === "Unknown" &&
        managerEvt.uri); }, function (_a) {
        var endpointname = _a.endpointname, uri = _a.uri;
        return __awaiter(_this, void 0, void 0, function () {
            var destroyCount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 1000); })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, db.asterisk.queryContacts()];
                    case 2:
                        if ((_a.sent())
                            .filter(function (contact) { return contact.endpoint === endpointname && contact.uri === uri; })
                            .length)
                            return [2 /*return*/];
                        return [4 /*yield*/, destroyUselessAsteriskSockets()];
                    case 3:
                        destroyCount = _a.sent();
                        if (destroyCount === 0)
                            return [2 /*return*/];
                        evtExpiredContact.post(uri);
                        return [2 /*return*/];
                }
            });
        });
    });
    return evtExpiredContact;
}
exports.getEvtExpiredContact = getEvtExpiredContact;
