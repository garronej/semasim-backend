require("rejection-tracker").main(__dirname, "..", "..");

import * as backendSipProxy from "./backendSipProxy";
import * as backendWebApi from "./backendWebApi";

(async ()=>{

    console.log("Starting semasim backend");

    await backendSipProxy.startServer();

    console.log("Sip proxy server started !");

    await backendWebApi.startServer();

    console.log("Web API started");

})();
