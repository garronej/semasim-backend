import * as fbAdmin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

export class c {

    public static readonly dbParamsGateway = {
        "host": "127.0.0.1",
        "user": "root",
        "password": "abcde12345",
        "database": "semasim"
    };

    private static __dbParamsBackend__: { 
        host: string; 
        user: string; 
        password: string;
        database: string;
    } | undefined= undefined;

    public static get dbParamsBackend() {

        if( this.__dbParamsBackend__ ) return this.__dbParamsBackend__;

        this.__dbParamsBackend__ ={
            ...c.dbParamsGateway,
            "password": fs.readFileSync(
                path.join("/", "home", "admin", "mysql_root_user_password.txt"), "utf8"
            ).replace(/\s/g, ""),
            "database": "semasim_backend"
        };

        return this.__dbParamsBackend__;

    }

    public static readonly gain = `${4000}`;

    public static readonly jitterBuffer = {
        //type: "fixed",
        //params: "2500,10000"
        //type: "fixed",
        //params: "default"
        type: "adaptive",
        params: "default"
    };

    //TODO: not defined here get from chan-dongle-extended-client
    public static readonly dongleCallContext = "from-dongle";

    public static readonly phoneNumber = "_[+0-9].";

    public static readonly sipCallContext = "from-sip-call";

    public static readonly sipMessageContext = "from-sip-message";

    public static get serviceAccount(): fbAdmin.ServiceAccount {

        return require(
            path.join(__dirname, "..", "..", "res", "semasimdev-firebase-adminsdk.json")
        );

    }

    public static readonly backendSipProxyListeningPortForGateways = 50610;

    public static readonly flowTokenKey = "flowtoken";

    public static readonly backendHostname = "semasim.com";

    private static __tlsOptions__: {
        key: string;
        cert: string;
        ca: string;
    } | undefined= undefined;

    public static get tlsOptions() {

        if( this.__tlsOptions__ ) return this.__tlsOptions__;

        let pathToCerts = path.join("/", "home", "admin", "ns.semasim.com");

        let key = fs.readFileSync(path.join(pathToCerts, "privkey2.pem"), "utf8");
        let cert = fs.readFileSync(path.join(pathToCerts, "fullchain2.pem"), "utf8");
        let ca = fs.readFileSync(path.join(pathToCerts, "chain2.pem"), "utf8");

        this.__tlsOptions__= { key, cert, ca };

        return this.__tlsOptions__;

    }

    public static readonly webApiPath = "api";
    public static readonly webApiPort = 4430;

    public static readonly reg_expires = 21600;

    public static readonly regExpImei= /^[0-9]{15}$/;

    public static readonly regExpEmail= 
/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    public static readonly regExpPassword= /^[0-9a-zA-Z]{6,}$/;

    public static readonly regExpFourDigits= /^[0-9]{4}$/;

}