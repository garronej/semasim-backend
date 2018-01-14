"use strict";
exports.__esModule = true;
var ts_events_extended_1 = require("ts-events-extended");
require("../templates/SimRow.less");
var SimRow = /** @class */ (function () {
    function SimRow(userSim) {
        var _this = this;
        this.userSim = userSim;
        this.evtSelected = new ts_events_extended_1.VoidSyncEvent();
        this.isSelected = false;
        this.structure = $(require("../templates/SimRow.html"));
        this.structure.click(function () {
            if (!_this.isSelected) {
                _this.isSelected = true;
                _this.structure.find(".id_row").addClass("selected");
                _this.evtSelected.post();
            }
        });
        this.setDetailsVisibility("HIDDEN");
        this.populate();
    }
    SimRow.prototype.unselect = function () {
        this.structure.find(".id_row").removeClass("selected");
        this.isSelected = false;
    };
    SimRow.prototype.setDetailsVisibility = function (visibility) {
        var details = this.structure.find(".id_details");
        switch (visibility) {
            case "SHOWN":
                details.show();
                break;
            case "HIDDEN":
                details.hide();
                break;
        }
    };
    SimRow.prototype.setVisibility = function (visibility) {
        switch (visibility) {
            case "SHOWN":
                this.structure.show();
                break;
            case "HIDDEN":
                this.structure.hide();
                break;
        }
    };
    SimRow.prototype.populate = function () {
        var _this = this;
        var number = this.userSim.sim.storage.number;
        this.structure.find(".id_simId").text(this.userSim.friendlyName + (number ? " ( " + number + " )" : ""));
        this.structure.find(".id_connectivity").text(this.userSim.isOnline ? "online" : "offline");
        if (!this.userSim.isOnline) {
            this.structure.find(".id_row").addClass("offline");
        }
        this.structure.find(".id_ownership").text((this.userSim.ownership.status === "OWNED") ?
            "Owned" :
            "owned by: " + this.userSim.ownership.ownerEmail);
        this.structure.find(".id_connectivity").text(this.userSim.isOnline ? "Online" : "Offline");
        this.structure.find("id_owner").text((this.userSim.ownership.status === "OWNED") ?
            "Me" : this.userSim.ownership.ownerEmail);
        this.structure.find("id_number").text(this.userSim.sim.storage.number ?
            this.userSim.sim.storage.number :
            "Unknown");
        this.structure.find("id_features").text((function () {
            switch (_this.userSim.isVoiceEnabled) {
                case undefined:
                    return "Probably SMS only";
                case true:
                    return "Voice calls + SMS";
                case false:
                    return "SMS only";
            }
        })());
        this.structure.find(".id_serviceProvider").text((function () {
            if (_this.userSim.sim.serviceProvider.fromImsi) {
                return _this.userSim.sim.serviceProvider.fromImsi;
            }
            if (_this.userSim.sim.serviceProvider.fromNetwork) {
                return _this.userSim.sim.serviceProvider.fromNetwork;
            }
            return "Unknown";
        })());
        this.structure.find(".id_imsi").text(this.userSim.sim.imsi);
        this.structure.find(".id_iccid").text(this.userSim.sim.iccid);
        this.structure.find(".id_phonebook").text((function () {
            var n = _this.userSim.sim.storage.contacts.length;
            var tot = n + _this.userSim.sim.storage.infos.storageLeft;
            return n + "/" + tot;
        })());
    };
    return SimRow;
}());
exports.SimRow = SimRow;
