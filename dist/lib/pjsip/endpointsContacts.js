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
var dbInterface = require("./dbInterface");
var inbound_1 = require("../sipProxy/inbound");
var _debug = require("debug");
var debug = _debug("_pjsip/endpointsContacts");
function readInboundLocalPort(contact) {
    if (!contact.path)
        return NaN;
    return sip.parseUri(contact.path.match(/^<([^>]+)>/)[1]).port;
}
exports.readInboundLocalPort = readInboundLocalPort;
function getContactFromInboundLocalPort(asteriskSocketLocalPort) {
    var _this = this;
    var returned = false;
    return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
        var contacts, contacts_1, contacts_1_1, contact, e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    getEvtNewContact().waitFor(function (contact) { return readInboundLocalPort(contact) === asteriskSocketLocalPort; }, 1200).then(function (contact) {
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
                    return [4 /*yield*/, dbInterface.queryContacts()];
                case 1:
                    contacts = _b.sent();
                    if (returned)
                        return [2 /*return*/];
                    try {
                        for (contacts_1 = __values(contacts), contacts_1_1 = contacts_1.next(); !contacts_1_1.done; contacts_1_1 = contacts_1.next()) {
                            contact = contacts_1_1.value;
                            if (readInboundLocalPort(contact) !== asteriskSocketLocalPort)
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
exports.getContactFromInboundLocalPort = getContactFromInboundLocalPort;
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
            var contacts, newContact, contactsToDelete, _loop_1, contactsToDelete_1, contactsToDelete_1_1, contactToDelete, e_2_1, e_2, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, dbInterface.queryContacts()];
                    case 1:
                        contacts = _b.sent();
                        newContact = contacts.filter(function (contact) { return contact.endpoint === endpointname && contact.uri === uri; })[0];
                        contactsToDelete = contacts.filter(function (contact) { return contact !== newContact && contact.user_agent === newContact.user_agent; });
                        _loop_1 = function (contactToDelete) {
                            var inboundLocalPort;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        debug("we have other socket for the same endpoint+client", { contactToDelete: contactToDelete });
                                        return [4 /*yield*/, dbInterface.deleteContact(contactToDelete.id)];
                                    case 1:
                                        _a.sent();
                                        inboundLocalPort = readInboundLocalPort(contactToDelete);
                                        inbound_1.asteriskSockets.getAll().filter(function (_a) {
                                            var localPort = _a.localPort;
                                            return localPort === inboundLocalPort;
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
                        return [5 /*yield**/, _loop_1(contactToDelete)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        contactsToDelete_1_1 = contactsToDelete_1.next();
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_2_1 = _b.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (contactsToDelete_1_1 && !contactsToDelete_1_1.done && (_a = contactsToDelete_1.return)) _a.call(contactsToDelete_1);
                        }
                        finally { if (e_2) throw e_2.error; }
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
