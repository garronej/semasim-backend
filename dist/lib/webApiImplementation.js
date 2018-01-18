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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var chan_dongle_extended_client_1 = require("chan-dongle-extended-client");
var frontend_1 = require("../frontend");
var db = require("./db");
var sipProxy = require("./sipProxy");
var sipApiGateway = require("./sipApiGatewayClientImplementation");
var sipApiServer = require("./sipApiBackendServerImplementation");
var utils = require("./utils");
var _constants_1 = require("./_constants");
var html_entities = require("html-entities");
var entities = new html_entities.XmlEntities;
var _debug = require("debug");
var debug = _debug("_webApiImplementation");
exports.handlers = {};
(function () {
    var methodName = frontend_1.webApiDeclaration.registerUser.methodName;
    exports.handlers[methodName] = {
        "needAuth": false,
        "contentType": "application/json",
        "sanityChecks": function (params) { return (params instanceof Object &&
            typeof params.email === "string" &&
            params.email.match(_constants_1.c.regExpEmail) !== null &&
            typeof params.password === "string" &&
            params.password.match(_constants_1.c.regExpPassword) !== null); },
        "handler": function (params) { return __awaiter(_this, void 0, void 0, function () {
            var email, password, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = params.email, password = params.password;
                        return [4 /*yield*/, db.createUserAccount(email, password)];
                    case 1:
                        user = _a.sent();
                        return [2 /*return*/, user ? "CREATED" : "EMAIL NOT AVAILABLE"];
                }
            });
        }); }
    };
})();
(function () {
    var methodName = frontend_1.webApiDeclaration.loginUser.methodName;
    exports.handlers[methodName] = {
        "needAuth": false,
        "contentType": "application/json",
        "sanityChecks": function (params) { return (params instanceof Object &&
            typeof params.email === "string" &&
            params.email.match(_constants_1.c.regExpEmail) !== null &&
            typeof params.password === "string" &&
            params.password.match(_constants_1.c.regExpPassword) !== null); },
        "handler": function (params, session) { return __awaiter(_this, void 0, void 0, function () {
            var email, password, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = params.email, password = params.password;
                        return [4 /*yield*/, db.authenticateUser(email, password)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            return [2 /*return*/, false];
                        }
                        session.auth = {
                            user: user,
                            "email": email.toLowerCase()
                        };
                        return [2 /*return*/, true];
                }
            });
        }); }
    };
})();
(function () {
    var methodName = frontend_1.webApiDeclaration.logoutUser.methodName;
    exports.handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": function (params) { return params === undefined; },
        "handler": function (params, session) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                session.auth = undefined;
                return [2 /*return*/];
            });
        }); }
    };
})();
(function () {
    var methodName = frontend_1.webApiDeclaration.sendRenewPasswordEmail.methodName;
    exports.handlers[methodName] = {
        "needAuth": false,
        "contentType": "application/json",
        "sanityChecks": function (params) { return (params instanceof Object &&
            typeof params.email === "string" &&
            params.email.match(_constants_1.c.regExpEmail) !== null); },
        "handler": function (params) { return __awaiter(_this, void 0, void 0, function () {
            var email, hash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = params.email;
                        return [4 /*yield*/, db.getUserHash(email)];
                    case 1:
                        hash = _a.sent();
                        //TODO send email
                        return [2 /*return*/, hash !== undefined];
                }
            });
        }); }
    };
})();
(function () {
    var methodName = frontend_1.webApiDeclaration.getSims.methodName;
    exports.handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": function (params) { return params === undefined; },
        "handler": function (params, session) { return db.getUserSims(session.auth.user); }
    };
})();
(function () {
    var methodName = frontend_1.webApiDeclaration.getUnregisteredLanDongles.methodName;
    exports.handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": function (params) { return params === undefined; },
        "handler": function (params, session, remoteAddress) { return __awaiter(_this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _b = (_a = db).filterDongleWithRegistrableSim;
                        _c = [session.auth.user];
                        _e = (_d = Array).from;
                        return [4 /*yield*/, utils.getDonglesConnectedFrom(remoteAddress)];
                    case 1: return [2 /*return*/, _b.apply(_a, _c.concat([_e.apply(_d, [(_f.sent()).keys()])]))];
                }
            });
        }); }
    };
})();
(function () {
    var methodName = frontend_1.webApiDeclaration.unlockSim.methodName;
    exports.handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": function (params) { return (params instanceof Object &&
            typeof params.imei === "string" &&
            typeof params.pin === "string" //TODO: regexp pin
        ); },
        "handler": function (params, session, remoteAddress) { return __awaiter(_this, void 0, void 0, function () {
            var imei, pin, donglePathMap, lockedDongle, gwSocket, unlockResult, _a, dongle, simOwner;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        imei = params.imei, pin = params.pin;
                        return [4 /*yield*/, utils.getDonglesConnectedFrom(remoteAddress)];
                    case 1:
                        donglePathMap = _b.sent();
                        lockedDongle = Array.from(donglePathMap.keys()).find(function (dongle) { return chan_dongle_extended_client_1.DongleController.LockedDongle.match(dongle) && dongle.imei === imei; });
                        if (!lockedDongle)
                            throw new Error("assert");
                        gwSocket = donglePathMap.get(lockedDongle);
                        return [4 /*yield*/, sipApiGateway.unlockDongle(gwSocket, imei, pin)];
                    case 2:
                        unlockResult = _b.sent();
                        if (!unlockResult)
                            throw new Error("assert");
                        if (!unlockResult.success) {
                            return [2 /*return*/, {
                                    "wasPinValid": false,
                                    "pinState": unlockResult.pinState,
                                    "tryLeft": unlockResult.tryLeft
                                }];
                        }
                        return [4 /*yield*/, sipApiServer.getEvtNewActiveDongle(gwSocket)
                                .waitFor(function (_a) {
                                var dongle = _a.dongle;
                                return dongle.imei === imei;
                            }, 10000)];
                    case 3:
                        _a = _b.sent(), dongle = _a.dongle, simOwner = _a.simOwner;
                        if (!simOwner) {
                            return [2 /*return*/, {
                                    "wasPinValid": true,
                                    "isSimRegisterable": true,
                                    dongle: dongle
                                }];
                        }
                        else {
                            return [2 /*return*/, {
                                    "wasPinValid": true,
                                    "isSimRegisterable": false,
                                    "simRegisteredBy": (simOwner.user === session.auth.user) ?
                                        ({ "who": "MYSELF" }) :
                                        ({ "who": "OTHER USER", "email": simOwner.email })
                                }];
                        }
                        return [2 /*return*/];
                }
            });
        }); }
    };
})();
(function () {
    var methodName = frontend_1.webApiDeclaration.registerSim.methodName;
    exports.handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": function (params) { return (params instanceof Object &&
            typeof params.imsi === "string" &&
            typeof params.friendlyName === "string"); },
        "handler": function (params, session, remoteAddress) { return __awaiter(_this, void 0, void 0, function () {
            var imsi, friendlyName, donglePathMap, dongle, password, userUas;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        imsi = params.imsi, friendlyName = params.friendlyName;
                        return [4 /*yield*/, utils.getDonglesConnectedFrom(remoteAddress)];
                    case 1:
                        donglePathMap = _a.sent();
                        dongle = Array.from(donglePathMap.keys()).find(function (dongle) { return chan_dongle_extended_client_1.DongleController.ActiveDongle.match(dongle) && dongle.sim.imsi === imsi; });
                        if (!dongle)
                            throw new Error("assert");
                        password = utils.simPassword.read(donglePathMap.get(dongle), imsi);
                        if (!password)
                            throw new Error("assert");
                        return [4 /*yield*/, db.registerSim(dongle.sim, password, session.auth.user, friendlyName, dongle.isVoiceEnabled)];
                    case 2:
                        userUas = _a.sent();
                        return [4 /*yield*/, utils.sendPushNotification.toUas(userUas, "RELOAD CONFIG")];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, undefined];
                }
            });
        }); }
    };
})();
(function () {
    var methodName = frontend_1.webApiDeclaration.unregisterSim.methodName;
    exports.handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": function (params) { return (params instanceof Object &&
            typeof params.imsi === "string"); },
        "handler": function (params, session) { return __awaiter(_this, void 0, void 0, function () {
            var imsi, affectedUas, gwSocket;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        imsi = params.imsi;
                        return [4 /*yield*/, db.unregisterSim(session.auth.user, imsi)];
                    case 1:
                        affectedUas = _a.sent();
                        gwSocket = sipProxy.gatewaySockets.getSimRoute(imsi);
                        if (gwSocket) {
                            sipApiGateway.reNotifySimOnline(gwSocket, imsi);
                        }
                        return [4 /*yield*/, utils.sendPushNotification.toUas(affectedUas, "RELOAD CONFIG")];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, undefined];
                }
            });
        }); }
    };
})();
(function () {
    var methodName = frontend_1.webApiDeclaration.shareSim.methodName;
    exports.handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": function (params) { return (params instanceof Object &&
            typeof params.imsi === "string" &&
            params.emails instanceof Array &&
            params.emails.find(function (email) { return (typeof email !== "string" ||
                email.match(_constants_1.c.regExpEmail) === null); }) === undefined &&
            typeof params.message === "string"); },
        "handler": function (params, session) { return __awaiter(_this, void 0, void 0, function () {
            var imsi, emails, message, affectedUsers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        imsi = params.imsi, emails = params.emails, message = params.message;
                        return [4 /*yield*/, db.shareSim(session.auth, imsi, emails, message)];
                    case 1:
                        affectedUsers = _a.sent();
                        //TODO: send email to notify new sim shared
                        return [2 /*return*/, affectedUsers];
                }
            });
        }); }
    };
})();
(function () {
    var methodName = frontend_1.webApiDeclaration.stopSharingSim.methodName;
    exports.handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": function (params) { return (params instanceof Object &&
            typeof params.imsi === "string" &&
            params.emails instanceof Array &&
            !!params.emails.length &&
            params.emails.find(function (email) { return (typeof email !== "string" ||
                email.match(_constants_1.c.regExpEmail) === null); }) === undefined); },
        "handler": function (params, session) { return __awaiter(_this, void 0, void 0, function () {
            var imsi, emails, noLongerRegisteredUas, gwSocket;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        imsi = params.imsi, emails = params.emails;
                        return [4 /*yield*/, db.stopSharingSim(session.auth.user, imsi, emails)];
                    case 1:
                        noLongerRegisteredUas = _a.sent();
                        if (noLongerRegisteredUas.length) {
                            utils.sendPushNotification.toUas(noLongerRegisteredUas, "RELOAD CONFIG");
                            gwSocket = sipProxy.gatewaySockets.getSimRoute(imsi);
                            if (gwSocket) {
                                sipApiGateway.reNotifySimOnline(gwSocket, imsi);
                            }
                        }
                        return [2 /*return*/, undefined];
                }
            });
        }); }
    };
})();
//TODO: define max length of friendly name
(function () {
    var methodName = frontend_1.webApiDeclaration.setSimFriendlyName.methodName;
    exports.handlers[methodName] = {
        "needAuth": true,
        "contentType": "application/json",
        "sanityChecks": function (params) { return (params instanceof Object &&
            typeof params.imsi === "string" &&
            typeof params.friendlyName === "string"); },
        "handler": function (params, session) { return __awaiter(_this, void 0, void 0, function () {
            var imsi, friendlyName, userUas;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        imsi = params.imsi, friendlyName = params.friendlyName;
                        return [4 /*yield*/, db.setSimFriendlyName(session.auth.user, imsi, friendlyName)];
                    case 1:
                        userUas = _a.sent();
                        utils.sendPushNotification.toUas(userUas, "RELOAD CONFIG");
                        return [2 /*return*/, undefined];
                }
            });
        }); }
    };
})();
//TODO: define max length of friendly name
(function () {
    var methodName = frontend_1.webApiDeclaration.getUaConfig.methodName;
    var hexToUtf8 = function (hexStr) {
        return (new Buffer(hexStr, "hex")).toString("utf8");
    };
    var ov = " overwrite=\"true\" ";
    var domain = _constants_1.c.shared.domain;
    exports.handlers[methodName] = {
        "needAuth": false,
        "contentType": "application/xml",
        "sanityChecks": function (params) {
            try {
                return (hexToUtf8(params.email_as_hex)
                    .match(_constants_1.c.regExpEmail) !== null &&
                    hexToUtf8(params.password_as_hex)
                        .match(_constants_1.c.regExpPassword) !== null);
            }
            catch (_a) {
                return false;
            }
        },
        "handler": function (params) { return __awaiter(_this, void 0, void 0, function () {
            var email, password, user, endpointEntries, contactEntries, contact_parameters, _a, _b, _c, sim, friendlyName, password_1, ownership, _d, _e, contact, e_1_1, e_1, _f, e_2, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        email = hexToUtf8(params.email_as_hex).toLocaleLowerCase();
                        password = hexToUtf8(params.password_as_hex);
                        return [4 /*yield*/, db.authenticateUser(email, password)];
                    case 1:
                        user = _h.sent();
                        if (!user)
                            throw new Error("assert");
                        endpointEntries = [];
                        contactEntries = [];
                        contact_parameters = entities.encode("user_email=" + email);
                        _h.label = 2;
                    case 2:
                        _h.trys.push([2, 7, 8, 9]);
                        return [4 /*yield*/, db.getUserSims(user)];
                    case 3:
                        _a = __values.apply(void 0, [_h.sent()]), _b = _a.next();
                        _h.label = 4;
                    case 4:
                        if (!!_b.done) return [3 /*break*/, 6];
                        _c = _b.value, sim = _c.sim, friendlyName = _c.friendlyName, password_1 = _c.password, ownership = _c.ownership;
                        if (ownership.status === "SHARED NOT CONFIRMED") {
                            return [3 /*break*/, 5];
                        }
                        endpointEntries[endpointEntries.length] = [
                            "  <section name=\"nat_policy_" + endpointEntries.length + "\">",
                            "    <entry name=\"ref\" " + ov + ">nat_policy_" + endpointEntries.length + "</entry>",
                            "    <entry name=\"stun_server\" " + ov + ">" + domain + "</entry>",
                            "    <entry name=\"protocols\" " + ov + ">stun,ice</entry>",
                            "  </section>",
                            "  <section name=\"proxy_" + endpointEntries.length + "\">",
                            "    <entry name=\"reg_proxy\" " + ov + ">sip:" + domain + ";transport=tls</entry>",
                            "    <entry name=\"reg_route\" " + ov + ">sip:" + domain + ";transport=tls;lr</entry>",
                            "    <entry name=\"reg_expires\" " + ov + ">" + _constants_1.c.reg_expires + "</entry>",
                            [
                                "    <entry name=\"reg_identity\" " + ov + ">",
                                entities.encode("\"" + friendlyName + "\" <sip:" + sim.imsi + "@" + domain + ";transport=tls>"),
                                "</entry>",
                            ].join(""),
                            "    <entry name=\"contact_parameters\" " + ov + ">" + contact_parameters + "</entry>",
                            "    <entry name=\"reg_sendregister\" " + ov + ">1</entry>",
                            "    <entry name=\"publish\" " + ov + ">0</entry>",
                            "    <entry name=\"nat_policy_ref\" " + ov + ">nat_policy_" + endpointEntries.length + "</entry>",
                            "  </section>",
                            "  <section name=\"auth_info_" + endpointEntries.length + "\">",
                            "    <entry name=\"username\" " + ov + ">" + sim.imsi + "</entry>",
                            "    <entry name=\"userid\" " + ov + ">" + sim.imsi + "</entry>",
                            "    <entry name=\"passwd\" " + ov + ">" + password_1 + "</entry>",
                            "  </section>"
                        ].join("\n");
                        try {
                            for (_d = __values(sim.storage.contacts), _e = _d.next(); !_e.done; _e = _d.next()) {
                                contact = _e.value;
                                contactEntries[contactEntries.length] = [
                                    "  <section name=\"friend_" + contactEntries.length + "\">",
                                    [
                                        "    <entry name=\"url\" " + ov + ">",
                                        entities.encode("\"" + contact.name.full + " (" + friendlyName + ")\" <sip:" + contact.number.localFormat + "@" + domain + ">"),
                                        "</entry>"
                                    ].join(""),
                                    "    <entry name=\"pol\" " + ov + ">accept</entry>",
                                    "    <entry name=\"subscribe\" " + ov + ">0</entry>",
                                    "  </section>",
                                ].join("\n");
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_g = _d.return)) _g.call(_d);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        _h.label = 5;
                    case 5:
                        _b = _a.next();
                        return [3 /*break*/, 4];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_1_1 = _h.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/, __spread([
                            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
                            [
                                "<config xmlns=\"http://www.linphone.org/xsds/lpconfig.xsd\" ",
                                "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" ",
                                "xsi:schemaLocation=\"http://www.linphone.org/xsds/lpconfig.xsd lpconfig.xsd\">",
                            ].join("")
                        ], endpointEntries, contactEntries, [
                            "</config>"
                        ]).join("\n")];
                }
            });
        }); }
    };
})();
