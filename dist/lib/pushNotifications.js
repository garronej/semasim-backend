"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSafe = exports.launch = void 0;
const pushSender = require("../tools/pushSender");
const deploy_1 = require("../deploy");
const noThrow_1 = require("../tools/noThrow");
const logger_1 = require("../tools/logger");
const debug = logger_1.logger.debugFactory();
function launch() {
    pushSender.launch(deploy_1.deploy.pushNotificationCredentials);
}
exports.launch = launch;
async function send(uas, payload) {
    /*
     * NOTE IMPLEMENTATION IOS:
     *
     * Until commit 53957ba1e4344593caf42feba24df48520c2f954 we had
     * a mechanism that prevented to send multiple push notification
     * simultaneously to the same UA.
     * For android we had no delay, for ios we had 10 seconds.
     *
     */
    const mobileUas = uas.filter(({ platform }) => platform !== "web");
    const androidUas = mobileUas.filter(({ platform }) => platform === "android");
    debug("send push notification", JSON.stringify({ androidUas, payload }, null, 2));
    const iosUas = mobileUas.filter(({ platform }) => platform === "ios");
    await Promise.all([
        pushSender.send("android", androidUas.map(({ pushToken }) => pushToken), payload),
        pushSender.send("ios", iosUas.map(({ pushToken }) => pushToken), payload)
    ]).then(() => { });
}
exports.sendSafe = noThrow_1.buildNoThrowProxyFunction(send);
