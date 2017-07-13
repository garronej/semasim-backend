import * as tls from "tls";
import * as fs from "fs";
import * as path from "path";


let method = process.argv[2];

let port = 8000;

if (method === "server") {

    console.log("starting server");

    let pathToCerts = path.join("/", "home", "admin", "ns.semasim.com");

    let key = fs.readFileSync(path.join(pathToCerts, "privkey1.pem"), "utf8");
    let cert = fs.readFileSync(path.join(pathToCerts, "fullchain1.pem"), "utf8");
    let ca = fs.readFileSync(path.join(pathToCerts, "chain1.pem"), "utf8");


    let options: tls.TlsOptions = { key, cert, ca };


    const server = tls.createServer(options);

    server.on("secureConnection", socket => {

        console.log('server connected', socket.authorized ? 'authorized' : 'unauthorized');

        socket.on("data", chunk => console.log("data received from client: ", chunk.toString("utf8")));

        socket.write('data send from server!\n');

    });

    server.listen(port, () => console.log('server bound'));

} else {

    console.log("starting client");

    let socket = tls.connect({ "host": "ns.semasim.com", port });

    console.log("encrypted (at creation time): ", (socket as any).encrypted);

    socket.on("secureConnect", () => {

        console.log('client connected', socket.authorized ? 'authorized' : 'unauthorized');

    });

    socket.on("data", chunk => {

        console.log("data received from server: ", chunk.toString("utf8"));

        socket.write("data sent from client\n");

    });

}



