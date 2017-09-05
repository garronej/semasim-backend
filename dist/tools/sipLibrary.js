"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
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
var ts_events_extended_1 = require("ts-events-extended");
var md5 = require("md5");
var sip = require("sip");
var _sdp_ = require("sip/sdp");
var _debug = require("debug");
var debug = _debug("_tools/sipLibrary");
exports.regIdKey = "reg-id";
exports.instanceIdKey = "+sip.instance";
exports.parseSdp = _sdp_.parse;
exports.stringifySdp = _sdp_.stringify;
function overwriteGlobalAndAudioAddrInSdpCandidates(sdp) {
    var getSrflxAddr = function () {
        try {
            for (var _a = __values(sdp.m), _b = _a.next(); !_b.done; _b = _a.next()) {
                var m_i = _b.value;
                if (m_i.media !== "audio")
                    continue;
                try {
                    for (var _c = __values(m_i.a), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var a_i = _d.value;
                        var match = a_i.match(/^candidate(?:[^\s]+\s){4}((?:[0-9]{1,3}\.){3}[0-9]{1,3})\s(?:[^\s]+\s){2}srflx/);
                        if (match)
                            return match[1];
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_e = _c.return)) _e.call(_c);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return "";
        var e_2, _f, e_1, _e;
    };
    var srflxAddr = getSrflxAddr();
    if (!srflxAddr) {
        console.log("No srflx candidate was present in the offer");
        return;
    }
    //TODO: I think linphone is expecting a second c line witch this implementation of SDP parser does not support...
    sdp.c.address = srflxAddr;
    //TODO: we this should be removable
    sdp.o.address = srflxAddr;
    //TODO: see if need to update port in m as well because it may fail on NAT that change port mapping
    /*

    Asterisk sends:

    v=0
    o=- 947913108 947913108 IN IP4 192.168.0.20
    s=Asterisk
    c=IN IP4 192.168.0.20
    t=0 0
    m=audio 27802 RTP/AVP 8 0 101
    a=ice-ufrag:733aedd91cdc7ff0001e4b0b6a9b0fcc
    a=ice-pwd:4df63e726aeaeb030fdf2945787aba76
    a=candidate:Hc0a80014 1 UDP 2130706431 192.168.0.20 27802 typ host
    a=candidate:S5140886d 1 UDP 1694498815 81.64.136.109 27802 typ srflx raddr 192.168.0.20 rport 27802
    a=candidate:Hc0a80014 2 UDP 2130706430 192.168.0.20 27803 typ host
    a=candidate:S5140886d 2 UDP 1694498814 81.64.136.109 27803 typ srflx raddr 192.168.0.20 rport 27803
    a=rtpmap:8 PCMA/8000
    a=rtpmap:0 PCMU/8000
    a=rtpmap:101 telephone-event/8000
    a=fmtp:101 0-16
    a=ptime:20
    a=maxptime:150
    a=sendrecv

    Linphone sends:

    v=0
    o=358880032664586 1891 2518 IN IP4 192.168.0.16
    s=Talk
    c=IN IP4 192.168.0.16
    b=AS:380
    t=0 0
    a=ice-pwd:9b07eb9ded44692c868621e7
    a=ice-ufrag:27435913
    m=audio 7076 RTP/AVP 8 0 101
    c=IN IP4 81.64.136.109
    a=rtpmap:101 telephone-event/8000
    a=candidate:1 1 UDP 2130706431 192.168.0.16 7076 typ host
    a=candidate:1 2 UDP 2130706430 192.168.0.16 7077 typ host
    a=candidate:2 1 UDP 1694498815 81.64.136.109 7076 typ srflx raddr 192.168.0.16 rport 7076
    a=candidate:2 2 UDP 1694498814 81.64.136.109 7077 typ srflx raddr 192.168.0.16 rport 7077
    */
}
exports.overwriteGlobalAndAudioAddrInSdpCandidates = overwriteGlobalAndAudioAddrInSdpCandidates;
function isPlainMessageRequest(sipRequest) {
    return (sipRequest.method === "MESSAGE" &&
        sipRequest.headers["content-type"].match(/^text\/plain/));
}
exports.isPlainMessageRequest = isPlainMessageRequest;
exports.makeStreamParser = sip.makeStreamParser;
//TODO: make a function to test if message are well formed: have from, to via ect.
var Socket = /** @class */ (function () {
    function Socket(connection, timeoutDelay) {
        var _this = this;
        this.connection = connection;
        this.evtPacket = new ts_events_extended_1.SyncEvent();
        this.evtResponse = new ts_events_extended_1.SyncEvent();
        this.evtRequest = new ts_events_extended_1.SyncEvent();
        this.evtClose = new ts_events_extended_1.SyncEvent();
        this.evtError = new ts_events_extended_1.SyncEvent();
        this.evtConnect = new ts_events_extended_1.VoidSyncEvent();
        this.evtTimeout = new ts_events_extended_1.VoidSyncEvent();
        this.evtData = new ts_events_extended_1.SyncEvent();
        this.__localPort__ = NaN;
        this.__remotePort__ = NaN;
        this.__localAddress__ = undefined;
        this.__remoteAddress__ = undefined;
        this.setKeepAlive = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.connection.setKeepAlive.apply(_this.connection, inputs);
        };
        var streamParser = exports.makeStreamParser(function (sipPacket) {
            _this.evtPacket.post(sipPacket);
            if (matchRequest(sipPacket))
                _this.evtRequest.post(sipPacket);
            else
                _this.evtResponse.post(sipPacket);
        }, function () { return _this.destroy(); }, Socket.maxBytesHeaders, Socket.maxContentLength);
        connection.on("data", function (data) {
            if (timeoutDelay) {
                clearTimeout(_this.timer);
                _this.timer = setTimeout(function () { return _this.evtTimeout.post(); }, timeoutDelay);
            }
            var dataAsBinaryString = data.toString("binary");
            _this.evtData.post(dataAsBinaryString);
            streamParser(dataAsBinaryString);
        })
            .once("close", function (had_error) {
            if (timeoutDelay)
                clearTimeout(_this.timer);
            _this.evtClose.post(had_error);
        })
            .once("error", function (error) { return _this.evtError.post(error); })
            .setMaxListeners(Infinity);
        if (this.encrypted)
            connection.once("secureConnect", function () {
                _this.fixPortAndAddr();
                _this.evtConnect.post();
            });
        else
            connection.once("connect", function () {
                _this.fixPortAndAddr();
                _this.evtConnect.post();
            });
    }
    Socket.prototype.fixPortAndAddr = function () {
        this.__localPort__ = this.connection.localPort;
        this.__remotePort__ = this.connection.remotePort;
        this.__localAddress__ = this.connection.localAddress;
        this.__remoteAddress__ = this.connection.remoteAddress;
    };
    Socket.prototype.write = function (sipPacket) {
        if (this.evtClose.postCount)
            return false;
        if (matchRequest(sipPacket) && parseInt(sipPacket.headers["max-forwards"]) < 0)
            return false;
        return this.connection.write(new Buffer(exports.stringify(sipPacket), "binary"));
    };
    Socket.prototype.destroy = function () {
        /*
        this.evtData.detach();
        this.evtPacket.detach();
        this.evtResponse.detach();
        this.evtRequest.detach();
        */
        this.connection.destroy();
    };
    Object.defineProperty(Socket.prototype, "localPort", {
        get: function () {
            var localPort = this.__localPort__ || this.connection.localPort;
            if (typeof localPort !== "number" || isNaN(localPort))
                throw new Error("LocalPort not yet set");
            return localPort;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "localAddress", {
        get: function () {
            var localAddress = this.__localAddress__ || this.connection.localAddress;
            if (!localAddress)
                throw new Error("LocalAddress not yet set");
            return localAddress;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "remotePort", {
        get: function () {
            var remotePort = this.__remotePort__ || this.connection.remotePort;
            if (typeof remotePort !== "number" || isNaN(remotePort))
                throw new Error("Remote port not yet set");
            return remotePort;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "remoteAddress", {
        get: function () {
            var remoteAddress = this.__remoteAddress__ || this.connection.remoteAddress;
            if (!remoteAddress)
                throw new Error("Remote address not yes set");
            return remoteAddress;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "encrypted", {
        get: function () {
            return this.connection["encrypted"] ? true : false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "protocol", {
        get: function () {
            return this.encrypted ? "TLS" : "TCP";
        },
        enumerable: true,
        configurable: true
    });
    //TODO: need validate or crash
    Socket.prototype.addViaHeader = function (sipRequest, extraParams) {
        var branch = (function () {
            var via = sipRequest.headers.via;
            if (!via.length)
                return exports.generateBranch();
            sipRequest.headers["max-forwards"] = "" + (parseInt(sipRequest.headers["max-forwards"]) - 1);
            var previousBranch = via[0].params["branch"];
            return "z9hG4bK-" + md5(previousBranch);
        })();
        var params = __assign({}, (extraParams || {}), { branch: branch, "rport": null });
        sipRequest.headers.via.unshift({
            "version": "2.0",
            "protocol": this.protocol,
            "host": this.localAddress,
            "port": this.localPort,
            params: params
        });
        return branch;
    };
    Socket.prototype.addPathHeader = function (sipRegisterRequest, host, extraParams) {
        var parsedUri = createParsedUri();
        parsedUri.host = host || this.localAddress;
        parsedUri.port = this.localPort;
        parsedUri.params = __assign({}, (extraParams || {}), { "transport": this.protocol, "lr": null });
        if (!sipRegisterRequest.headers.path)
            sipRegisterRequest.headers.path = [];
        sipRegisterRequest.headers.path.unshift({
            "uri": parsedUri,
            "params": {}
        });
    };
    Socket.prototype.buildRecordRoute = function (host) {
        var parsedUri = createParsedUri();
        parsedUri.host = host || this.localAddress;
        parsedUri.port = this.localPort;
        parsedUri.params["transport"] = this.protocol;
        parsedUri.params["lr"] = null;
        return { "uri": parsedUri, "params": {} };
    };
    Socket.prototype.shiftRouteAndAddRecordRoute = function (sipRequest, host) {
        if (sipRequest.headers.route)
            sipRequest.headers.route.shift();
        if (!sipRequest.headers.contact)
            return;
        if (!sipRequest.headers["record-route"])
            sipRequest.headers["record-route"] = [];
        sipRequest.headers["record-route"].unshift(this.buildRecordRoute(host));
    };
    Socket.prototype.rewriteRecordRoute = function (sipResponse, host) {
        if (sipResponse.headers.cseq.method === "REGISTER")
            return;
        var lastHopAddr = sipResponse.headers.via[0].host;
        if (lastHopAddr === this.localAddress)
            sipResponse.headers["record-route"] = undefined;
        if (!sipResponse.headers.contact)
            return;
        if (!sipResponse.headers["record-route"])
            sipResponse.headers["record-route"] = [];
        sipResponse.headers["record-route"].push(this.buildRecordRoute(host));
    };
    Socket.maxBytesHeaders = 7820;
    Socket.maxContentLength = 24624;
    return Socket;
}());
exports.Socket = Socket;
var Store = /** @class */ (function () {
    function Store() {
        this.record = {};
    }
    Store.prototype.add = function (key, socket) {
        var _this = this;
        this.record[key] = socket;
        socket.evtClose.attachOnce(function () {
            delete _this.record[key];
        });
    };
    Store.prototype.get = function (key) {
        return this.record[key];
    };
    Object.defineProperty(Store.prototype, "keys", {
        get: function () {
            return Object.keys(this.record);
        },
        enumerable: true,
        configurable: true
    });
    Store.prototype.getAll = function () {
        var out = [];
        try {
            for (var _a = __values(Object.keys(this.record)), _b = _a.next(); !_b.done; _b = _a.next()) {
                var key = _b.value;
                out.push(this.record[key]);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return out;
        var e_3, _c;
    };
    Store.prototype.destroyAll = function () {
        try {
            for (var _a = __values(Object.keys(this.record)), _b = _a.next(); !_b.done; _b = _a.next()) {
                var key = _b.value;
                this.record[key].destroy();
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_4) throw e_4.error; }
        }
        var e_4, _c;
    };
    return Store;
}());
exports.Store = Store;
exports.stringify = sip.stringify;
exports.parseUri = sip.parseUri;
exports.generateBranch = sip.generateBranch;
exports.stringifyUri = sip.stringifyUri;
exports.parse = sip.parse;
function copyMessage(sipPacket, deep) {
    return exports.parse(exports.stringify(sipPacket));
}
exports.copyMessage = copyMessage;
function createParsedUri() {
    return exports.parseUri("sip:127.0.0.1");
}
exports.createParsedUri = createParsedUri;
function parsePath(path) {
    var message = sip.parse([
        "DUMMY _ SIP/2.0",
        "Path: " + path,
        "\r\n"
    ].join("\r\n"));
    return message.headers.path;
}
exports.parsePath = parsePath;
function parseOptionTags(headerFieldValue) {
    if (!headerFieldValue)
        return [];
    return headerFieldValue.split(",").map(function (optionTag) { return optionTag.replace(/\s/g, ""); });
}
exports.parseOptionTags = parseOptionTags;
function hasOptionTag(headers, headerField, optionTag) {
    var headerFieldValue = headers[headerField];
    var optionTags = parseOptionTags(headerFieldValue);
    return optionTags.indexOf(optionTag) >= 0;
}
exports.hasOptionTag = hasOptionTag;
function addOptionTag(headers, headerField, optionTag) {
    if (hasOptionTag(headers, headerField, optionTag))
        return;
    var optionTags = parseOptionTags(headers[headerField]);
    optionTags.push(optionTag);
    headers[headerField] = optionTags.join(", ");
}
exports.addOptionTag = addOptionTag;
function matchRequest(sipPacket) {
    return "method" in sipPacket;
}
exports.matchRequest = matchRequest;
