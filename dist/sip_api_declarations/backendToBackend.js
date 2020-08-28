"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlockSimProxy = exports.notifyLoggedFromOtherTabProxy = exports.notifyDongleOnLanProxy = exports.collectDonglesOnLan = exports.destroyUaSocket = exports.qualifyContact = exports.notifyRoute = exports.forwardRequest = void 0;
var forwardRequest;
(function (forwardRequest) {
    forwardRequest.methodName = "forwardRequest";
})(forwardRequest = exports.forwardRequest || (exports.forwardRequest = {}));
var notifyRoute;
(function (notifyRoute) {
    notifyRoute.methodName = "notifyRoute";
})(notifyRoute = exports.notifyRoute || (exports.notifyRoute = {}));
var qualifyContact;
(function (qualifyContact) {
    qualifyContact.methodName = "qualifyContact";
})(qualifyContact = exports.qualifyContact || (exports.qualifyContact = {}));
var destroyUaSocket;
(function (destroyUaSocket) {
    destroyUaSocket.methodName = "destroyClientSocket";
})(destroyUaSocket = exports.destroyUaSocket || (exports.destroyUaSocket = {}));
var collectDonglesOnLan;
(function (collectDonglesOnLan) {
    collectDonglesOnLan.methodName = "connectDonglesOnLan";
})(collectDonglesOnLan = exports.collectDonglesOnLan || (exports.collectDonglesOnLan = {}));
var notifyDongleOnLanProxy;
(function (notifyDongleOnLanProxy) {
    notifyDongleOnLanProxy.methodName = "notifyDongleOnLanProxy";
})(notifyDongleOnLanProxy = exports.notifyDongleOnLanProxy || (exports.notifyDongleOnLanProxy = {}));
var notifyLoggedFromOtherTabProxy;
(function (notifyLoggedFromOtherTabProxy) {
    notifyLoggedFromOtherTabProxy.methodName = "notifyLoggedFromOtherTabProxy";
})(notifyLoggedFromOtherTabProxy = exports.notifyLoggedFromOtherTabProxy || (exports.notifyLoggedFromOtherTabProxy = {}));
var unlockSimProxy;
(function (unlockSimProxy) {
    unlockSimProxy.methodName = "unlockDongleProxy";
})(unlockSimProxy = exports.unlockSimProxy || (exports.unlockSimProxy = {}));
