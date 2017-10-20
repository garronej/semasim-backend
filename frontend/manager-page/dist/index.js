"use strict";
exports.__esModule = true;
var webApi = require("../../api");
var data_1 = require("./data");
$(document).ready(function () {
    $("#new_endpoint_config").on("submit", function (event) {
        event.preventDefault();
        var panelModal = $("#panelModal");
        var h1 = panelModal.find(".panel-body h1");
        h1.html(data_1.data.wait);
        panelModal.modal("toggle");
        webApi.createUserEndpoint.makeCall($, {
            "imei": $("#imei").val(),
            "last_four_digits_of_iccid": $("#last_four_digits_of_iccid").val(),
            "pin_first_try": $("#pin_first_try").val() || undefined,
            "pin_second_try": $("#pin_second_try").val() || undefined
        }, function (status) {
            switch (status) {
                case "USER_NOT_LOGGED":
                    location.reload();
                    break;
                case "SUCCESS":
                    h1.html(data_1.data.success);
                    setTimeout(function () {
                        window.scrollTo(0, 0);
                        location.reload();
                    }, 1000);
                    break;
                default:
                    h1.html(status.toLowerCase().replace(/_/g, " "));
                    break;
            }
        });
    });
    $(".endpoint_config_delete_btn").on("click", function () {
        var imei = $(this).attr("data-semasim-imei");
        webApi.deleteUserEndpoint.makeCall($, { imei: imei }, function (status) {
            if (status === "SUCCESS" || status === "USER_NOT_LOGGED")
                location.reload();
            else
                alert(status.toLowerCase().replace(/_/g, " "));
        });
    });
});
