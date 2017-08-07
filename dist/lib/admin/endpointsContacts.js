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
var sip = require("../sipProxy/sip");
var outbound_1 = require("../sipProxy/outbound");
var dbInterface = require("./dbInterface");
var inbound_1 = require("../sipProxy/inbound");
var outboundApi = require("../sipProxy/outbound.api");
var _debug = require("debug");
var debug = _debug("_admin/endpointsContacts");
var Contact;
(function (Contact) {
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
        return sip.parsePath(contact.path).pop().uri.params[outbound_1.flowTokenKey];
    }
    Contact.readFlowToken = readFlowToken;
    function readAstSocketSrcPort(contact) {
        if (!contact.path)
            return NaN;
        return sip.parsePath(contact.path)[0].uri.port;
    }
    Contact.readAstSocketSrcPort = readAstSocketSrcPort;
    function pretty(contact) {
        var parsedUri = sip.parseUri(contact.uri);
        var pnTok = parsedUri.params["pn-tok"];
        if (pnTok)
            parsedUri.params["pn-tok"] = pnTok.substring(0, 3) + "..." + pnTok.substring(pnTok.length - 3);
        return {
            "uri": sip.stringifyUri(parsedUri),
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
                    return [4 /*yield*/, dbInterface.dbAsterisk.queryContacts()];
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
function wakeUpAllContacts(endpoint, timeout) {
    var _this = this;
    var evtReachableContact = new ts_events_extended_1.SyncEvent();
    var all = new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
        var contactsOfEndpoint, reachableContactMap, resolver, timer, taskArray, _loop_1, contactsOfEndpoint_1, contactsOfEndpoint_1_1, contact, e_2, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, dbInterface.dbAsterisk.queryContacts()];
                case 1:
                    contactsOfEndpoint = (_b.sent()).filter(function (contact) { return contact.endpoint === endpoint; });
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
                                reachableContactMap.set(contact, reachableContact);
                                evtReachableContact.post(reachableContact);
                                resolve();
                            }).catch(function () { return resolve(); });
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
                    evtReachableContact.post("COMPLETED");
                    return [2 /*return*/];
            }
        });
    }); });
    return { all: all, evtReachableContact: evtReachableContact };
}
exports.wakeUpAllContacts = wakeUpAllContacts;
function wakeUpContact(contact, timeout) {
    return __awaiter(this, void 0, void 0, function () {
        var statusMessage, _a, newlyRegisteredContact, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, outboundApi.wakeUpUserAgent.run(contact)];
                case 1:
                    statusMessage = _b.sent();
                    _a = statusMessage;
                    switch (_a) {
                        case "REACHABLE": return [3 /*break*/, 2];
                        case "FAIL": return [3 /*break*/, 3];
                        case "PUSH_NOTIFICATION_SENT": return [3 /*break*/, 4];
                    }
                    return [3 /*break*/, 7];
                case 2:
                    debug("Directly reachable");
                    return [2 /*return*/, contact];
                case 3:
                    debug("WebAPI fail");
                    throw new Error("webApi FAIL");
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, getEvtNewContact().waitFor(function (_a) {
                            var user_agent = _a.user_agent;
                            return user_agent === contact.user_agent;
                        }, timeout || 30000)];
                case 5:
                    newlyRegisteredContact = _b.sent();
                    debug("Contact woke up after push notification");
                    return [2 /*return*/, newlyRegisteredContact];
                case 6:
                    error_1 = _b.sent();
                    throw new Error("Timeout new register after push notification");
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.wakeUpContact = wakeUpContact;
var evtNewContact = undefined;
function getEvtNewContact() {
    var _this = this;
    if (evtNewContact)
        return evtNewContact;
    evtNewContact = new ts_events_extended_1.SyncEvent();
    chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.evt.attach(function (managerEvt) { return (managerEvt.event === "ContactStatus" &&
        managerEvt.contactstatus === "Created" &&
        managerEvt.uri); }, function (_a) {
        var endpointname = _a.endpointname, uri = _a.uri;
        return __awaiter(_this, void 0, void 0, function () {
            var contacts, newContact, contactsToDelete, _loop_2, contactsToDelete_1, contactsToDelete_1_1, contactToDelete, e_4_1, e_4, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, dbInterface.dbAsterisk.queryContacts()];
                    case 1:
                        contacts = _b.sent();
                        newContact = contacts.filter(function (contact) { return contact.endpoint === endpointname && contact.uri === uri; })[0];
                        contactsToDelete = contacts.filter(function (contact) { return contact !== newContact && contact.user_agent === newContact.user_agent; });
                        _loop_2 = function (contactToDelete) {
                            var astSocketSrcPort;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        debug("we had a contact for this UA, we delete it", Contact.pretty(contactToDelete));
                                        return [4 /*yield*/, dbInterface.dbAsterisk.deleteContact(contactToDelete.id)];
                                    case 1:
                                        _a.sent();
                                        astSocketSrcPort = Contact.readAstSocketSrcPort(contactToDelete);
                                        inbound_1.asteriskSockets.getAll().filter(function (_a) {
                                            var localPort = _a.localPort;
                                            return localPort === astSocketSrcPort;
                                        }).map(function (asteriskSocket) { return asteriskSocket.destroy(); });
                                        return [2 /*return*/];
                                }
                            });
                        };
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 7, 8, 9]);
                        contactsToDelete_1 = __values(contactsToDelete), contactsToDelete_1_1 = contactsToDelete_1.next();
                        _b.label = 3;
                    case 3:
                        if (!!contactsToDelete_1_1.done) return [3 /*break*/, 6];
                        contactToDelete = contactsToDelete_1_1.value;
                        return [5 /*yield**/, _loop_2(contactToDelete)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        contactsToDelete_1_1 = contactsToDelete_1.next();
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_4_1 = _b.sent();
                        e_4 = { error: e_4_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (contactsToDelete_1_1 && !contactsToDelete_1_1.done && (_a = contactsToDelete_1.return)) _a.call(contactsToDelete_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                        return [7 /*endfinally*/];
                    case 9:
                        evtNewContact.post(newContact);
                        return [2 /*return*/];
                }
            });
        });
    });
    return evtNewContact;
}
exports.getEvtNewContact = getEvtNewContact;
