require("rejection-tracker").main(__dirname, "..", "..");

import * as sipProxy from "./sipProxy";
import * as webServer from "./mainWeb";

import * as _debug from "debug";
let debug = _debug("_main");

(async () => {

    debug("Starting semasim backend...");

    debug("Starting sip proxy server...");

    await sipProxy.start();

    debug("..sip proxy server started !");

    debug("Starting web server...");

    await webServer.start();

    debug("...web server started !");


})();
