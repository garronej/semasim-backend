require("rejection-tracker").main(__dirname, "..", "..");

import * as sipProxy from "./outboundSipProxy";
import * as webApi from "./webApi";

(async ()=>{

    console.log("Starting sip proxy server...");

    await sipProxy.startServer();

    console.log("Sip proxy server started !");

    await webApi.startServer();

    console.log("Web API started");

})();
