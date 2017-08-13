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
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var sip = require("./sipLibrary");
var Message;
(function (Message) {
    var sipMethod = "INTERNAL";
    var actionIdKey = "action-id";
    var methodKey = "method";
    function buildSip(actionId, payload) {
        var sipRequest = sip.parse([
            sipMethod + " _ SIP/2.0",
            "\r\n"
        ].join("\r\n"));
        sipRequest.headers[actionIdKey] = "" + actionId++;
        sipRequest.content = JSON.stringify(payload);
        return sipRequest;
    }
    Message.buildSip = buildSip;
    function matchSip(sipRequest) {
        return sipRequest.method === sipMethod;
    }
    Message.matchSip = matchSip;
    function readActionId(sipRequest) {
        return parseInt(sipRequest.headers[actionIdKey]);
    }
    Message.readActionId = readActionId;
    function parsePayload(sipRequest) {
        return JSON.parse(sipRequest.content);
    }
    Message.parsePayload = parsePayload;
    var Request;
    (function (Request) {
        var actionIdCounter = 0;
        function buildSip(method, payload) {
            var sipRequest = Message.buildSip(actionIdCounter++, payload);
            sipRequest.headers[methodKey] = method;
            return sipRequest;
        }
        Request.buildSip = buildSip;
        function matchSip(sipRequest) {
            return (Message.matchSip(sipRequest) &&
                sipRequest.headers[methodKey]);
        }
        Request.matchSip = matchSip;
        function readMethod(sipRequest) {
            return sipRequest.headers[methodKey];
        }
        Request.readMethod = readMethod;
    })(Request = Message.Request || (Message.Request = {}));
    var Response;
    (function (Response) {
        function buildSip(actionId, payload) {
            var sipRequest = Message.buildSip(actionId, payload);
            return sipRequest;
        }
        Response.buildSip = buildSip;
        function matchSip(sipRequest, actionId) {
            return (Message.matchSip(sipRequest) &&
                sipRequest.headers[methodKey] === undefined &&
                Message.readActionId(sipRequest) === actionId);
        }
        Response.matchSip = matchSip;
    })(Response = Message.Response || (Message.Response = {}));
})(Message || (Message = {}));
function startListening(sipSocket) {
    var evt = new ts_events_extended_1.SyncEvent();
    sipSocket.evtRequest.attachExtract(function (sipRequest) { return Message.Request.matchSip(sipRequest); }, function (sipRequest) {
        var actionId = Message.readActionId(sipRequest);
        var method = Message.Request.readMethod(sipRequest);
        var payload = Message.parsePayload(sipRequest);
        evt.post({
            method: method,
            payload: payload,
            "sendResponse": function (payload) { return sipSocket.write(Message.Response.buildSip(actionId, payload)); }
        });
    });
    return evt;
}
exports.startListening = startListening;
function sendRequest(sipSocket, method, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var sipRequest, actionId, sipRequestResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sipRequest = Message.Request.buildSip(method, payload);
                    actionId = Message.readActionId(sipRequest);
                    sipSocket.write(sipRequest);
                    return [4 /*yield*/, sipSocket.evtRequest.waitForExtract(function (sipRequestResponse) { return Message.Response.matchSip(sipRequestResponse, actionId); })];
                case 1:
                    sipRequestResponse = _a.sent();
                    return [2 /*return*/, Message.parsePayload(sipRequestResponse)];
            }
        });
    });
}
exports.sendRequest = sendRequest;
//deviceSockets.add(message.imei, deviceSocket); 
