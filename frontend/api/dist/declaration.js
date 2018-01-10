"use strict";
exports.__esModule = true;
exports.apiPath = "api";
var registerUser;
(function (registerUser) {
    registerUser.methodName = "register-user";
})(registerUser = exports.registerUser || (exports.registerUser = {}));
var loginUser;
(function (loginUser) {
    loginUser.methodName = "login-user";
})(loginUser = exports.loginUser || (exports.loginUser = {}));
var getSims;
(function (getSims) {
    getSims.methodName = "get-sim";
})(getSims = exports.getSims || (exports.getSims = {}));
var getUnregisteredLanDongles;
(function (getUnregisteredLanDongles) {
    getUnregisteredLanDongles.methodName = "get-unregistered-lan-dongles";
})(getUnregisteredLanDongles = exports.getUnregisteredLanDongles || (exports.getUnregisteredLanDongles = {}));
var unlockSim;
(function (unlockSim) {
    unlockSim.methodName = "unlock-sim";
})(unlockSim = exports.unlockSim || (exports.unlockSim = {}));
var registerSim;
(function (registerSim) {
    registerSim.methodName = "register-sim";
})(registerSim = exports.registerSim || (exports.registerSim = {}));
var unregisterSim;
(function (unregisterSim) {
    unregisterSim.methodName = "unregister-sim";
})(unregisterSim = exports.unregisterSim || (exports.unregisterSim = {}));
var shareSim;
(function (shareSim) {
    shareSim.methodName = "share-sim";
})(shareSim = exports.shareSim || (exports.shareSim = {}));
var stopSharingSim;
(function (stopSharingSim) {
    stopSharingSim.methodName = "stop-sharing-sim";
})(stopSharingSim = exports.stopSharingSim || (exports.stopSharingSim = {}));
/** Used for accepting sharing request or changing name */
var setSimFriendlyName;
(function (setSimFriendlyName) {
    setSimFriendlyName.methodName = "set-sim-friendly-name";
})(setSimFriendlyName = exports.setSimFriendlyName || (exports.setSimFriendlyName = {}));
var getUaConfig;
(function (getUaConfig) {
    //TODO: change after client updated
    getUaConfig.methodName = "get-user-linphone-config";
})(getUaConfig = exports.getUaConfig || (exports.getUaConfig = {}));
var Types;
(function (Types) {
    //Imported
    var LockedDongle;
    (function (LockedDongle) {
        function match(dongle) {
            return dongle.sim.pinState !== undefined;
        }
        LockedDongle.match = match;
    })(LockedDongle = Types.LockedDongle || (Types.LockedDongle = {}));
    var ActiveDongle;
    (function (ActiveDongle) {
        function match(dongle) {
            return !LockedDongle.match(dongle);
        }
        ActiveDongle.match = match;
    })(ActiveDongle = Types.ActiveDongle || (Types.ActiveDongle = {}));
})(Types = exports.Types || (exports.Types = {}));
var JSON;
(function (JSON) {
    function stringify(obj) {
        if (obj === undefined) {
            return "undefined";
        }
        return global.JSON.stringify([obj]);
    }
    JSON.stringify = stringify;
    function parse(str) {
        if (str === "undefined") {
            return undefined;
        }
        return global.JSON.parse(str).pop();
    }
    JSON.parse = parse;
})(JSON = exports.JSON || (exports.JSON = {}));