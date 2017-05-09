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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var ts_exec_queue_1 = require("ts-exec-queue");
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var mysql = require("mysql");
var ts_events_extended_1 = require("ts-events-extended");
var dbParams = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "abcde12345"
};
var connection = mysql.createConnection(__assign({}, dbParams, { "database": "asterisk", "multipleStatements": true }));
function query(sql, values) {
    return new Promise(function (resolve, reject) {
        var r = connection.query(sql, values || [], function (err, results) { return err ? reject(err) : resolve(results); });
        //console.log(r.sql);
    });
}
var isInit = false;
var authId = "semasim-default-auth";
function init() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                //TODO init sip stack.
                //Delete all contacts
                return [4 /*yield*/, query([
                        "INSERT INTO `ps_auths`",
                        "(`id`, `auth_type`, `username`, `password`) VALUES (?, ?, ?, ?)",
                        "ON DUPLICATE KEY UPDATE",
                        "`auth_type`= VALUES(`auth_type`), `username`= VALUES(`username`), `password`= VALUES(`password`)"
                    ].join("\n"), [
                        authId, "userpass", "admin", "admin"
                    ])];
                case 1:
                    //TODO init sip stack.
                    //Delete all contacts
                    _a.sent();
                    isInit = true;
                    return [2 /*return*/];
            }
        });
    });
}
var cluster = {};
var pjsip;
(function (pjsip) {
    var _this = this;
    pjsip.addEndpoint = ts_exec_queue_1.execQueue(cluster, "DB_WRITE", function (imei, callback) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("addEndpoint", imei);
                    if (!!isInit) return [3 /*break*/, 2];
                    return [4 /*yield*/, init()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: 
                /*
    
                let results = await query("SELECT `id` FROM `ps_endpoints` WHERE `id`= ?", [imei]);
    
                if (results.length)
                    return callback!();
                */
                return [4 /*yield*/, query([
                        "INSERT INTO `ps_aors`",
                        "(`id`,`max_contacts`,`qualify_frequency`) VALUES (?, ?, ?)",
                        "ON DUPLICATE KEY UPDATE",
                        "`max_contacts`= VALUES(`max_contacts`),",
                        "`qualify_frequency`= VALUES(`qualify_frequency`)",
                        ";",
                        "INSERT INTO `ps_endpoints`",
                        "(`id`,`disallow`,`allow`,`context`,`message_context`, `aors`, `auth`) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        "ON DUPLICATE KEY UPDATE",
                        "`disallow`= VALUES(`disallow`),",
                        "`allow`= VALUES(`allow`),",
                        "`context`= VALUES(`context`),",
                        "`message_context`= VALUES(`message_context`),",
                        "`aors`= VALUES(`aors`),",
                        "`auth`= VALUES(`auth`)"
                    ].join("\n"), [
                        imei, 12, 5,
                        imei, "all", "alaw,ulaw", "from-sip-call", "from-sip-message", imei, authId
                    ])];
                case 3:
                    /*
        
                    let results = await query("SELECT `id` FROM `ps_endpoints` WHERE `id`= ?", [imei]);
        
                    if (results.length)
                        return callback!();
                    */
                    _a.sent();
                    return [2 /*return*/, callback()];
            }
        });
    }); });
    function getContacts() {
        var _this = this;
        return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            var ami, proxyEvt, actionId, contactsByEndpoint, evt, endpoint, concatContacts, contacts, out, _i, _a, endpoint, contacts, _b, contacts_1, contact, status_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        ami = chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami;
                        proxyEvt = ami.evt.createProxy();
                        ami.postAction({ "action": "PJSIPShowEndpoints" }).catch(function (error) {
                            proxyEvt.stopWaiting();
                            resolve({});
                        });
                        actionId = ami.lastActionId;
                        contactsByEndpoint = {};
                        _c.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 3];
                        return [4 /*yield*/, proxyEvt.waitFor(function (evt) { return evt.actionid === actionId; })];
                    case 2:
                        evt = _c.sent();
                        console.log({ evt: evt });
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
                        _i = 0, _a = Object.keys(contactsByEndpoint);
                        _c.label = 4;
                    case 4:
                        if (!(_i < _a.length)) return [3 /*break*/, 9];
                        endpoint = _a[_i];
                        contacts = contactsByEndpoint[endpoint];
                        out[endpoint] = [];
                        _b = 0, contacts_1 = contacts;
                        _c.label = 5;
                    case 5:
                        if (!(_b < contacts_1.length)) return [3 /*break*/, 8];
                        contact = contacts_1[_b];
                        return [4 /*yield*/, getContactStatus(contact)];
                    case 6:
                        status_1 = _c.sent();
                        if (!status_1)
                            return [3 /*break*/, 7];
                        out[endpoint].push({ contact: contact, status: status_1 });
                        _c.label = 7;
                    case 7:
                        _b++;
                        return [3 /*break*/, 5];
                    case 8:
                        _i++;
                        return [3 /*break*/, 4];
                    case 9:
                        resolve(out);
                        return [2 /*return*/];
                }
            });
        }); });
    }
    pjsip.getContacts = getContacts;
    function getContactStatus(contact) {
        return __awaiter(this, void 0, void 0, function () {
            var resp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.postAction({
                            "action": "Command",
                            "Command": "pjsip show contact " + contact
                        })];
                    case 1:
                        resp = _a.sent();
                        try {
                            return [2 /*return*/, resp.content.split("\n")[7].match(/^[ \t]*Contact:[ \t]*[^ \t]+[ \t]*[0-9a-fA-F]+[ \t]*([^ \t]+).*$/)[1]];
                        }
                        catch (error) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    pjsip.getContactStatus = getContactStatus;
    function getAvailableEndpointContacts(endpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var contacts, availableContacts, _i, contacts_2, _a, contact, status_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getContacts()];
                    case 1:
                        contacts = (_b.sent())[endpoint] || [];
                        availableContacts = [];
                        for (_i = 0, contacts_2 = contacts; _i < contacts_2.length; _i++) {
                            _a = contacts_2[_i], contact = _a.contact, status_2 = _a.status;
                            if (status_2 !== "Avail")
                                continue;
                            availableContacts.push(contact);
                        }
                        return [2 /*return*/, availableContacts];
                }
            });
        });
    }
    pjsip.getAvailableEndpointContacts = getAvailableEndpointContacts;
    pjsip.evtNewContact = new ts_events_extended_1.SyncEvent();
})(pjsip = exports.pjsip || (exports.pjsip = {}));
pjsip.getContacts().then(function (contacts) { return console.log(JSON.stringify(contacts, null, 2)); });
/*
DongleExtendedClient.localhost().ami.evt.attach(managerEvt => {
    if (managerEvt.event === "UserEvent") return;

    console.log({ managerEvt });
});
*/
chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.evt.attach(function (managerEvt) { return managerEvt.event === "ContactStatus"; }, function (contactStatus) { return console.log({ contactStatus: contactStatus }); });
/*
DongleExtendedClient.localhost().ami.evt.attach(
    managerEvt => managerEvt.event === "PeerStatus",
    peerStatusEvt => console.log( { peerStatusEvt })
);


DongleExtendedClient.localhost().ami.evt.attach(
    managerEvt => managerEvt.event === "DeviceStateChange",
    deviceStatusEvt => console.log( { deviceStatusEvt })
);
*/
chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.evt.attach(function (managerEvt) { return managerEvt.event === "ChallengeSent"; }, function (challengeSendEvt) { return __awaiter(_this, void 0, void 0, function () {
    var timeoutError_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, chan_dongle_extended_client_1.DongleExtendedClient.localhost().ami.evt.waitFor(function (managerEvt) { return (managerEvt.event === "SuccessfulAuth" &&
                        challengeSendEvt.sessionid === managerEvt.sessionid); })];
            case 1:
                _a.sent();
                console.log(challengeSendEvt.accountid + " successfully authenticated");
                return [3 /*break*/, 3];
            case 2:
                timeoutError_1 = _a.sent();
                console.log(challengeSendEvt.accountid + " authentication failed");
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
//# sourceMappingURL=pjsip.js.map