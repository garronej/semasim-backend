"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wd = exports.shop = exports.subscription = void 0;
const subscription = require("../../../frontend/shared/dist/lib/types/subscription");
exports.subscription = subscription;
const shop = require("../../../frontend/shared/dist/lib/types/shop");
exports.shop = shop;
const wd = require("../../../frontend/shared/dist/lib/types/webphoneData");
exports.wd = wd;
var connectSidHttpHeaderName_1 = require("../../../frontend/shared/dist/lib/types/connectSidHttpHeaderName");
Object.defineProperty(exports, "connectSidHttpHeaderName", { enumerable: true, get: function () { return connectSidHttpHeaderName_1.connectSidHttpHeaderName; } });
__exportStar(require("../../../frontend/shared/dist/lib/types/WebsocketConnectionParams"), exports);
__exportStar(require("../../../frontend/shared/dist/lib/types/UserSim"), exports);
