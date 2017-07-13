"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tls = require("tls");
var fs = require("fs");
var path = require("path");
var method = process.argv[2];
var port = 8000;
if (method === "server") {
    console.log("starting server");
    var pathToCerts = path.join("/", "home", "admin", "ns.semasim.com");
    var key = fs.readFileSync(path.join(pathToCerts, "privkey1.pem"), "utf8");
    var cert = fs.readFileSync(path.join(pathToCerts, "fullchain1.pem"), "utf8");
    var ca = fs.readFileSync(path.join(pathToCerts, "chain1.pem"), "utf8");
    var options = { key: key, cert: cert, ca: ca };
    var server = tls.createServer(options);
    server.on("secureConnection", function (socket) {
        console.log('server connected', socket.authorized ? 'authorized' : 'unauthorized');
        socket.on("data", function (chunk) { return console.log("data received from client: ", chunk.toString("utf8")); });
        socket.write('data send from server!\n');
    });
    server.listen(port, function () { return console.log('server bound'); });
}
else {
    console.log("starting client");
    var socket_1 = tls.connect({ "host": "ns.semasim.com", port: port });
    console.log("encrypted (at creation time): ", socket_1.encrypted);
    socket_1.on("secureConnect", function () {
        console.log('client connected', socket_1.authorized ? 'authorized' : 'unauthorized');
    });
    socket_1.on("data", function (chunk) {
        console.log("data received from server: ", chunk.toString("utf8"));
        socket_1.write("data sent from client\n");
    });
}
