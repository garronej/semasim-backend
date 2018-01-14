"use strict";
exports.__esModule = true;
var ts_events_extended_1 = require("ts-events-extended");
var ButtonBar = /** @class */ (function () {
    function ButtonBar() {
        var _this = this;
        this.evtClickBack = new ts_events_extended_1.VoidSyncEvent();
        this.evtClickDetail = new ts_events_extended_1.VoidSyncEvent();
        this.evtClickDelete = new ts_events_extended_1.VoidSyncEvent();
        this.evtClickShare = new ts_events_extended_1.VoidSyncEvent();
        this.evtClickPhonebook = new ts_events_extended_1.VoidSyncEvent();
        this.evtClickRename = new ts_events_extended_1.VoidSyncEvent();
        this.evtClickRefresh = new ts_events_extended_1.VoidSyncEvent();
        this.structure = $(require("../templates/ButtonBar.html"));
        this.buttons = this.structure.find("button");
        this.btnDetail = $(this.buttons.get(0));
        this.btnBack = $(this.buttons.get(1));
        this.btnDelete = $(this.buttons.get(2));
        this.btnShare = $(this.buttons.get(3));
        this.btnPhonebook = $(this.buttons.get(4));
        this.btnRename = $(this.buttons.get(5));
        this.btnReload = $(this.buttons.get(6));
        this.btnDetail.click(function () {
            _this.setState({ "areDetailsShown": true });
            _this.evtClickDetail.post();
        });
        this.btnBack.click(function () {
            _this.setState({ "areDetailsShown": false });
            _this.evtClickBack.post();
        });
        this.btnDelete.click(function () { return _this.evtClickDelete.post(); });
        this.btnRename.click(function () { return _this.evtClickRename.post(); });
        this.btnReload.click(function () { return _this.evtClickRefresh.post(); });
        this.state = {
            "isSimRowSelected": false,
            "areDetailsShown": false,
            "isSimSharable": false
        };
        this.setState({});
    }
    ButtonBar.prototype.setState = function (state) {
        var _this = this;
        for (var key in state) {
            this.state[key] = state[key];
        }
        this.buttons.removeClass("disabled");
        this.btnDetail.show();
        this.btnBack.show();
        if (!this.state.isSimRowSelected) {
            this.buttons.each(function (i) {
                var button = $(_this.buttons[i]);
                if (button.get(0) !== _this.btnReload.get(0)) {
                    button.addClass("disabled");
                }
            });
        }
        if (this.state.areDetailsShown) {
            this.btnDetail.hide();
        }
        else {
            this.btnBack.hide();
        }
        if (!this.state.isSimSharable) {
            this.btnShare.addClass("disabled");
        }
    };
    return ButtonBar;
}());
exports.ButtonBar = ButtonBar;
