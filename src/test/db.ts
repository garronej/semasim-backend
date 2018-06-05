require("rejection-tracker").main(__dirname, "..", "..");

//NOTE: must be run on load balancer.

import { types as dcTypes } from "chan-dongle-extended-client";
import * as dcMisc from "chan-dongle-extended-client/dist/lib/misc";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import { testing as ttTesting } from "transfer-tools";
import assertSame = ttTesting.assertSame;
import { types as gwTypes } from "../semasim-gateway";
import { types as feTypes } from "../semasim-frontend";
import * as c from "../lib/_constants";

import * as mysqlCustom from "../tools/mysqlCustom";

import * as db from "../lib/dbSemasim";

export const generateUa = (email: string = `${ttTesting.genHexStr(10)}@foo.com`): gwTypes.Ua => ({
    "instance": `"<urn:uuid:${ttTesting.genHexStr(30)}>"`,
    "platform": Date.now() % 2 ? "android" : "iOS",
    "pushToken": ttTesting.genHexStr(60),
    "software": ttTesting.genHexStr(20),
    "userEmail": email
});

function genUniqNumber(): string{

    const c= `${genUniqNumber.counter++}`;

    return "+33" + (new Array(8-c.length)).fill("0").join("") + c;

}

namespace genUniqNumber {
    export let counter= 0;
}

export function generateSim(
    contactCount = ~~(Math.random() * 200)
    //contactCount: number = 1
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
                undefined : genUniqNumber(),
            "infos": {
                "contactNameMaxLength": 15,
                "numberMaxLength": 20,
                "storageLeft": 800
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
            "name": ttTesting.genHexStr(5),
            "number": genUniqNumber()
        });

    }

    sim.storage.digest = dcMisc.computeSimStorageDigest(
        sim.storage.number,
        sim.storage.infos.storageLeft,
        sim.storage.contacts
    );

    console.assert(dcSanityChecks.simStorage(sim.storage));

    return sim;

}

(async () => {

    console.log("START TESTING...");

    await db.launch(c.dbAuth.host);

    (await mysqlCustom.connectAndGetApi({
        ...c.dbAuth,
        "database": "semasim_express_session",
        "localAddress": c.dbAuth.host 
    })).query("DELETE FROM sessions");

    await testUser();

    await testMain();

    await db.flush();

    console.log("ALL DB TESTS PASSED!");

    process.exit(0);

})();

function genIp(): string {

    let genGroup = () => ~~(Math.random() * 255);

    return (new Array(4)).fill("").map(() => `${genGroup()}`).join(".");

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
            "get": () => userSim.dongle
        },
        "gatewayLocation": {
            "enumerable": true,
            "get": () => userSim.gatewayLocation
        },
        "isOnline": {
            "enumerable": true,
            "get": () => userSim.isOnline
        },
        "phonebook": {
            "enumerable": true,
            "get": ()=> userSim.phonebook
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
        //for (let _ of [ null, null ]) {

            if (user === carol) {
                break;
            }

            let ua = generateUa(user.email);

            user.uas.push(ua);

            await db.addOrUpdateUa(ua);

        }

        for (let _ of new Array(~~(Math.random() * 5) + 2)) {
        //for (let _ of [null]) {

            if (user === dave){
                 break;
            }

            const userSim = (() => {

                const sim = generateSim();

                const out: feTypes.UserSim = {
                    sim,
                    "friendlyName": ttTesting.genUtf8Str(12),
                    "password": ttTesting.genHexStr(32),
                    "dongle": {
                        "imei": ttTesting.genDigits(15),
                        "isVoiceEnabled": (Date.now() % 2 === 0) ? true : undefined,
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
                    },
                    "phonebook": sim.storage.contacts.map(c => ({
                        "mem_index": c.index,
                        "name": c.name,
                        "number_raw": c.number,
                        "number_local_format": dcMisc.toNationalNumber(c.number, sim.imsi)
                    }))
                };

                return out;

            })();

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

            assertSame(
                (await db.getUserSims(user.user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                userSim
            );

            for (let i = 0; i < 7; i++) {

                const name = ttTesting.genUtf8Str(30);
                const number_raw = genUniqNumber();
                const number_local_format = dcMisc.toNationalNumber(number_raw, userSim.sim.imsi);

                const c: feTypes.UserSim.Contact = {
                    "mem_index": undefined,
                    name,
                    number_raw,
                    number_local_format
                };

                userSim.phonebook.push(c);

                assertSame(
                    await db.createOrUpdateSimContact(userSim.sim.imsi, name, number_raw),
                    user.uas
                );

                assertSame(
                    (await db.getUserSims(user.user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                    userSim
                );

                if (i === 0) {

                    userSim.phonebook.pop();

                    assertSame(
                        await db.deleteSimContact(userSim.sim.imsi, { number_raw }),
                        user.uas
                    );

                    assertSame(
                        (await db.getUserSims(user.user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                        userSim
                    );


                }

                if (i === 1) {

                    c.name = ttTesting.genUtf8Str(30);

                    assertSame(
                        await db.createOrUpdateSimContact(userSim.sim.imsi, c.name, c.number_raw),
                        user.uas
                    );

                    assertSame(
                        (await db.getUserSims(user.user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                        userSim
                    );

                }


            }

            for (const isStepByStep of [false, true]) {

                for (const _ of [null, null, null, null]) {

                    const mem_index = (() => {

                        let out = 1;

                        while (true) {

                            if (!userSim.sim.storage.contacts.find(({ index }) => index === out)) {
                                break;
                            }

                            out++;

                        }

                        return out;

                    })();


                    const name_as_stored = ttTesting.genHexStr(12);

                    const number_raw = genUniqNumber();

                    userSim.sim.storage.contacts.push({
                        "index": mem_index,
                        "name": name_as_stored,
                        "number": number_raw
                    });

                    const name = isStepByStep ? ttTesting.genUtf8Str(20) : name_as_stored;

                    userSim.phonebook.push({
                        mem_index,
                        name,
                        number_raw,
                        "number_local_format": dcMisc.toNationalNumber(number_raw, userSim.sim.imsi)
                    });

                    userSim.sim.storage.infos.storageLeft--;

                    dcMisc.updateStorageDigest(userSim.sim.storage);

                    if (isStepByStep) {

                        assertSame(
                            await db.createOrUpdateSimContact(
                                userSim.sim.imsi,
                                name,
                                number_raw,
                                { mem_index, name_as_stored, "new_storage_digest": userSim.sim.storage.digest }
                            ),
                            user.uas
                        );

                        assertSame(
                            (await db.getUserSims(user.user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                            userSim
                        );

                    }

                }

                if (isStepByStep) {

                    const updatedContact = userSim.sim.storage.contacts[userSim.sim.storage.contacts.length - 1];

                    const c = userSim.phonebook.find(({ mem_index }) => mem_index === updatedContact.index)!

                    c.name = ttTesting.genUtf8Str(20);

                    updatedContact.name = ttTesting.genHexStr(10);

                    dcMisc.updateStorageDigest(userSim.sim.storage);

                    assertSame(
                        await db.createOrUpdateSimContact(
                            userSim.sim.imsi,
                            c.name,
                            c.number_raw,
                            {
                                "mem_index": updatedContact.index,
                                "name_as_stored": updatedContact.name,
                                "new_storage_digest": userSim.sim.storage.digest
                            }
                        ),
                        user.uas
                    );

                    assertSame(
                        (await db.getUserSims(user.user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                        userSim
                    );

                }

                for (const _ of [null, null]) {

                    const deletedContact = userSim.sim.storage.contacts.pop()!;

                    userSim.phonebook.splice(
                        userSim.phonebook.indexOf(
                            userSim.phonebook.find(({ mem_index }) => mem_index === deletedContact.index)!
                        ), 1
                    );

                    userSim.sim.storage.infos.storageLeft++;

                    dcMisc.updateStorageDigest(userSim.sim.storage);

                    if (isStepByStep) {

                        assertSame(
                            await db.deleteSimContact(
                                userSim.sim.imsi,
                                { "mem_index": deletedContact.index, "new_storage_digest": userSim.sim.storage.digest }
                            ),
                            user.uas
                        );

                        assertSame(
                            (await db.getUserSims(user.user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                            userSim
                        );

                    }

                }

                await (async () => {

                    const updatedContact = userSim.sim.storage.contacts[0];

                    updatedContact.name = ttTesting.genHexStr(8);

                    dcMisc.updateStorageDigest(userSim.sim.storage);

                    const c = userSim.phonebook.find(({ mem_index }) => mem_index === updatedContact.index)!

                    //storage name updated => full name updated.
                    c.name = updatedContact.name;

                    if (isStepByStep) {

                        assertSame(
                            await db.createOrUpdateSimContact(
                                userSim.sim.imsi,
                                c.name,
                                c.number_raw,
                                {
                                    "mem_index": updatedContact.index,
                                    "name_as_stored": updatedContact.name,
                                    "new_storage_digest": userSim.sim.storage.digest
                                }
                            ),
                            user.uas
                        );

                        assertSame(
                            (await db.getUserSims(user.user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                            userSim
                        );

                    }

                })();

                await (async () => {

                    const updatedContact = userSim.sim.storage.contacts[1];

                    updatedContact.number = genUniqNumber();

                    dcMisc.updateStorageDigest(userSim.sim.storage);

                    const c = userSim.phonebook.find(({ mem_index }) => mem_index === updatedContact.index)!

                    //storage number updated => full name updated.
                    c.name = updatedContact.name;
                    c.number_raw = updatedContact.number;
                    c.number_local_format = dcMisc.toNationalNumber(c.number_raw, userSim.sim.imsi);

                    if (isStepByStep) {

                        assertSame(
                            await db.createOrUpdateSimContact(
                                userSim.sim.imsi,
                                c.name,
                                c.number_raw,
                                {
                                    "mem_index": updatedContact.index,
                                    "name_as_stored": updatedContact.name,
                                    "new_storage_digest": userSim.sim.storage.digest
                                }
                            ),
                            user.uas
                        );

                        assertSame(
                            (await db.getUserSims(user.user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                            userSim
                        );

                    }

                })();

                if (!isStepByStep) {

                    await db.updateSimStorage(userSim.sim.imsi, userSim.sim.storage);

                    assertSame(
                        (await db.getUserSims(user.user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                        userSim
                    );

                }

            }

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
            "registered": [bob.email, carol.email, dave.email],
            "notRegistered": [unregisteredEmail]
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
