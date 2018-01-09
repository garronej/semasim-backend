require("rejection-tracker").main(__dirname, "..", "..");

import { DongleController as Dc } from "chan-dongle-extended-client";
import * as db from "../lib/db";
import { mySqlFunctions as f, Contact, genSamples } from "../semasim-gateway";
import { webApiDeclaration } from "../frontend";
import Types = webApiDeclaration.Types;


(async () => {

    console.log("START TESTING");

    await testUser();

    await testMain();

    await db.flush();

    console.log("ALL DB TESTS PASSED!");

    process.exit(0);

})();


function createUserSimProxy(
    userSim: Types.UserSim,
    ownership: Types.UserSim.Ownership.Shared.NotConfirmed
) {
    let userSimProxy: Types.UserSim = { ownership } as any;

    let friendlyName: string | undefined = undefined;

    Object.defineProperties(userSimProxy, {
        "sim": {
            "enumerable": true,
            "get": () => userSim.sim
        },
        "password": {
            "enumerable": true,
            "get": () => (userSimProxy.ownership.status === "SHARED NOT CONFIRMED") ?
                "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF" : userSim.password
        },
        "isVoiceEnabled": {
            "enumerable": true,
            "get": () => userSim.isVoiceEnabled
        },
        "isOnline": {
            "enumerable": true,
            "get": () => userSim.isOnline
        },
        "friendlyName": {
            "enumerable": true,
            "get": () => (friendlyName === undefined) ? userSim.friendlyName : friendlyName,
            "set": (value: string) => friendlyName = value
        }
    });

    return userSimProxy;

}

async function testMain() {

    await db.flush();

    const genUser = async (email: string = `${f.genHexStr(20)}@foobar.com`) =>
        ({
            "user": (await db.createUserAccount(email, f.genUtf8Str(10)))!,
            email,
            "userSims": [] as Types.UserSim[],
            "uas": [] as Contact.UaSim.Ua[]
        });

    let alice = await genUser();
    let bob = await genUser();
    let carol = await genUser();
    let dave = await genUser();

    let unregisteredEmail = "eve@foobar.com";

    for (let user of [alice, bob, carol, dave]) {

        for (let _ of new Array(~~(Math.random() * 10) + 1)) {

            if (user === carol) break;

            let ua = genSamples.generateUa(user.email);

            user.uas.push(ua);

            await db.addOrUpdateUa(ua);

        }

        for (let _ of new Array(~~(Math.random() * 5) + 2)) {

            if (user === dave) break;

            let userSim: Types.UserSim = {
                "sim": genSamples.generateSim(),
                "password": f.genHexStr(32),
                "isVoiceEnabled": true,
                "isOnline": true,
                "friendlyName": f.genUtf8Str(12),
                "ownership": {
                    "status": "OWNED",
                    "sharedWith": {
                        "confirmed": [],
                        "notConfirmed": []
                    }
                }
            };

            user.userSims.push(userSim);

            f.assertSame(
                await db.registerSim(
                    userSim.sim,
                    userSim.password,
                    user.user,
                    userSim.friendlyName,
                    userSim.isVoiceEnabled
                ),
                user.uas
            );


        }

        f.assertSame(
            await db.getUserSims(user.user),
            user.userSims
        );

    }

    (alice.userSims[0].ownership as Types.UserSim.Ownership.Owner)
        .sharedWith.notConfirmed = [bob.email, carol.email, dave.email, unregisteredEmail];

    let sharingRequestMessage = f.genUtf8Str(50);

    for (let user of [bob, carol, dave]) {

        user.userSims.push(createUserSimProxy(alice.userSims[0], {
            "status": "SHARED NOT CONFIRMED",
            "ownerEmail": alice.email,
            sharingRequestMessage
        }));

    }

    await db.shareSim(
        { "user": alice.user, "email": alice.email },
        alice.userSims[0].sim.imsi,
        (alice.userSims[0].ownership as Types.UserSim.Ownership.Owner).sharedWith.notConfirmed,
        sharingRequestMessage
    );

    for (let user of [alice, bob, carol, dave]) {
        f.assertSame(await db.getUserSims(user.user), user.userSims);
    }

    let uasRegisteredToSim: Contact.UaSim.Ua[] = [...alice.uas];

    for (let user of [bob, carol, dave]) {

        user.userSims[user.userSims.length - 1].friendlyName = f.genUtf8Str(12);

        user.userSims[user.userSims.length - 1].ownership = {
            "status": "SHARED CONFIRMED",
            "ownerEmail": alice.email
        };

        (alice.userSims[0].ownership as Types.UserSim.Ownership.Owner)
            .sharedWith.notConfirmed = (() => {

                let set = new Set(
                    (alice.userSims[0].ownership as Types.UserSim.Ownership.Owner)
                        .sharedWith.notConfirmed
                );

                set.delete(user.email);

                return Array.from(set);

            })();

        (alice.userSims[0].ownership as Types.UserSim.Ownership.Owner)
            .sharedWith.confirmed.push(user.email);

        uasRegisteredToSim = [...uasRegisteredToSim, ...user.uas];

        f.assertSame(
            await db.setSimFriendlyName(
                user.user,
                alice.userSims[0].sim.imsi,
                user.userSims[user.userSims.length - 1].friendlyName
            ),
            user.uas
        );

        f.assertSame(await db.getUserSims(user.user), user.userSims);

        f.assertSame(await db.getUserSims(alice.user), alice.userSims);

        f.assertSame(
            await db.setSimOnline(
                alice.userSims[0].sim.imsi,
                alice.userSims[0].password,
                alice.userSims[0].isVoiceEnabled
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
        f.assertSame(await db.getUserSims(user.user), user.userSims);
    }

    f.assertSame(
        await db.setSimOnline(
            f.genDigits(15),
            alice.userSims[0].password,
            alice.userSims[0].isVoiceEnabled
        ),
        { "isSimRegistered": false }
    );

    alice.userSims[0].isOnline = true;
    alice.userSims[0].isVoiceEnabled = false;

    f.assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            alice.userSims[0].isVoiceEnabled
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "UNCHANGED",
            "uasRegisteredToSim": [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        }
    );

    for (let user of [alice, bob, carol, dave]) {
        f.assertSame(await db.getUserSims(user.user), user.userSims);
    }

    alice.userSims[0].password = f.genHexStr(32);

    f.assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            alice.userSims[0].isVoiceEnabled
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "RENEWED",
            "uasRegisteredToSim": [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        }
    );

    for (let user of [alice, bob, carol, dave]) {
        f.assertSame(await db.getUserSims(user.user), user.userSims);
    }

    alice.userSims[0].friendlyName = f.genUtf8Str(11);

    f.assertSame(
        await db.setSimFriendlyName(
            alice.user,
            alice.userSims[0].sim.imsi,
            alice.userSims[0].friendlyName
        ),
        alice.uas
    );

    f.assertSame(
        await db.getSimOwner(alice.userSims[0].sim.imsi),
        { "user": alice.user, "email": alice.email }
    );

    bob.userSims.pop();
    carol.userSims.pop();

    (alice.userSims[0].ownership as Types.UserSim.Ownership.Owner)
        .sharedWith.confirmed = (() => {

            let set = new Set(
                (alice.userSims[0].ownership as Types.UserSim.Ownership.Owner)
                    .sharedWith.confirmed
            );

            set.delete(bob.email);
            set.delete(carol.email);

            return Array.from(set);

        })();

    f.assertSame(
        await db.stopSharingSim(
            alice.user,
            alice.userSims[0].sim.imsi,
            [bob.email, carol.email]
        ),
        [...bob.uas, ...carol.uas]
    );

    for (let user of [alice, bob, carol, dave]) {
        f.assertSame(await db.getUserSims(user.user), user.userSims);
    }

    f.assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            alice.userSims[0].isVoiceEnabled
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "NEED RENEWAL",
            "uasRegisteredToSim": [...alice.uas, ...dave.uas]
        }
    );

    alice.userSims[0].password = f.genHexStr(32);

    f.assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            alice.userSims[0].isVoiceEnabled
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "RENEWED",
            "uasRegisteredToSim": [...alice.uas, ...dave.uas]
        }
    );

    for (let user of [alice, dave]) {
        f.assertSame(await db.getUserSims(user.user), user.userSims);
    }

    dave.userSims.pop();

    (alice.userSims[0].ownership as Types.UserSim.Ownership.Owner)
        .sharedWith.confirmed = [];

    f.assertSame(
        await db.unregisterSim(dave.user, alice.userSims[0].sim.imsi),
        dave.uas
    );

    f.assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            alice.userSims[0].isVoiceEnabled
        ),
        {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "UNCHANGED",
            "uasRegisteredToSim": alice.uas
        }
    );


    for (let user of [alice, dave]) {
        f.assertSame(await db.getUserSims(user.user), user.userSims);
    }

    let eve = await genUser(unregisteredEmail);

    eve.userSims.push(createUserSimProxy(alice.userSims[0], {
        "status": "SHARED NOT CONFIRMED",
        "ownerEmail": alice.email,
        "sharingRequestMessage": sharingRequestMessage
    }));

    f.assertSame(await db.getUserSims(eve.user), eve.userSims);

    for (let _ of new Array(~~(Math.random() * 2) + 1)) {

        let ua = genSamples.generateUa(eve.email);

        eve.uas.push(ua);

        await db.addOrUpdateUa(ua);

    }

    eve.userSims.pop();

    f.assertSame(
        await db.unregisterSim(
            alice.user,
            alice.userSims.shift()!.sim.imsi
        ),
        alice.uas
    );

    for (let user of [alice, eve]) {
        f.assertSame(await db.getUserSims(user.user), user.userSims);
    }

    let dongles: Dc.ActiveDongle[] = [
        {
            "imei": f.genDigits(15),
            "isVoiceEnabled": true,
            "sim": genSamples.generateSim()
        },
        {
            "imei": f.genDigits(15),
            "isVoiceEnabled": alice.userSims[0].isVoiceEnabled,
            "sim": alice.userSims[0].sim,
        }
    ];

    f.assertSame(
        await db.filterDongleWithRegistrableSim(dongles),
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
        `   ( ${f.esc(email)}, '', '')`
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
