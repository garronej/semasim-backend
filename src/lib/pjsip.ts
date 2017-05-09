import { execQueue, ExecQueue } from "ts-exec-queue";
import { DongleExtendedClient } from "chan-dongle-extended-client";
import * as mysql from "mysql";
import { SyncEvent } from "ts-events-extended";

const dbParams = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "abcde12345"
};

const connection = mysql.createConnection({
    ...dbParams,
    "database": "asterisk",
    "multipleStatements": true
});

function query(sql: string, values?: any[]): Promise<any> {

    return new Promise<any>((resolve, reject) => {

        let r=connection.query(sql, values || [], (err, results) => err ? reject(err) : resolve(results));

        //console.log(r.sql);



    });

}


let isInit = false;

const authId = "semasim-default-auth";

async function init() {

    //TODO init sip stack.
    //Delete all contacts

    await query(
        [
            "INSERT INTO `ps_auths`",
            "(`id`, `auth_type`, `username`, `password`) VALUES (?, ?, ?, ?)",
            "ON DUPLICATE KEY UPDATE",
            "`auth_type`= VALUES(`auth_type`), `username`= VALUES(`username`), `password`= VALUES(`password`)"
        ].join("\n"),
        [
            authId, "userpass", "admin", "admin"
        ]
    );

    isInit = true;

}

const cluster = {};

export type ContactStatus= "Avail" | "Unavail" | "Unknown";


export namespace pjsip {

    export const addEndpoint = execQueue(cluster, "DB_WRITE",
        async (imei: string, callback?: () => void) => {

            console.log("addEndpoint", imei);

            if (!isInit) await init();

            /*

            let results = await query("SELECT `id` FROM `ps_endpoints` WHERE `id`= ?", [imei]);

            if (results.length)
                return callback!();
            */



            await query(
                [
                    "INSERT INTO `ps_aors`",
                    "(`id`,`max_contacts`,`qualify_frequency`) VALUES (?, ?, ?)",
                    "ON DUPLICATE KEY UPDATE",
                    "`max_contacts`= VALUES(`max_contacts`),",
                    "`qualify_frequency`= VALUES(`qualify_frequency`)",
                    ";",
                    "INSERT INTO `ps_endpoints`",
                    "(`id`,`disallow`,`allow`,`context`,`message_context`, `aors`, `auth`) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    "ON DUPLICATE KEY UPDATE",
                    "`disallow`= VALUES(`disallow`),",
                    "`allow`= VALUES(`allow`),",
                    "`context`= VALUES(`context`),",
                    "`message_context`= VALUES(`message_context`),",
                    "`aors`= VALUES(`aors`),",
                    "`auth`= VALUES(`auth`)"
                ].join("\n"),
                [
                    imei, 12, 5,
                    imei, "all", "alaw,ulaw", "from-sip-call", "from-sip-message", imei, authId
                ]
            );

            return callback!();

        }
    );

    export function getContacts(): Promise<{
        [endpoint: string]: {
            status: ContactStatus;
            contact: string;
        }[]
    }> {

        return new Promise<any>(async resolve => {

            let ami = DongleExtendedClient.localhost().ami;

            let proxyEvt = ami.evt.createProxy();

            ami.postAction(
                { "action": "PJSIPShowEndpoints" }
            ).catch(error => {

                proxyEvt.stopWaiting();

                resolve({});

            });


            let actionId = ami.lastActionId;

            let contactsByEndpoint: { [endpoint: string]: string[]; } = {};

            while (true) {

                let evt = await proxyEvt.waitFor(evt => evt.actionid === actionId );

                console.log({ evt });

                if (evt.event === "EndpointListComplete") break;

                let endpoint = evt.objectname;
                let concatContacts = evt.contacts;

                let contacts = concatContacts.split(",");

                contacts.pop();

                contactsByEndpoint[endpoint] = contacts;

            }

            let out: {
                [endpoint: string]: {
                    status: ContactStatus;
                    contact: string;
                }[];
            } = {};

            for (let endpoint of Object.keys(contactsByEndpoint)) {

                let contacts = contactsByEndpoint[endpoint];

                out[endpoint] = [];

                for (let contact of contacts) {

                    let status = await getContactStatus(contact);

                    if (!status) continue;

                    out[endpoint].push({ contact, status });

                }
            }

            resolve(out);

        });




    }

    export async function getContactStatus(contact: string): Promise<ContactStatus | undefined> {

        let resp = await DongleExtendedClient.localhost().ami.postAction({
            "action": "Command",
            "Command": `pjsip show contact ${contact}`
        });

        try {

            return resp.content.split("\n")[7].match(
                /^[ \t]*Contact:[ \t]*[^ \t]+[ \t]*[0-9a-fA-F]+[ \t]*([^ \t]+).*$/
            )[1];

        } catch (error) {

            return undefined;

        }

    }

    export async function getAvailableEndpointContacts(endpoint: string): Promise<string[]> {

        let contacts = (await getContacts())[endpoint] || [];

        let availableContacts: string[] = [];

        for (let { contact, status } of contacts) {

            if (status !== "Avail") continue;

            availableContacts.push(contact);

        }

        return availableContacts;

    }

    export const evtNewContact = new SyncEvent<string>();

}


pjsip.getContacts().then(contacts => console.log(JSON.stringify(contacts, null, 2)));



/*
DongleExtendedClient.localhost().ami.evt.attach(managerEvt => {
    if (managerEvt.event === "UserEvent") return;

    console.log({ managerEvt });
});
*/

DongleExtendedClient.localhost().ami.evt.attach(
    managerEvt => managerEvt.event === "ContactStatus",
    contactStatus => console.log({ contactStatus })
);

/*
DongleExtendedClient.localhost().ami.evt.attach( 
    managerEvt => managerEvt.event === "PeerStatus",
    peerStatusEvt => console.log( { peerStatusEvt })
);


DongleExtendedClient.localhost().ami.evt.attach( 
    managerEvt => managerEvt.event === "DeviceStateChange",
    deviceStatusEvt => console.log( { deviceStatusEvt })
);
*/

DongleExtendedClient.localhost().ami.evt.attach(
    managerEvt => managerEvt.event === "ChallengeSent",
    async challengeSendEvt => {

        try {

            await DongleExtendedClient.localhost().ami.evt.waitFor(
                managerEvt => (
                    managerEvt.event === "SuccessfulAuth" &&
                    challengeSendEvt.sessionid === managerEvt.sessionid
                )
            );

            console.log(`${challengeSendEvt.accountid} successfully authenticated`);

        } catch (timeoutError) {

            console.log(`${challengeSendEvt.accountid} authentication failed`);
        }


    }
);
