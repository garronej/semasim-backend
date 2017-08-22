
import * as backendWebApi from "./backendWebApi";

console.log("test web API!");

backendWebApi.getConfigAndUnlock.run({
    "imei": "353145038273450",
    "last_four_digits_of_iccid": "5978",
    "pin_first_try": "1234",
    "pin_second_try": "0000"
})
.then(res=> {

    console.log("SUCCESS");

    console.log(res);

})
.catch(error=> {

    console.log(error.message);

});


