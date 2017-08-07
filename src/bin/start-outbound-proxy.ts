import * as sipProxy from "../lib/sipProxy/outbound";

(async ()=>{

    console.log("Starting sip proxy server...");

    await sipProxy.startServer();

    console.log("Sip proxy server started !");

})();

