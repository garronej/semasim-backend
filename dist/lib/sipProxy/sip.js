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
var _debug = require("debug");
var debug = _debug("_sipProxy/sip");
exports.makeStreamParser = sip.makeStreamParser;
//TODO: make a function to test if message are well formed: have from, to via ect.
var Socket = (function () {
    function Socket(connection) {
        var _this = this;
        this.connection = connection;
        this.evtPacket = new ts_events_extended_1.SyncEvent();
        this.evtResponse = new ts_events_extended_1.SyncEvent();
        this.evtRequest = new ts_events_extended_1.SyncEvent();
        this.evtClose = new ts_events_extended_1.SyncEvent();
        this.evtError = new ts_events_extended_1.SyncEvent();
        this.evtConnect = new ts_events_extended_1.VoidSyncEvent();
        this.evtPing = new ts_events_extended_1.VoidSyncEvent();
        this.evtData = new ts_events_extended_1.SyncEvent();
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
            var rawStr = chunk.toString("utf8");
            _this.evtData.post(rawStr);
            if (rawStr === "\r\n\r\n") {
                _this.evtPing.post();
                _this.connection.write("\r\n");
                return;
            }
            streamParser(rawStr);
        })
            .once("close", function (had_error) { return _this.evtClose.post(had_error); })
            .once("error", function (error) { return _this.evtError.post(error); })
            .once("connect", function () { return _this.evtConnect.post(); })
            .setMaxListeners(Infinity);
    }
    Socket.prototype.write = function (sipPacket) {
        if (this.evtClose.postCount)
            return false;
        return this.connection.write(exports.stringify(sipPacket));
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
            var localPort = this.connection.localPort;
            if (typeof localPort !== "number" || isNaN(localPort))
                throw new Error("LocalPort not yet set");
            return localPort;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "localAddress", {
        get: function () {
            var localAddress = this.connection.localAddress;
            if (!localAddress)
                throw new Error("LocalAddress not yet set");
            return localAddress;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "remotePort", {
        get: function () {
            var remotePort = this.connection.remotePort;
            if (typeof remotePort !== "number" || isNaN(remotePort))
                throw new Error("Remote port not yet set");
            return remotePort;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Socket.prototype, "remoteAddress", {
        get: function () {
            var remoteAddress = this.connection.remoteAddress;
            if (!remoteAddress)
                throw new Error("Remote address not yes set");
            return remoteAddress;
        },
        enumerable: true,
        configurable: true
    });
    Socket.prototype.addViaHeader = function (sipRequest, extraParams) {
        var branch = exports.generateBranch();
        var params = __assign({}, extraParams, { branch: branch, "rport": null });
        sipRequest.headers.via.splice(0, 0, {
            "version": "2.0",
            "protocol": "TCP",
            "host": this.localAddress,
            "port": this.localPort,
            params: params
        });
        sipRequest.headers["max-forwards"] = "" + (parseInt(sipRequest.headers["max-forwards"]) - 1);
        return branch;
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
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var e_1, _c;
    };
    return Store;
}());
exports.Store = Store;
exports.stringify = sip.stringify;
exports.parseUri = sip.parseUri;
exports.copyMessage = sip.copyMessage;
exports.generateBranch = sip.generateBranch;
exports.stringifyUri = sip.stringifyUri;
exports.parse = sip.parse;
function parseUriWithEndpoint(uri) {
    var match = uri.match(/^([^\/]+)\/(.*)$/);
    return __assign({}, exports.parseUri(match[2]), { "endpoint": match[1] });
}
exports.parseUriWithEndpoint = parseUriWithEndpoint;
function updateContactHeader(sipRequest, host, port, transport, extraParams) {
    if (!sipRequest.headers.contact)
        return;
    var parsedContact = __assign({}, exports.parseUri(sipRequest.headers.contact[0].uri), { host: host, port: port });
    parsedContact.params = __assign({}, parsedContact.params, extraParams, { transport: transport });
    sipRequest.headers.contact[0].uri = exports.stringifyUri(parsedContact);
}
exports.updateContactHeader = updateContactHeader;
function shiftViaHeader(sipResponse) {
    sipResponse.headers.via.shift();
}
exports.shiftViaHeader = shiftViaHeader;
function updateUri(wrap, updatedField) {
    if (!wrap)
        return;
    var parsedUri = exports.parseUri(wrap.uri);
    try {
        for (var _a = __values(["schema", "user", "password", "host", "port"]), _b = _a.next(); !_b.done; _b = _a.next()) {
            var key = _b.value;
            if (key in updatedField)
                parsedUri[key] = updatedField[key];
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_2) throw e_2.error; }
    }
    if ("params" in updatedField)
        parsedUri.params = __assign({}, parsedUri.params, updatedField.params);
    wrap.uri = exports.stringifyUri(parsedUri);
    var e_2, _c;
}
exports.updateUri = updateUri;
function matchRequest(sipPacket) {
    return "method" in sipPacket;
}
exports.matchRequest = matchRequest;
//# sourceMappingURL=sip.js.map