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
//TODO: implement
var logoutUser;
(function (logoutUser) {
    logoutUser.methodName = "logout-user";
})(logoutUser = exports.logoutUser || (exports.logoutUser = {}));
//TODO: implement
var sendRenewPasswordEmail;
(function (sendRenewPasswordEmail) {
    sendRenewPasswordEmail.methodName = "send-renew-password-email";
})(sendRenewPasswordEmail = exports.sendRenewPasswordEmail || (exports.sendRenewPasswordEmail = {}));
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
    var UserSim;
    (function (UserSim) {
        var Owned;
        (function (Owned) {
            function match(userSim) {
                return userSim.ownership.status === "OWNED";
            }
            Owned.match = match;
        })(Owned = UserSim.Owned || (UserSim.Owned = {}));
        var Shared;
        (function (Shared) {
            function match(userSim) {
                return Confirmed.match(userSim) || NotConfirmed.match(userSim);
            }
            Shared.match = match;
            var Confirmed;
            (function (Confirmed) {
                function match(userSim) {
                    return userSim.ownership.status === "SHARED CONFIRMED";
                }
                Confirmed.match = match;
            })(Confirmed = Shared.Confirmed || (Shared.Confirmed = {}));
            var NotConfirmed;
            (function (NotConfirmed) {
                function match(userSim) {
                    return userSim.ownership.status === "SHARED NOT CONFIRMED";
                }
                NotConfirmed.match = match;
            })(NotConfirmed = Shared.NotConfirmed || (Shared.NotConfirmed = {}));
        })(Shared = UserSim.Shared || (UserSim.Shared = {}));
        var Usable;
        (function (Usable) {
            function match(userSim) {
                return Owned.match(userSim) || Shared.Confirmed.match(userSim);
            }
            Usable.match = match;
        })(Usable = UserSim.Usable || (UserSim.Usable = {}));
    })(UserSim = Types.UserSim || (Types.UserSim = {}));
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
