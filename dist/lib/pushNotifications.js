"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const pushSender = require("../tools/pushSender");
const deploy_1 = require("../deploy");
function launch() {
    pushSender.launch(deploy_1.deploy.pushNotificationCredentials);
}
exports.launch = launch;
/** Return true if everything goes as expected */
function send(uas, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        /*
         * NOTE IMPLEMENTATION IOS:
         *
         * Until commit 53957ba1e4344593caf42feba24df48520c2f954 we had
         * a mechanism that prevented to send multiple push notification
         * simultaneously to the same UA.
         * For android we had no delay, for iOS we had 10 seconds.
         *
         */
        const mobileUas = uas.filter(({ platform }) => platform !== "web");
        const androidUas = mobileUas.filter(({ platform }) => platform === "android");
        const iosUas = mobileUas.filter(({ platform }) => platform === "iOS");
        return Promise.all([
            pushSender.send("android", androidUas.map(({ pushToken }) => pushToken), payload),
            pushSender.send("iOS", iosUas.map(({ pushToken }) => pushToken), payload)
        ]).then(() => { });
    });
}
exports.send = send;
