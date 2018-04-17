require("rejection-tracker").main(__dirname, "..", "..");

import { types as dcTypes } from "chan-dongle-extended-client";
import * as dcMisc  from "chan-dongle-extended-client/dist/lib/misc";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import { testing as ttTesting } from "transfer-tools";
import assertSame = ttTesting.assertSame;
import { types as gwTypes } from "../semasim-gateway";
import { types as feTypes } from "../semasim-frontend";
import * as c from "../lib/_constants";

import * as db from "../lib/dbSemasim";

export const generateUa = (email: string = `${ttTesting.genHexStr(10)}@foo.com`): gwTypes.Ua => ({
    "instance": `"<urn:uuid:${ttTesting.genHexStr(30)}>"`,
    "platform": Date.now() % 2 ? "android" : "iOS",
    "pushToken": ttTesting.genHexStr(60),
    "software": ttTesting.genHexStr(20),
    "userEmail": email
});

export function generateSim(
    contactCount: number = ~~(Math.random() * 200)
): dcTypes.Sim {

    let sim: dcTypes.Sim = {
        "imsi": ttTesting.genDigits(15),
        "iccid": ttTesting.genDigits(22),
        "country": Date.now() % 2 === 0 ?
            undefined : ({
                "name": "France",
                "iso": "fr",
                "code": 33
            }),
        "serviceProvider": {
            "fromImsi": ttTesting.genUtf8Str(10),
            "fromNetwork": ttTesting.genUtf8Str(5),
        },
        "storage": {
            "number": Date.now() % 2 === 0 ?
                undefined :
                ({ "asStored": ttTesting.genDigits(10), "localFormat": `+${ttTesting.genDigits(9)}` }),
            "infos": {
                "contactNameMaxLength": ~~(Math.random() * 15),
                "numberMaxLength": ~~(Math.random() * 10),
                "storageLeft": ~~(Math.random() * 300)
            },
            "contacts": [],
            "digest": ""
        }
    };

    let index = 1;

    while (contactCount--) {

        index += ~~(Math.random() * 10) + 1;

        sim.storage.contacts.push({
            index,
            "name": {
                "asStored": ttTesting.genUtf8Str(10),
                "full": ttTesting.genUtf8Str(15)
            },
            "number": {
                "asStored": ttTesting.genDigits(10),
                "localFormat": ttTesting.genDigits(10)
            }
        });

    }

    

    sim.storage.digest = dcMisc.computeSimStorageDigest(
        sim.storage.number?sim.storage.number.asStored:undefined,
        sim.storage.infos.storageLeft,
        sim.storage.contacts
    );

    console.assert(dcSanityChecks.simStorage(sim.storage));

    return sim;

}

(async () => {

    console.log("START TESTING");

    await db.launch(c.dbAuth.host);

    await testUser();

    await testMain();

    await db.flush();

    console.log("ALL DB TESTS PASSED!");

    process.exit(0);

})();

function genIp(): string{

    let genGroup= ()=> ~~(Math.random()*255);

    return (new Array(4)).fill("").map(()=> `${genGroup()}`).join(".");
    
}

function createUserSimProxy(
    userSim: feTypes.UserSim,
    ownership: feTypes.SimOwnership.Shared.NotConfirmed
) {
    let userSimProxy: feTypes.UserSim = { ownership } as any;

    let friendlyName: string | undefined = undefined;

    Object.defineProperties(userSimProxy, {
        "sim": {
            "enumerable": true,
            "get": () => userSim.sim
        },
        "friendlyName": {
            "enumerable": true,
            "get": () => (friendlyName === undefined) ? userSim.friendlyName : friendlyName,
            "set": (value: string) => friendlyName = value
        },
        "password": {
            "enumerable": true,
            "get": () => (userSimProxy.ownership.status === "SHARED NOT CONFIRMED") ?
                "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF" : userSim.password
        },
        "dongle": {
            "enumerable": true,
            "get": ()=> userSim.dongle
        },
        "gatewayLocation": {
            "enumerable": true,
            "get": ()=> userSim.gatewayLocation
        },
        "isOnline": {
            "enumerable": true,
            "get": () => userSim.isOnline
        }
    });

    return userSimProxy;

}

//TODO: test unregister not confirmed shared sim
async function testMain() {

    await db.flush();

    const genUser = async (email: string = `${ttTesting.genHexStr(20)}@foobar.com`) =>
        ({
            "user": (await db.createUserAccount(email, ttTesting.genUtf8Str(10)))!,
            email,
            "userSims": [] as feTypes.UserSim[],
            "uas": [] as gwTypes.Ua[]
        });

    let alice = await genUser();
    let bob = await genUser();
    let carol = await genUser();
    let dave = await genUser();

    let unregisteredEmail = "eve@foobar.com";

    for (let user of [alice, bob, carol, dave]) {

        for (let _ of new Array(~~(Math.random() * 10) + 1)) {

            if (user === carol) break;

            let ua = generateUa(user.email);

            user.uas.push(ua);

            await db.addOrUpdateUa(ua);

        }

        for (let _ of new Array(~~(Math.random() * 5) + 2)) {
        //for (let _ of [ null ]) {

            if (user === dave) break;

            let userSim: feTypes.UserSim = {
                "sim": generateSim(),
                "friendlyName": ttTesting.genUtf8Str(12),
                "password": ttTesting.genHexStr(32),
                "dongle": {
                    "imei": ttTesting.genDigits(15),
                    "isVoiceEnabled": (Date.now()%2===0)?true:undefined,
                    "manufacturer": ttTesting.genUtf8Str(7),
                    "model": ttTesting.genUtf8Str(7),
                    "firmwareVersion": `1.${ttTesting.genDigits(3)}.${ttTesting.genDigits(3)}`
                },
                "gatewayLocation": {
                    "ip": genIp(),
                    "countryIso": undefined,
                    "subdivisions": undefined,
                    "city": undefined
                },
                "isOnline": true,
                "ownership": {
                    "status": "OWNED",
                    "sharedWith": {
                        "confirmed": [],
                        "notConfirmed": []
                    }
                }
            };

            await db.addGatewayLocation(userSim.gatewayLocation.ip);

            await (async () => {

                let [row] = await db.query(
                    `SELECT * FROM gateway_location WHERE ip= ${db.esc(userSim.gatewayLocation.ip)}`
                );

                userSim.gatewayLocation.countryIso = row["country_iso"] || undefined;
                userSim.gatewayLocation.subdivisions = row["subdivisions"] || undefined;
                userSim.gatewayLocation.city = row["city"] || undefined;

            })();

            user.userSims.push(userSim);

            assertSame(
                await db.registerSim( 
                    user.user, 
                    userSim.sim, 
                    userSim.friendlyName, 
                    userSim.password, 
                    userSim.dongle, 
                    userSim.gatewayLocation.ip
                ),
                user.uas
            );

        }

        assertSame(
            await db.getUserSims(user.user),
            user.userSims
        );

    }


    (alice.userSims[0].ownership as feTypes.SimOwnership.Owned)
        .sharedWith.notConfirmed = [bob.email, carol.email, dave.email, unregisteredEmail];

    let sharingRequestMessage = ttTesting.genUtf8Str(50);

    for (let user of [bob, carol, dave]) {

        user.userSims.push(createUserSimProxy(alice.userSims[0], {
            "status": "SHARED NOT CONFIRMED",
            "ownerEmail": alice.email,
            sharingRequestMessage
        }));

    }

    //TODO: compare emails that we get
    assertSame(
        await db.shareSim(
            { "user": alice.user, "email": alice.email },
            alice.userSims[0].sim.imsi,
            (alice.userSims[0].ownership as feTypes.SimOwnership.Owned).sharedWith.notConfirmed,
            sharingRequestMessage
        ),
        {
            "registered": [ bob.email, carol.email, dave.email ],
            "notRegistered": [ unregisteredEmail ]
        }
    );

    for (let user of [alice, bob, carol, dave]) {

        assertSame(await db.getUserSims(user.user), user.userSims);

    }

    let uasRegisteredToSim: gwTypes.Ua[] = [...alice.uas];

    for (let user of [bob, carol, dave]) {

        user.userSims[user.userSims.length - 1].friendlyName = ttTesting.genUtf8Str(12);

        user.userSims[user.userSims.length - 1].ownership = {
            "status": "SHARED CONFIRMED",
            "ownerEmail": alice.email
        };

        (alice.userSims[0].ownership as feTypes.SimOwnership.Owned)
            .sharedWith.notConfirmed = (() => {

                let set = new Set(
                    (alice.userSims[0].ownership as feTypes.SimOwnership.Owned)
                        .sharedWith.notConfirmed
                );

                set.delete(user.email);

                return Array.from(set);

            })();

        (alice.userSims[0].ownership as feTypes.SimOwnership.Owned)
            .sharedWith.confirmed.push(user.email);

        uasRegisteredToSim = [...uasRegisteredToSim, ...user.uas];

        assertSame(
            await db.setSimFriendlyName(
                user.user,
                alice.userSims[0].sim.imsi,
                user.userSims[user.userSims.length - 1].friendlyName
            ),
            user.uas
        );

        assertSame(await db.getUserSims(user.user), user.userSims);

        assertSame(await db.getUserSims(alice.user), alice.userSims);

        assertSame(
            await db.setSimOnline(
                alice.userSims[0].sim.imsi,
                alice.userSims[0].password,
                alice.userSims[0].gatewayLocation.ip,
                alice.userSims[0].dongle
            ),
            {
                "isSimRegistered": true,
                "storageDigest": alice.userSims[0].sim.storage.digest,
                "passwordStatus": "UNCHANGED",
                uasRegisteredToSim
            }
        );

    }

    alice.userSims[0].isOnline = false;

    await db.setSimOffline(alice.userSims[0].sim.imsi);

    for (let user of [alice, bob, carol, dave]) {
        assertSame(await db.getUserSims(user.user), user.userSims);
    }

    assertSame(
        await db.setSimOnline(
            ttTesting.genDigits(15),
            alice.userSims[0].password,
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle
        ),
        { "isSimRegistered": false }
    );

    alice.userSims[0].isOnline = true;
    alice.userSims[0].dongle.isVoiceEnabled = false;


    assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "UNCHANGED",
            "uasRegisteredToSim": [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        }
    );

    for (let user of [alice, bob, carol, dave]) {
        assertSame(await db.getUserSims(user.user), user.userSims);
    }

    alice.userSims[0].password = ttTesting.genHexStr(32);

    assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "RENEWED",
            "uasRegisteredToSim": [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        }
    );

    for (let user of [alice, bob, carol, dave]) {
        assertSame(await db.getUserSims(user.user), user.userSims);
    }

    alice.userSims[0].friendlyName = ttTesting.genUtf8Str(11);

    assertSame(
        await db.setSimFriendlyName(
            alice.user,
            alice.userSims[0].sim.imsi,
            alice.userSims[0].friendlyName
        ),
        alice.uas
    );

    assertSame(
        await db.getSimOwner(alice.userSims[0].sim.imsi),
        { "user": alice.user, "email": alice.email }
    );

    bob.userSims.pop();
    carol.userSims.pop();

    (alice.userSims[0].ownership as feTypes.SimOwnership.Owned)
        .sharedWith.confirmed = (() => {

            let set = new Set(
                (alice.userSims[0].ownership as feTypes.SimOwnership.Owned)
                    .sharedWith.confirmed
            );

            set.delete(bob.email);
            set.delete(carol.email);

            return Array.from(set);

        })();

    assertSame(
        await db.stopSharingSim(
            alice.user,
            alice.userSims[0].sim.imsi,
            [bob.email, carol.email]
        ),
        [...bob.uas, ...carol.uas]
    );

    for (let user of [alice, bob, carol, dave]) {
        assertSame(await db.getUserSims(user.user), user.userSims);
    }

    assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "NEED RENEWAL",
            "uasRegisteredToSim": [...alice.uas, ...dave.uas]
        }
    );

    alice.userSims[0].password = ttTesting.genHexStr(32);

    assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "RENEWED",
            "uasRegisteredToSim": [...alice.uas, ...dave.uas]
        }
    );

    for (let user of [alice, dave]) {
        assertSame(await db.getUserSims(user.user), user.userSims);
    }


    dave.userSims.pop();

    (alice.userSims[0].ownership as feTypes.SimOwnership.Owned)
        .sharedWith.confirmed = [];

    assertSame(
        await db.unregisterSim(dave.user, alice.userSims[0].sim.imsi),
        dave.uas
    );

    assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "UNCHANGED",
            "uasRegisteredToSim": alice.uas
        }
    );

    for (let user of [alice, dave]) {
        assertSame(await db.getUserSims(user.user), user.userSims);
    }

    let eve = await genUser(unregisteredEmail);

    eve.userSims.push(createUserSimProxy(alice.userSims[0], {
        "status": "SHARED NOT CONFIRMED",
        "ownerEmail": alice.email,
        "sharingRequestMessage": sharingRequestMessage
    }));

    assertSame(await db.getUserSims(eve.user), eve.userSims);

    for (let _ of new Array(~~(Math.random() * 2) + 1)) {

        let ua = generateUa(eve.email);

        eve.uas.push(ua);

        await db.addOrUpdateUa(ua);

    }

    eve.userSims.pop();

    assertSame(
        await db.unregisterSim(
            alice.user,
            alice.userSims.shift()!.sim.imsi
        ),
        alice.uas
    );

    for (let user of [alice, eve]) {
        assertSame(await db.getUserSims(user.user), user.userSims);
    }

    let dongles: dcTypes.Dongle.Usable[] = [
        {
            "imei": ttTesting.genDigits(15),
            "manufacturer": "Whatever",
            "model": "Foo Bar",
            "firmwareVersion": "1.000.223",
            "isVoiceEnabled": true,
            "sim": generateSim()
        },
        {
            "imei": ttTesting.genDigits(15),
            "manufacturer": alice.userSims[0].dongle.manufacturer,
            "model": alice.userSims[0].dongle.model,
            "firmwareVersion": alice.userSims[0].dongle.firmwareVersion,
            "isVoiceEnabled": alice.userSims[0].dongle.isVoiceEnabled,
            "sim": alice.userSims[0].sim,
        }
    ];

    assertSame(
        await db.filterDongleWithRegistrableSim(
            alice.user,
            dongles
        ),
        [dongles[0]]
    );

    console.log("PASS MAIN");

}

async function testUser() {

    await db.flush();

    let email = "joseph.garrone.gj@gmail.com";

    let password = "fooBarBazBazBaz";

    let user = await db.createUserAccount(email, password);

    console.assert(typeof user === "number");

    console.assert(
        undefined === await db.createUserAccount(email, password)
    );

    console.assert(
        undefined === await db.createUserAccount(email, "anotherPass")
    );

    console.assert(
        user === await db.authenticateUser(email, password)
    );

    console.assert(
        undefined === await db.authenticateUser(email, "not password")
    );

    console.assert(
        await db.deleteUser(user!)
    );

    console.assert(
        false === await db.deleteUser(220333)
    );

    console.assert(
        undefined === await db.authenticateUser(email, password)
    );

    let { insertId } = await db.query([
        "INSERT INTO user",
        "   (email, salt, hash)",
        "VALUES",
        `   ( ${db.esc(email)}, '', '')`
    ].join("\n"));

    user = insertId;

    console.assert(
        undefined === await db.authenticateUser(email, password)
    );

    console.assert(
        user === await db.createUserAccount(email, password)
    );

    console.assert(
        user === await db.authenticateUser(email, password)
    );

    console.assert(
        undefined === await db.authenticateUser(email, "not password")
    );

    console.assert(
        await db.deleteUser(user!)
    );

    console.assert(
        undefined === await db.authenticateUser(email, password)
    );

    await db.flush();

    console.log("TEST USER PASS");

}
