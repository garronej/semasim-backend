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
var sip = require("sip");
var ts_events_extended_1 = require("ts-events-extended");
var md5 = require("md5");
var _sdp_ = require("sip/sdp");
exports.regIdKey = "reg-id";
exports.instanceIdKey = "+sip.instance";
var _debug = require("debug");
var debug = _debug("_sipProxy/sip");
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
    sdp.c.address = srflxAddr;
    sdp.o.address = srflxAddr;
    //TODO: see if need to update port in m as well.
}
exports.overwriteGlobalAndAudioAddrInSdpCandidates = overwriteGlobalAndAudioAddrInSdpCandidates;
function purgeCandidates(sdp, toPurge) {
    try {
        for (var _a = __values(sdp.m), _b = _a.next(); !_b.done; _b = _a.next()) {
            var m_i = _b.value;
            var new_a = [];
            try {
                for (var _c = __values(m_i.a), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var a_i = _d.value;
                    if (a_i.match(/^candidate.*host$/)) {
                        if (toPurge.host) {
                            console.log("==========================================> purged", a_i);
                            continue;
                        }
                    }
                    else if (a_i.match(/^candidate.*srflx/)) {
                        if (toPurge.srflx) {
                            console.log("==========================================> purged", a_i);
                            continue;
                        }
                    }
                    else if (a_i.match(/^candidate/)) {
                        if (toPurge.relay) {
                            console.log("==========================================> purged", a_i);
                            continue;
                        }
                    }
                    new_a.push(a_i);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_e = _c.return)) _e.call(_c);
                }
                finally { if (e_3) throw e_3.error; }
            }
            m_i.a = new_a;
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_f = _a.return)) _f.call(_a);
        }
        finally { if (e_4) throw e_4.error; }
    }
    var e_4, _f, e_3, _e;
}
exports.purgeCandidates = purgeCandidates;
exports.makeStreamParser = sip.makeStreamParser;
//TODO: make a function to test if message are well formed: have from, to via ect.
var Socket = (function () {
    function Socket(connection, timeoutDelay) {
        var _this = this;
        this.connection = connection;
        this.evtPacket = new ts_events_extended_1.SyncEvent();
        this.evtResponse = new ts_events_extended_1.SyncEvent();
        this.evtRequest = new ts_events_extended_1.SyncEvent();
        this.evtClose = new ts_events_extended_1.SyncEvent();
        this.evtError = new ts_events_extended_1.SyncEvent();
        this.evtConnect = new ts_events_extended_1.VoidSyncEvent();
        this.evtPing = new ts_events_extended_1.VoidSyncEvent();
        this.evtTimeout = new ts_events_extended_1.VoidSyncEvent();
        this.evtData = new ts_events_extended_1.SyncEvent();
        this.disablePong = false;
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
        });
        connection.on("data", function (chunk) {
            if (timeoutDelay) {
                clearTimeout(_this.timer);
                _this.timer = setTimeout(function () { return _this.evtTimeout.post(); }, timeoutDelay);
            }
            var rawStr = chunk.toString("utf8");
            _this.evtData.post(rawStr);
            if (rawStr === "\r\n\r\n") {
                _this.evtPing.post();
                if (_this.disablePong)
                    return;
                _this.connection.write("\r\n");
                return;
            }
            streamParser(rawStr);
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
        //TODO: wait response of: https://support.counterpath.com/topic/what-is-the-use-of-the-first-options-request-send-before-registration
        if (matchRequest(sipPacket) && parseInt(sipPacket.headers["max-forwards"]) < 0)
            return false;
        try {
            return this.connection.write(exports.stringify(sipPacket));
        }
        catch (error) {
            console.log("error while stringifying: ", sipPacket);
            throw error;
        }
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
        sipRequest.headers["max-forwards"] = "" + (parseInt(sipRequest.headers["max-forwards"]) - 1);
        return branch;
    };
    Socket.prototype.addPathHeader = function (sipRequest, host) {
        var parsedUri = createParsedUri();
        parsedUri.host = host || this.localAddress;
        parsedUri.port = this.localPort;
        parsedUri.params["transport"] = this.protocol;
        parsedUri.params["lr"] = null;
        if (!sipRequest.headers.path)
            sipRequest.headers.path = [];
        sipRequest.headers.path.unshift({
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
    return Socket;
}());
exports.Socket = Socket;
var Store = (function () {
    function Store() {
        this.record = {};
        this.timestampRecord = {};
    }
    Store.prototype.add = function (key, socket, timestamp) {
        var _this = this;
        if (timestamp === undefined)
            timestamp = Date.now();
        this.record[key] = socket;
        this.timestampRecord[key] = timestamp;
        socket.evtClose.attachOnce(function () {
            delete _this.record[key];
        });
    };
    Store.prototype.get = function (key) {
        return this.record[key];
    };
    Store.prototype.getAll = function () {
        var out = [];
        try {
            for (var _a = __values(Object.keys(this.record)), _b = _a.next(); !_b.done; _b = _a.next()) {
                var key = _b.value;
                out.push(this.record[key]);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return out;
        var e_5, _c;
    };
    Store.prototype.getTimestamp = function (key) {
        return this.timestampRecord[key] || -1;
    };
    Store.prototype.destroyAll = function () {
        try {
            for (var _a = __values(Object.keys(this.record)), _b = _a.next(); !_b.done; _b = _a.next()) {
                var key = _b.value;
                this.record[key].destroy();
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_6) throw e_6.error; }
        }
        var e_6, _c;
    };
    return Store;
}());
exports.Store = Store;
exports.stringify = sip.stringify;
exports.parseUri = sip.parseUri;
exports.generateBranch = sip.generateBranch;
exports.stringifyUri = sip.stringifyUri;
exports.parse = sip.parse;
/*
export const copyMessage: <T extends Packet>(sipPacket: T, deep?: boolean) => T = sip.copyMessage;
REGISTER sip:semasim.com SIP/2.0
Via: SIP/2.0/TCP 172.31.31.1:8883;flowtoken=582faf054f660bbdd9e14c32bdb71e89;branch=z9hG4bK578943;rport
Via: SIP/2.0/TCP 100.122.234.122:60006;branch=z9hG4bK-524287-1---6093e050d634776b;rport;alias
Max-Forwards: 69
Contact:  <sip:358880032664586@100.122.234.122:60006;rinstance=c2b1e3c576ad2cf8;transport=tcp>;+sip.instance="<urn:uuid:26388600-1cde-40aa-8eba-5802edfa3322>";reg-id=1
To:  <sip:358880032664586@semasim.com>
From:  <sip:358880032664586@semasim.com>;tag=8ee6bf48
Call-ID: ZGZmMzllZjNhODIzZDQxMDlmOTA4YTY5ZWE3NGRlN2M
CSeq: 1 REGISTER
Expires: 900
Allow: INVITE, ACK, CANCEL, BYE, REFER, INFO, NOTIFY, OPTIONS, UPDATE, PRACK, MESSAGE, SUBSCRIBE
Supported: outbound, path
User-Agent: Bria iOS release 3.9.5 stamp 38501.38502
Content-Length: 0
*/
function copyMessage(sipPacket, deep) {
    return exports.parse(exports.stringify(sipPacket));
}
exports.copyMessage = copyMessage;
function createParsedUri() {
    return exports.parseUri("sip:127.0.0.1");
}
exports.createParsedUri = createParsedUri;
function parseUriWithEndpoint(uri) {
    var match = uri.match(/^([^\/]+)\/(.*)$/);
    return __assign({}, exports.parseUri(match[2]), { "endpoint": match[1] });
}
exports.parseUriWithEndpoint = parseUriWithEndpoint;
function updateUri(wrap, updatedField) {
    if (!wrap || !wrap.uri)
        return;
    var parsedUri = exports.parseUri(wrap.uri);
    try {
        for (var _a = __values(["schema", "user", "password", "host", "port"]), _b = _a.next(); !_b.done; _b = _a.next()) {
            var key = _b.value;
            if (key in updatedField)
                parsedUri[key] = updatedField[key];
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_7) throw e_7.error; }
    }
    if (updatedField.params)
        parsedUri.params = __assign({}, parsedUri.params, updatedField.params);
    try {
        for (var _d = __values(Object.keys(parsedUri.params)), _e = _d.next(); !_e.done; _e = _d.next()) {
            var key = _e.value;
            if (parsedUri.params[key] === "")
                delete parsedUri.params[key];
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_f = _d.return)) _f.call(_d);
        }
        finally { if (e_8) throw e_8.error; }
    }
    wrap.uri = exports.stringifyUri(parsedUri);
    var e_7, _c, e_8, _f;
}
exports.updateUri = updateUri;
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
