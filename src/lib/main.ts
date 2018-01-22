require("rejection-tracker").main(__dirname, "..", "..");

import * as sipProxy from "./sipProxy";
import * as web from "./web";

import * as _debug from "debug";
let debug = _debug("_main");

debug("Starting semasim backend");

(async () => {

    debug("Starting sip proxy server...");

    await sipProxy.start();

    debug("..sip proxy server started !");

    debug("Starting web server...");

    await web.start();

    debug("...web server started !");


})();
