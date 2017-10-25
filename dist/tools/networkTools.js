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
var dns = require("dns");
var network = require("network");
var stun = require("stun");
var dgram = require("dgram");
var semasim_gateway_1 = require("../semasim-gateway");
exports.resolveSrv = semasim_gateway_1.networkTools.resolveSrv;
function resolve4(hostname) {
    return new Promise(function (resolve, reject) { return dns.resolve4(hostname, function (error, addresses) {
        (error || !addresses.length) ? reject(error || new Error("no record")) : resolve(addresses[0]);
    }); });
}
exports.resolve4 = resolve4;
function stunBindingRequest(stunServer, port, interfaceIp, srcPort) {
    return new Promise(function (resolve, reject) {
        var socket = dgram.createSocket("udp4");
        socket.bind(srcPort, interfaceIp);
        var server = stun.createServer(socket);
        var _a = stun.constants, STUN_BINDING_REQUEST = _a.STUN_BINDING_REQUEST, STUN_ATTR_XOR_MAPPED_ADDRESS = _a.STUN_ATTR_XOR_MAPPED_ADDRESS;
        var timer = setTimeout(function () {
            server.close();
            reject(new Error("Stun binding request timeout"));
        }, 2000);
        server.once("bindingResponse", function (stunMsg) {
            clearTimeout(timer);
            try {
                var _a = stunMsg.getAttribute(STUN_ATTR_XOR_MAPPED_ADDRESS).value, address = _a.address, port_1 = _a.port;
                resolve({ "ip": address, port: port_1 });
            }
            catch (_b) {
                reject(new Error("Invalid response"));
            }
            socket.close();
        });
        server.send(stun.createMessage(STUN_BINDING_REQUEST), port, stunServer);
    });
}
exports.stunBindingRequest = stunBindingRequest;
function getStunServer() {
    if (getStunServer.previousResult) {
        return Promise.resolve(getStunServer.previousResult);
    }
    return getStunServer.run();
}
exports.getStunServer = getStunServer;
(function (getStunServer) {
    getStunServer.domain = undefined;
    function defineUpdateInterval(delay) {
        if (delay === void 0) { delay = 3600000; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setInterval(function () { return run(); }, delay);
                        return [4 /*yield*/, run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    getStunServer.defineUpdateInterval = defineUpdateInterval;
    getStunServer.previousResult = undefined;
    // cSpell:disable
    getStunServer.knownStunServers = [
        { "name": "stun.l.google.com", "port": 19302 },
        { "name": "stun1.l.google.com", "port": 19302 },
        { "name": "stun2.l.google.com", "port": 19302 },
        { "name": "stun3.l.google.com", "port": 19302 },
        { "name": "stun4.l.google.com", "port": 19302 },
        { "name": "numb.viagenie.ca", "port": 3478 }
    ];
    /* cSpell:enable */
    function run() {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var dnsSrvRecord, _a, tasks, _loop_1, dnsSrvRecord_1, dnsSrvRecord_1_1, _b, name_1, port, e_1, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 3]);
                        if (!getStunServer.domain)
                            throw new Error();
                        return [4 /*yield*/, exports.resolveSrv("_stun._udp." + getStunServer.domain)];
                    case 1:
                        dnsSrvRecord = _d.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _d.sent();
                        dnsSrvRecord = getStunServer.knownStunServers;
                        return [3 /*break*/, 3];
                    case 3:
                        tasks = [];
                        _loop_1 = function (name_1, port) {
                            tasks[tasks.length] = (function () { return __awaiter(_this, void 0, void 0, function () {
                                var ip, _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            return [4 /*yield*/, resolve4(name_1)];
                                        case 1:
                                            ip = _b.sent();
                                            return [4 /*yield*/, stunBindingRequest(ip, port)];
                                        case 2:
                                            _b.sent();
                                            return [2 /*return*/, { ip: ip, port: port }];
                                        case 3:
                                            _a = _b.sent();
                                            return [2 /*return*/, new Promise(function () { })];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); })();
                        };
                        try {
                            for (dnsSrvRecord_1 = __values(dnsSrvRecord), dnsSrvRecord_1_1 = dnsSrvRecord_1.next(); !dnsSrvRecord_1_1.done; dnsSrvRecord_1_1 = dnsSrvRecord_1.next()) {
                                _b = dnsSrvRecord_1_1.value, name_1 = _b.name, port = _b.port;
                                _loop_1(name_1, port);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (dnsSrvRecord_1_1 && !dnsSrvRecord_1_1.done && (_c = dnsSrvRecord_1.return)) _c.call(dnsSrvRecord_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        tasks[tasks.length] = new Promise(function (_, reject) { return setTimeout(function () { return reject(new Error("stun resolution timeout")); }, 2000); });
                        return [4 /*yield*/, Promise.race(tasks)];
                    case 4:
                        getStunServer.previousResult = _d.sent();
                        return [2 /*return*/, getStunServer.previousResult];
                }
            });
        });
    }
    getStunServer.run = run;
})(getStunServer = exports.getStunServer || (exports.getStunServer = {}));
function getInterfaceIps() {
    return new Promise(function (resolve, reject) {
        return network.get_interfaces_list(function (error, list) {
            if (error || !list.length) {
                reject(error || new Error("no interface"));
                return;
            }
            resolve(list.map(function (_a) {
                var ip_address = _a.ip_address;
                return ip_address;
            }));
        });
    });
}
exports.getInterfaceIps = getInterfaceIps;
function retrieveIpFromHostname(hostname) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var stunServer, publicIp, tasks, _loop_2, _a, _b, interfaceIp_1, e_2_1, interfaceIp, e_2, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, getStunServer()];
                case 1:
                    stunServer = _d.sent();
                    return [4 /*yield*/, resolve4(hostname)];
                case 2:
                    publicIp = _d.sent();
                    tasks = [];
                    _loop_2 = function (interfaceIp_1) {
                        tasks[tasks.length] = (function () { return __awaiter(_this, void 0, void 0, function () {
                            var stunResponse, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, stunBindingRequest(stunServer.ip, stunServer.port, interfaceIp_1)];
                                    case 1:
                                        stunResponse = _b.sent();
                                        if (stunResponse.ip !== publicIp) {
                                            throw new Error();
                                        }
                                        return [2 /*return*/, interfaceIp_1];
                                    case 2:
                                        _a = _b.sent();
                                        return [2 /*return*/, new Promise(function () { })];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); })();
                    };
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 8, 9, 10]);
                    return [4 /*yield*/, getInterfaceIps()];
                case 4:
                    _a = __values.apply(void 0, [_d.sent()]), _b = _a.next();
                    _d.label = 5;
                case 5:
                    if (!!_b.done) return [3 /*break*/, 7];
                    interfaceIp_1 = _b.value;
                    _loop_2(interfaceIp_1);
                    _d.label = 6;
                case 6:
                    _b = _a.next();
                    return [3 /*break*/, 5];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_2_1 = _d.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 10:
                    tasks[tasks.length] = new Promise(function (_, reject) { return setTimeout(function () { return reject(new Error("Service does not point to this host")); }, 3000); });
                    return [4 /*yield*/, Promise.race(tasks)];
                case 11:
                    interfaceIp = _d.sent();
                    return [2 /*return*/, { publicIp: publicIp, interfaceIp: interfaceIp }];
            }
        });
    });
}
exports.retrieveIpFromHostname = retrieveIpFromHostname;
/*

async function startStunProxy(){

    networkTools.getStunServer.domain= "semasim.com";

    await networkTools.getStunServer.defineUpdateInterval();

    const socket = dgram.createSocket("udp4");
    socket.bind(3478, "127.0.0.1");
    const server = stun.createServer(socket);

    const { STUN_BINDING_RESPONSE, STUN_ATTR_XOR_MAPPED_ADDRESS, STUN_ATTR_SOFTWARE } = stun.constants;
    const userAgent = `node/${process.version} stun/v1.0.0`;

    server.on("bindingRequest", async (req, rinfo) => {

        let stunServer= networkTools.getStunServer.previousResult!;

        let stunResponse= await networkTools.stunBindingRequest(stunServer.ip, stunServer.port, undefined, rinfo.port + 1);

        let msg = stun.createMessage(STUN_BINDING_RESPONSE)
        msg.addAttribute(STUN_ATTR_XOR_MAPPED_ADDRESS, stunResponse.ip, stunResponse.port);
        msg.addAttribute(STUN_ATTR_SOFTWARE, userAgent);

        server.send(msg, rinfo.port, rinfo.address);

    })

    await new Promise<void>(
        resolve => socket.on("listening", ()=> resolve() )
    );

}

*/ 
