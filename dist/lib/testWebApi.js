"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var backendWebApi = require("./backendWebApi");
console.log("test web API!");
backendWebApi.getConfigAndUnlock.run({
    "imei": "353145038273450",
    "last_four_digits_of_iccid": "5978",
    "pin_first_try": "1234",
    "pin_second_try": "0000"
})
    .then(function (res) {
    console.log("SUCCESS");
    console.log(res);
})
    .catch(function (error) {
    console.log(error.message);
});
