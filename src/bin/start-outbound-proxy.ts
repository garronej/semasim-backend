
import * as sipProxy from "../lib/sipProxy/outbound";
import * as webApi from "../lib/sipProxy/outbound.webApi";

(async ()=>{

    console.log("Starting web api server...");

    await webApi.startServer();

    console.log("Web api server started");

    console.log("Starting sip proxy server...");

    await sipProxy.startServer();

    console.log("Sip proxy server started!")


})();

