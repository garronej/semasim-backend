require("rejection-tracker").main(__dirname, "..", "..");

import * as sipProxy from "../lib/outboundSipProxy";

(async ()=>{

    console.log("Starting sip proxy server...");

    await sipProxy.startServer();

    console.log("Sip proxy server started !");

})();
