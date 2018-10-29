

if (require.main === module) {
    process.once("unhandledRejection", error => { throw error; });
}

import { types as dcTypes } from "chan-dongle-extended-client";
import * as dcMisc from "chan-dongle-extended-client/dist/lib/misc";
import * as dcSanityChecks from "chan-dongle-extended-client/dist/lib/sanityChecks";
import { testing as ttTesting } from "transfer-tools";
import assertSame = ttTesting.assertSame;
import { types as gwTypes } from "../gateway";
import { types as feTypes } from "../frontend";
import { deploy } from "../deploy";
import { geoiplookup } from "../tools/geoiplookup";
import * as mysqlCustom from "../tools/mysqlCustom";
import * as db from "../lib/dbSemasim";

export const generateUa = (email: string = `${ttTesting.genHexStr(10)}@foo.com`): gwTypes.Ua => ({
    "instance": `"<urn:uuid:${ttTesting.genHexStr(30)}>"`,
    "platform": Date.now() % 2 ? "android" : "iOS",
    "pushToken": ttTesting.genHexStr(60),
    "software": ttTesting.genHexStr(20),
    "userEmail": email
});

export namespace genUniq {

    let counter = 1;

    export function phoneNumber(): string {

        const c = `${counter++}`;

        return "+33" + (new Array(8 - c.length)).fill("0").join("") + c;

    }

    /** Same function for imei  */
    export function imsi(): string {

        const c = `${counter++}`;

        return (new Array(15 - c.length)).fill("0").join("") + c;

    }

    export function iccid(): string {

        const c = `${counter++}`;

        return (new Array(22 - c.length)).fill("0").join("") + c;

    }

}

export function generateSim(
    contactCount = ~~(Math.random() * 200),
    noSpecialChar: false | "NO SPECIAL CHAR" = false
): dcTypes.Sim {

    const genStr = (n: number) => !!noSpecialChar ? ttTesting.genHexStr(n) : ttTesting.genUtf8Str(n);

    const sim: dcTypes.Sim = {
        "imsi": genUniq.imsi(),
        "iccid": genUniq.iccid(),
        "country": Date.now() % 2 === 0 ?
            undefined : ({
                "name": "France",
                "iso": "fr",
                "code": 33
            }),
        "serviceProvider": {
            "fromImsi": genStr(10),
            "fromNetwork": genStr(5)
        },
        "storage": {
            "number": Date.now() % 2 === 0 ?
                undefined : genUniq.phoneNumber(),
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
            "number": genUniq.phoneNumber()
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

    if (require.main === module) {

        console.assert(
            deploy.getEnv() === "DEV",
            "You DO NOT want to run DB tests in prod"
        );

        console.log("START TESTING...");

        await db.launch();

        (await mysqlCustom.createPoolAndGetApi({
            ...(await deploy.getDbAuth()),
            "database": "semasim_express_session",
        })).query("DELETE FROM sessions");

        await testUser();

        await testMain();

        await db.flush();

        console.log("ALL DB TESTS PASSED");

        process.exit(0);

    }

})();

export function genIp(): string {

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
            "get": () => userSim.phonebook
        }
    });

    return userSimProxy;

}

//TODO: test unregister not confirmed shared sim
async function testMain() {

    await db.flush();

    const genUser = async (email: string = `${ttTesting.genHexStr(20)}@foobar.com`) =>
        ({
            "user": await (async () => {

                const createUserResp = await db.createUserAccount(email, ttTesting.genUtf8Str(10), "1.1.1.1");

                await db.validateUserEmail(email, createUserResp!.activationCode!);

                return createUserResp!.user;

            })(),
            email,
            "userSims": [] as feTypes.UserSim[],
            "uas": [] as gwTypes.Ua[]
        });

    let alice = await genUser("alice@foo.com");
    let bob = await genUser("bob@foo.com");
    let carol = await genUser("carol@foo.com");
    let dave = await genUser("dave@foo.com");

    let unregisteredEmail = "eve@foobar.com";

    for (let user of [alice, bob, carol, dave]) {

        for (const _ of new Array(~~(Math.random() * 10) + 1)) {
            //for (let _ of [ null ]) {

            if (user === carol) {
                break;
            }

            let ua = generateUa(user.email);

            user.uas.push(ua);

            await db.addOrUpdateUa(ua);

        }

        for (let _ of new Array(~~(Math.random() * 5) + 2)) {
            //for (let _ of [null]) {

            if (user === dave) {
                break;
            }

            const userSim = await (async () => {

                const sim = generateSim();

                const out: feTypes.UserSim = {
                    sim,
                    "friendlyName": ttTesting.genUtf8Str(12),
                    "password": ttTesting.genHexStr(32),
                    "dongle": {
                        "imei": genUniq.imsi(),
                        "isVoiceEnabled": (Date.now() % 2 === 0) ? true : undefined,
                        "manufacturer": ttTesting.genUtf8Str(7),
                        "model": ttTesting.genUtf8Str(7),
                        "firmwareVersion": `1.${ttTesting.genDigits(3)}.${ttTesting.genDigits(3)}`
                    },
                    "gatewayLocation": await (async () => {

                        const ip = genIp();

                        try {

                            const { countryIso, subdivisions, city } = await geoiplookup(ip);

                            return { ip, countryIso, subdivisions, city };

                        } catch{

                            return {
                                ip,
                                "countryIso": undefined,
                                "subdivisions": undefined,
                                "city": undefined
                            };

                        }

                    })(),
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
                        "number_raw": c.number
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
                    user,
                    userSim.sim,
                    userSim.friendlyName,
                    userSim.password,
                    userSim.dongle,
                    userSim.gatewayLocation.ip
                ),
                user.uas
            );

            assertSame(
                (await db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                userSim
            );

            for (let i = 0; i < 7; i++) {

                const name = ttTesting.genUtf8Str(30);
                const number_raw = genUniq.phoneNumber();

                const c: feTypes.UserSim.Contact = {
                    "mem_index": undefined,
                    name,
                    number_raw
                };

                userSim.phonebook.push(c);

                assertSame(
                    await db.createOrUpdateSimContact(userSim.sim.imsi, name, number_raw),
                    user.uas
                );

                assertSame(
                    (await db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                    userSim
                );

                if (i === 0) {

                    userSim.phonebook.pop();

                    assertSame(
                        await db.deleteSimContact(userSim.sim.imsi, { number_raw }),
                        user.uas
                    );

                    assertSame(
                        (await db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
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
                        (await db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
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

                    const number_raw = genUniq.phoneNumber();

                    userSim.sim.storage.contacts.push({
                        "index": mem_index,
                        "name": name_as_stored,
                        "number": number_raw
                    });

                    const name = isStepByStep ? ttTesting.genUtf8Str(20) : name_as_stored;

                    userSim.phonebook.push({
                        mem_index,
                        name,
                        number_raw
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
                            (await db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
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
                        (await db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
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
                            (await db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
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
                            (await db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                            userSim
                        );

                    }

                })();

                await (async () => {

                    const updatedContact = userSim.sim.storage.contacts[1];

                    updatedContact.number = genUniq.phoneNumber();

                    dcMisc.updateStorageDigest(userSim.sim.storage);

                    const c = userSim.phonebook.find(({ mem_index }) => mem_index === updatedContact.index)!

                    //storage number updated => full name updated.
                    c.name = updatedContact.name;
                    c.number_raw = updatedContact.number;

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
                            (await db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                            userSim
                        );

                    }

                })();

                if (!isStepByStep) {

                    await db.updateSimStorage(userSim.sim.imsi, userSim.sim.storage);

                    assertSame(
                        (await db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi)!,
                        userSim
                    );

                }

            }

        }

        assertSame(
            await db.getUserSims(user),
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

    assertSame(
        await db.shareSim(
            { "user": alice.user, "email": alice.email },
            alice.userSims[0].sim.imsi,
            (alice.userSims[0].ownership as feTypes.SimOwnership.Owned).sharedWith.notConfirmed,
            sharingRequestMessage
        ),
        {
            "registered": [bob, carol, dave].map(({ user, email }) => ({ user, email })),
            "notRegistered": [unregisteredEmail]
        }
    );

    for (let user of [alice, bob, carol, dave]) {

        assertSame(await db.getUserSims(user), user.userSims);

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
                user,
                alice.userSims[0].sim.imsi,
                user.userSims[user.userSims.length - 1].friendlyName
            ),
            user.uas
        );

        assertSame(await db.getUserSims(user), user.userSims);

        assertSame(await db.getUserSims(alice), alice.userSims);

        assertSame(
            await db.setSimOnline(
                alice.userSims[0].sim.imsi,
                alice.userSims[0].password,
                ttTesting.genHexStr(32),
                alice.userSims[0].gatewayLocation.ip,
                alice.userSims[0].dongle
            ),
            {
                "isSimRegistered": true,
                "storageDigest": alice.userSims[0].sim.storage.digest,
                "passwordStatus": "UNCHANGED",
                "gatewayLocation": alice.userSims[0].gatewayLocation,
                uasRegisteredToSim
            }
        );

    }

    alice.userSims[0].isOnline = false;

    assertSame(
        await db.setSimsOffline([alice.userSims[0].sim.imsi]),
        {
            [alice.userSims[0].sim.imsi]: uasRegisteredToSim
        }
    );

    for (let user of [alice, bob, carol, dave]) {
        assertSame(await db.getUserSims(user), user.userSims);
    }

    assertSame(
        await db.setSimOnline(
            ttTesting.genDigits(15),
            alice.userSims[0].password,
            ttTesting.genHexStr(32),
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
            ttTesting.genHexStr(32),
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "UNCHANGED",
            "gatewayLocation": alice.userSims[0].gatewayLocation,
            "uasRegisteredToSim": [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        }
    );

    for (let user of [alice, bob, carol, dave]) {
        assertSame(await db.getUserSims(user), user.userSims);
    }

    alice.userSims[0].password = ttTesting.genHexStr(32);

    assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            ttTesting.genHexStr(32),
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "WAS DIFFERENT",
            "gatewayLocation": alice.userSims[0].gatewayLocation,
            "uasRegisteredToSim": [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        }
    );

    for (let user of [alice, bob, carol, dave]) {
        assertSame(await db.getUserSims(user), user.userSims);
    }

    alice.userSims[0].friendlyName = ttTesting.genUtf8Str(11);

    assertSame(
        await db.setSimFriendlyName(
            alice,
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
            alice,
            alice.userSims[0].sim.imsi,
            [bob.email, carol.email]
        ),
        [...bob.uas, ...carol.uas]
    );

    for (let user of [alice, bob, carol, dave]) {
        assertSame(await db.getUserSims(user), user.userSims);
    }

    {

        const replacementPassword = ttTesting.genHexStr(32);

        assertSame(
            await db.setSimOnline(
                alice.userSims[0].sim.imsi,
                alice.userSims[0].password,
                replacementPassword,
                alice.userSims[0].gatewayLocation.ip,
                alice.userSims[0].dongle
            ),
            {
                "isSimRegistered": true,
                "storageDigest": alice.userSims[0].sim.storage.digest,
                "passwordStatus": "PASSWORD REPLACED",
                "gatewayLocation": alice.userSims[0].gatewayLocation,
                "uasRegisteredToSim": [...alice.uas, ...dave.uas]
            }
        );

        alice.userSims[0].password = replacementPassword;


        for (let user of [alice, dave]) {
            assertSame(await db.getUserSims(user), user.userSims);
        }

    }

    dave.userSims.pop();

    (alice.userSims[0].ownership as feTypes.SimOwnership.Owned)
        .sharedWith.confirmed = [];

    assertSame(
        await db.unregisterSim(dave, alice.userSims[0].sim.imsi),
        {
            "affectedUas": dave.uas,
            "owner": { "user": alice.user, "email": alice.email }
        }
    );

    assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            ttTesting.genHexStr(32),
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "UNCHANGED",
            "gatewayLocation": alice.userSims[0].gatewayLocation,
            "uasRegisteredToSim": alice.uas
        }
    );

    for (let user of [alice, dave]) {
        assertSame(await db.getUserSims(user), user.userSims);
    }

    let eve = await genUser(unregisteredEmail);

    eve.userSims.push(createUserSimProxy(alice.userSims[0], {
        "status": "SHARED NOT CONFIRMED",
        "ownerEmail": alice.email,
        "sharingRequestMessage": sharingRequestMessage
    }));

    assertSame(await db.getUserSims(eve), eve.userSims);

    for (let _ of new Array(~~(Math.random() * 2) + 1)) {

        let ua = generateUa(eve.email);

        eve.uas.push(ua);

        await db.addOrUpdateUa(ua);

    }

    eve.userSims.pop();

    assertSame(
        await db.unregisterSim(
            alice,
            alice.userSims.shift()!.sim.imsi
        ),
        {
            "affectedUas": alice.uas,
            "owner": { "user": alice.user, "email": alice.email }
        }
    );

    for (let user of [alice, eve]) {
        assertSame(await db.getUserSims(user), user.userSims);
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
            alice,
            dongles
        ),
        [dongles[0]]
    );


    alice.userSims.forEach(userSim => userSim.isOnline = false);

    await db.setAllSimOffline(
        alice.userSims.map(({ sim }) => sim.imsi)
    );

    ttTesting.assertSame(
        await db.getUserSims(alice),
        alice.userSims
    );

    [bob, carol, dave]
        .map(({ userSims }) => userSims)
        .reduce((prev, curr) => [...prev, ...curr], [])
        .forEach(userSim => userSim.isOnline = false)
        ;

    await db.setAllSimOffline();

    for (const user of [bob, carol, dave]) {

        ttTesting.assertSame(
            await db.getUserSims(user),
            user.userSims
        );

    }

    console.log("PASS MAIN");

}

async function testUser() {

    await db.flush();

    const ip = "1.1.1.1";

    let email = "joseph.garrone.gj@gmail.com";

    let password = "fooBarBazBazBaz";

    const createAccountResp = await db.createUserAccount(email, password, ip);

    console.assert(
        await db.validateUserEmail(email, createAccountResp!.activationCode!)
        ===
        true
    );

    const auth = { "user": createAccountResp!.user, email };

    console.assert(createAccountResp !== undefined);

    console.assert(
        undefined === await db.createUserAccount(email, password, ip)
    );

    console.assert(
        undefined === await db.createUserAccount(email, "anotherPass", ip)
    );

    ttTesting.assertSame(
        await db.authenticateUser(email, password),
        {
            "status": "SUCCESS",
            "user": auth.user
        }
    );

    ttTesting.assertSame(
        await db.authenticateUser(email, "not password"),
        {
            "status": "WRONG PASSWORD",
            "retryDelay": 1000
        }
    );

    for (const _ in [null, null]) {

        await new Promise(resolve => setTimeout(resolve, 10));

        const resp = await db.authenticateUser(email, password);

        if (resp.status !== "RETRY STILL FORBIDDEN") {
            console.assert(false);
            return;
        }

        console.assert(typeof resp.retryDelayLeft === "number" && resp.retryDelayLeft < 1000);

    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    ttTesting.assertSame(
        await db.authenticateUser(email, "not password"),
        {
            "status": "WRONG PASSWORD",
            "retryDelay": 2000
        }
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    ttTesting.assertSame(
        await db.authenticateUser(email, "not password"),
        {
            "status": "WRONG PASSWORD",
            "retryDelay": 4000
        }
    );

    await new Promise(resolve => setTimeout(resolve, 4000));

    ttTesting.assertSame(
        await db.authenticateUser(email, password),
        {
            "status": "SUCCESS",
            "user": auth.user
        }
    );

    console.assert(
        true === await db.deleteUser(auth)
    );

    console.assert(
        false === await db.deleteUser({ "user": 220333, "email": "foo@bar.com" })
    );

    ttTesting.assertSame(
        await db.authenticateUser(email, password),
        {
            "status": "NO SUCH ACCOUNT"
        }
    );

    //Create an account as does the shareSim function
    let { insertId: phonyUser } = await db.query([
        "INSERT INTO user",
        "   (email, salt, digest, creation_date, ip)",
        "VALUES",
        `   ( ${db.esc(email)}, '', '', '', '')`
    ].join("\n"));

    ttTesting.assertSame(
        await db.authenticateUser(email, password),
        {
            "status": "NO SUCH ACCOUNT"
        }
    );

    {

        const createAccountResp = await db.createUserAccount(email, password, ip);

        console.assert(
            phonyUser === createAccountResp!.user
        );

        console.assert(createAccountResp!.activationCode === null);

    }


    ttTesting.assertSame(
        await db.authenticateUser(email, password),
        {
            "status": "SUCCESS",
            "user": phonyUser!
        }
    );

    ttTesting.assertSame(
        await db.authenticateUser(email, "not password"),
        {
            "status": "WRONG PASSWORD",
            "retryDelay": 1000
        }
    );

    console.assert(
        await db.deleteUser({ "user": phonyUser!, email })
    );

    ttTesting.assertSame(
        await db.authenticateUser(email, password),
        {
            "status": "NO SUCH ACCOUNT",
        }
    );

    {

        for (const ovToken of [false, true]) {

            await db.flush();

            console.assert(
                await db.setPasswordRenewalToken("thisEmailDoesNotExist@gmail.com")
                ===
                undefined
            );

            const email = "alice@gmail.com";
            const password = "theCoolPasswordSecure++";

            const createAccountResp = await db.createUserAccount(email, password, ip);

            await db.validateUserEmail(email, createAccountResp!.activationCode!);

            const auth = { "user": createAccountResp!.user, email };

            let token = await db.setPasswordRenewalToken(auth.email);

            if (!token) throw new Error();

            console.assert(token.length === 32);

            console.assert(
                await db.renewPassword("thisEmailDoesNotExist@gmail.com", token, "fooBarPass")
                ===
                false
            );

            console.assert(
                await db.renewPassword(auth.email, "notTheToken", "fooBarPass")
                ===
                false
            );

            if (ovToken) {

                token = await db.setPasswordRenewalToken(auth.email);

                if (!token) throw new Error();

            }

            const newPassword = "theSuperNewPasswordSecure++++";

            console.assert(
                await db.renewPassword(auth.email, token, newPassword)
                ===
                true
            );

            const failedAuth = await db.authenticateUser(auth.email, password)

            if (failedAuth.status !== "WRONG PASSWORD") throw new Error();

            await new Promise(resolve => setTimeout(resolve, failedAuth.retryDelay));

            ttTesting.assertSame(
                await db.authenticateUser(auth.email, newPassword),
                {
                    "status": "SUCCESS",
                    "user": auth.user
                }
            );

            console.assert(
                await db.renewPassword(auth.email, token, "fooBarPassword")
                ===
                false
            );

        }

    }

    await db.flush();

    {

        console.assert(
            await db.validateUserEmail("thisEmailDoesNotExist@gmail.com", "0000")
            ===
            false
        );

        const email = "foo-bar@gmail.com";
        const password = "the_super_secret_password";

        const accountCreationResp = await db.createUserAccount(email, password, "1.1.1.1");

        ttTesting.assertSame(
            await db.authenticateUser(email, password),
            {
                "status": "NOT VALIDATED YET"
            }
        );


        console.assert(
            await db.validateUserEmail(email, accountCreationResp!.activationCode!)
            ===
            true
        );


        ttTesting.assertSame(
            await db.authenticateUser(email, password),
            {
                "status": "SUCCESS",
                "user": accountCreationResp!.user!
            }
        );



    }

    await db.flush();

    {

        const email = "foo-bar@gmail.com";
        const password = "the_super_secret_password";

        //Create an account as does the shareSim function
        const { insertId: phonyUser } = await db.query([
            "INSERT INTO user",
            "   (email, salt, digest, creation_date, ip)",
            "VALUES",
            `   ( ${db.esc(email)}, '', '', '', '')`
        ].join("\n"));


        ttTesting.assertSame(
            await db.createUserAccount(email, password, "1.1.1.1"),
            {
                "user": phonyUser,
                "activationCode": null
            }
        );

        ttTesting.assertSame(
            await db.authenticateUser(email, password),
            {
                "status": "SUCCESS",
                "user": phonyUser
            }
        );

    }

    await db.flush();
}
