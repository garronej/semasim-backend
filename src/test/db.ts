
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
import * as crypto from "crypto";
import * as assert from "assert";

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
    //contactCount = ~~(Math.random() * 200),
    contactCount = 150,
    //contactCount = 3,
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

        //index += ~~(Math.random() * 10) + 1;
        index += 11;

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

    assert(dcSanityChecks.simStorage(sim.storage));

    return sim;

}

(async () => {

    if (require.main === module) {

        assert(
            deploy.getEnv() === "DEV",
            "You DO NOT want to run DB tests in prod"
        );

        console.log("START TESTING... ");

        await deploy.dbAuth.resolve();

        await db.launch();

        {

            const api = await mysqlCustom.createPoolAndGetApi({
                ...deploy.dbAuth.value!,
                "database": "semasim_express_session",
            });
            await api.query("DELETE FROM sessions");

            await api.end();

        }

        await testUser();

        await testMain();

        await db.flush();

        console.log("ALL DB TESTS PASSED");

        db.end();

    }

})();

export function genIp(): string {

    let genGroup = () => ~~(Math.random() * 255);

    return (new Array(4)).fill("").map(() => `${genGroup()}`).join(".");

}

const confirmUserSimByNotConfirmedUserSim = new WeakMap<
    feTypes.UserSim.Shared.NotConfirmed,
    (friendlyName: string) => void
>();

function createUserSimSharedNotConfirmed(
    userSim: feTypes.UserSim.Owned,
    simOwnerEmail: string,
    userEmail: string,
    sharingRequestMessage: string | undefined
): feTypes.UserSim.Shared.NotConfirmed {

    const userSimProxy = Object.defineProperties({}, {
        "ownership": {
            "enumerable": true,
            "value": Object.defineProperties({}, {
                "status": {
                    "enumerable": true,
                    "writable": true,
                    "value": "SHARED NOT CONFIRMED"
                },
                "ownerEmail": {
                    "enumerable": true,
                    "value": simOwnerEmail
                },
                "otherUserEmails": {
                    "enumerable": true,
                    "get": () => userSim.ownership.sharedWith.confirmed
                        .filter(email => email !== userEmail)
                },
                "sharingRequestMessage": {
                    "enumerable": true,
                    "configurable": true,
                    "value": sharingRequestMessage
                }
            })
        },
        "friendlyName": (() => {

            let friendlyName: string | undefined = undefined;

            return {
                "enumerable": true,
                "get": () => (friendlyName === undefined) ? userSim.friendlyName : friendlyName,
                "set": (value: string) => friendlyName = value
            };


        })(),
        "password": {
            "enumerable": true,
            "get": function () {

                return ((this as feTypes.UserSim).ownership.status === "SHARED NOT CONFIRMED") ?
                    "ffffffffffffffffffffffffffffffff" : userSim.password;

            }
        },
        "reachableSimState": {
            "enumerable": true,
            "get": () => {

                if (userSim.reachableSimState === undefined) {
                    return undefined;
                }

                const reachableSimState = Object.defineProperties({}, {
                    "cellSignalStrength": {
                        "enumerable": true,
                        "get": () => userSim.reachableSimState!.cellSignalStrength
                    },
                    "isGsmConnectivityOk": {
                        "enumerable": true,
                        "get": () => userSim.reachableSimState!.isGsmConnectivityOk
                    }
                });

                if (!("ongoingCall" in userSim.reachableSimState)) {

                    return reachableSimState;

                }

                const { ongoingCall } = userSim.reachableSimState;

                Object.defineProperty(reachableSimState, "ongoingCall", {
                    "enumerable": true,
                    "value": ongoingCall === undefined ? undefined :
                        (() => {

                            const out = Object.defineProperties({},
                                {
                                    "isUserInCall": {
                                        "enumerable": true,
                                        "get": () => !!ongoingCall.otherUserInCallEmails
                                            .find(email => email === userEmail)
                                    },
                                    "otherUserInCallEmails": {
                                        "enumerable": true,
                                        "get": () => {

                                            const out: string[] = [];

                                            if (ongoingCall.isUserInCall) {
                                                out.push(simOwnerEmail);
                                            }

                                            ongoingCall.otherUserInCallEmails
                                                .filter(email => email !== userEmail)
                                                .forEach(email => out.push(email))
                                                ;

                                            return out;

                                        }
                                    }
                                }
                            );

                            for (const prop in ongoingCall) {
                                if (prop in out) {
                                    continue;
                                }

                                Object.defineProperty(out, prop, {
                                    "enumerable": true,
                                    "get": () => ongoingCall[prop]
                                });

                            }

                            return out;

                        })()
                });

                return reachableSimState;



            }
        }
    });

    for (const prop in userSim) {

        if (prop in userSimProxy) {
            continue;
        }

        Object.defineProperty(userSimProxy, prop, {
            "enumerable": true,
            "get": () => userSim[prop]
        });

    }

    const confirmUserSim = (friendlyName: string) => {

        (userSimProxy as feTypes.UserSim).friendlyName = friendlyName;

        delete (userSimProxy as feTypes.UserSim.Shared.NotConfirmed).ownership.sharingRequestMessage;

        (userSimProxy as feTypes.UserSim.Shared.Confirmed).ownership.status = "SHARED CONFIRMED";

        {

            const { notConfirmed, confirmed } = userSim.ownership.sharedWith;

            notConfirmed.splice(
                notConfirmed.indexOf(userEmail),
                1
            );

            confirmed.push(userEmail);

        }

    };

    confirmUserSimByNotConfirmedUserSim.set(userSimProxy, confirmUserSim);

    return userSimProxy;

}



//TODO: test unregister not confirmed shared sim
async function testMain() {

    await db.flush();

    const genUser = async (email?: string) => {

        if (!email) {
            email = `${ttTesting.genHexStr(20)}@foobar.com`;
        }

        const towardUserEncryptKeyStr = crypto.randomBytes(300).toString("binary");

        const out = {
            "user": await (async () => {

                const createUserResp = await db.createUserAccount(
                    email,
                    ttTesting.genUtf8Str(30),
                    towardUserEncryptKeyStr,
                    crypto.randomBytes(128).toString("binary"),
                    "1.1.1.1"
                );

                await db.validateUserEmail(email, createUserResp!.activationCode!);

                return createUserResp!.user;

            })(),
            "shared": { email },
            towardUserEncryptKeyStr,
            "userSims": [] as feTypes.UserSim[],
            "uas": [] as gwTypes.Ua[]
        };

        out.uas.push({
            "instance": (await db.query(`SELECT instance FROM ua WHERE platform='web' AND user=${db.esc(out.user)};`))[0].instance,
            "userEmail": email,
            towardUserEncryptKeyStr,
            "platform": "web",
            "pushToken": "",
            "messagesEnabled": true
        });

        return out;

    };

    const generateUa = (email: string, towardUserEncryptKeyStr: string): gwTypes.Ua => ({
        "instance": `"<urn:uuid:${ttTesting.genHexStr(30)}>"`,
        "userEmail": email,
        towardUserEncryptKeyStr,
        "platform": Date.now() % 2 ? "android" : "iOS",
        "pushToken": ttTesting.genHexStr(60),
        "messagesEnabled": true
    });

    const alice = await genUser("alice@foo.com");
    const bob = await genUser("bob@foo.com");
    const carol = await genUser("carol@foo.com");
    const dave = await genUser("dave@foo.com");

    const unregisteredEmail = "eve@foobar.com";

    for (let user of [alice, bob, carol, dave]) {

        //for (const _ of new Array(~~(Math.random() * 10) + 1)) {
        for (const _ of new Array(11)) {
        //for (const _ of new Array(1)) {

            if (user === carol) {
                break;
            }

            let ua = generateUa(user.shared.email, user.towardUserEncryptKeyStr);

            user.uas.push(ua);

            await db.addOrUpdateUa(ua);

        }

        //for (let _ of new Array(~~(Math.random() * 5) + 2)) {
        for (let _ of new Array(7)) {
        //for (let _ of new Array(2)) {

            if (user === dave) {
                break;
            }

            const userSim = await (async () => {

                const sim = generateSim();

                const out: feTypes.UserSim = {
                    sim,
                    "friendlyName": ttTesting.genUtf8Str(12),
                    "password": ttTesting.genHexStr(32),
                    "towardSimEncryptKeyStr": crypto.randomBytes(150).toString("base64"),
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
                    })),
                    "reachableSimState": {
                        "cellSignalStrength": "GOOD",
                        "isGsmConnectivityOk": true,
                        "ongoingCall": undefined
                    }
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
                    userSim.towardSimEncryptKeyStr,
                    userSim.dongle,
                    userSim.gatewayLocation.ip,
                    userSim.reachableSimState!.isGsmConnectivityOk,
                    userSim.reachableSimState!.cellSignalStrength
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

    let sharingRequestMessage = ttTesting.genUtf8Str(50);

    {

        const userSim = alice.userSims[0] as feTypes.UserSim.Owned;


        for (const user of [bob, carol, dave]) {


            userSim.ownership.sharedWith.notConfirmed.push(user.shared.email);

            user.userSims.push(
                createUserSimSharedNotConfirmed(
                    userSim,
                    alice.shared.email,
                    user.shared.email,
                    sharingRequestMessage
                )
            );

        }

        userSim.ownership.sharedWith.notConfirmed.push(unregisteredEmail);

        assertSame(
            await db.shareSim(
                { "user": alice.user, "shared": { "email": alice.shared.email } },
                userSim.sim.imsi,
                userSim.ownership.sharedWith.notConfirmed,
                sharingRequestMessage
            ),
            {
                "registered": [bob, carol, dave].map(({ user, shared }) => ({ user, shared })),
                "notRegistered": [unregisteredEmail]
            }
        );

    }

    for (let user of [alice, bob, carol, dave]) {

        assertSame(
            await db.getUserSims(user),
            user.userSims
        );

    }

    let uasRegisteredToSim: gwTypes.Ua[] = [...alice.uas];

    for (const user of [bob, carol, dave]) {

        const friendlyName = ttTesting.genUtf8Str(12);

        const userSim = user.userSims[user.userSims.length - 1] as feTypes.UserSim.Shared.NotConfirmed;

        confirmUserSimByNotConfirmedUserSim.get(userSim)!(friendlyName);

        uasRegisteredToSim = [...uasRegisteredToSim, ...user.uas];

        assertSame(
            await db.setSimFriendlyName(
                user,
                userSim.sim.imsi,
                friendlyName
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
                alice.userSims[0].towardSimEncryptKeyStr,
                alice.userSims[0].gatewayLocation.ip,
                alice.userSims[0].dongle,
                alice.userSims[0].reachableSimState!.isGsmConnectivityOk,
                alice.userSims[0].reachableSimState!.cellSignalStrength
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

    {

        const userSim = alice.userSims[0];

        const reachableSimState = userSim.reachableSimState!;

        if (!reachableSimState.isGsmConnectivityOk) {
            throw new Error("assert");
        }

        reachableSimState.ongoingCall = {
            "ongoingCallId": "foo bar baz",
            "from": "DONGLE",
            "number": "+0636786385",
            "isUserInCall": false,
            "otherUserInCallEmails": [bob.shared.email]
        };

        assertSame(
            await db.createUpdateOrDeleteOngoingCall(
                reachableSimState.ongoingCall.ongoingCallId,
                userSim.sim.imsi,
                reachableSimState.ongoingCall.number,
                reachableSimState.ongoingCall.from,
                false,
                [bob.uas[0]]
            ),
            [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        );

        for (const user of [alice, bob, carol, dave]) {

            assertSame(
                await db.getUserSims(user),
                user.userSims
            );

        }

        reachableSimState.ongoingCall.isUserInCall = true;

        assertSame(
            await db.createUpdateOrDeleteOngoingCall(
                reachableSimState.ongoingCall.ongoingCallId,
                userSim.sim.imsi,
                reachableSimState.ongoingCall.number,
                reachableSimState.ongoingCall.from,
                false,
                [bob.uas[0], alice.uas[0]]
            ),
            [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        );

        for (const user of [alice, bob, carol, dave]) {

            assertSame(
                await db.getUserSims(user),
                user.userSims
            );

        }

        reachableSimState.ongoingCall.otherUserInCallEmails.push(carol.shared.email);

        assertSame(
            await db.createUpdateOrDeleteOngoingCall(
                reachableSimState.ongoingCall.ongoingCallId,
                userSim.sim.imsi,
                reachableSimState.ongoingCall.number,
                reachableSimState.ongoingCall.from,
                false,
                [carol.uas[0], bob.uas[0], alice.uas[0]]
            ),
            [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        );

        for (const user of [alice, bob, carol, dave]) {

            assertSame(
                await db.getUserSims(user),
                user.userSims
            );

        }

        reachableSimState.ongoingCall.otherUserInCallEmails.pop();

        assertSame(
            await db.createUpdateOrDeleteOngoingCall(
                reachableSimState.ongoingCall.ongoingCallId,
                userSim.sim.imsi,
                reachableSimState.ongoingCall.number,
                reachableSimState.ongoingCall.from,
                false,
                [bob.uas[0], alice.uas[0]]
            ),
            [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        );

        for (const user of [alice, bob, carol, dave]) {

            assertSame(
                await db.getUserSims(user),
                user.userSims
            );

        }


        assertSame(
            await db.createUpdateOrDeleteOngoingCall(
                reachableSimState.ongoingCall.ongoingCallId,
                userSim.sim.imsi,
                reachableSimState.ongoingCall.number,
                reachableSimState.ongoingCall.from,
                true,
                [bob.uas[0], alice.uas[0]]
            ),
            [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        );

        delete reachableSimState.ongoingCall;

        for (const user of [alice, bob, carol, dave]) {

            assertSame(
                await db.getUserSims(user),
                user.userSims
            );

        }

    }

    {

        const userSim = alice.userSims[0];

        const reachableSimState = userSim.reachableSimState!;

        if (!reachableSimState.isGsmConnectivityOk) {
            throw new Error("assert");
        }

        reachableSimState.ongoingCall = {
            "ongoingCallId": "foo bar baz",
            "from": "DONGLE",
            "number": "+0636786385",
            "isUserInCall": true,
            "otherUserInCallEmails": []
        };

        assertSame(
            await db.createUpdateOrDeleteOngoingCall(
                reachableSimState.ongoingCall.ongoingCallId,
                userSim.sim.imsi,
                reachableSimState.ongoingCall.number,
                reachableSimState.ongoingCall.from,
                false,
                [alice.uas[0]]
            ),
            [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        );

        for (const user of [alice, bob, carol, dave]) {

            assertSame(
                await db.getUserSims(user),
                user.userSims
            );

        }

        reachableSimState.ongoingCall.otherUserInCallEmails.push(bob.shared.email);

        assertSame(
            await db.createUpdateOrDeleteOngoingCall(
                reachableSimState.ongoingCall.ongoingCallId,
                userSim.sim.imsi,
                reachableSimState.ongoingCall.number,
                reachableSimState.ongoingCall.from,
                false,
                [alice.uas[0], bob.uas[0]]
            ),
            [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        );

        for (const user of [alice, bob, carol, dave]) {

            assertSame(
                await db.getUserSims(user),
                user.userSims
            );

        }

        delete userSim.reachableSimState;

        assertSame(
            await db.setSimsOffline([userSim.sim.imsi]),
            {
                [userSim.sim.imsi]: [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
            }
        );

        for (const user of [alice, bob, carol, dave]) {

            assertSame(
                await db.getUserSims(user),
                user.userSims
            );

        }

        userSim.reachableSimState ={
            "cellSignalStrength": "GOOD",
            "isGsmConnectivityOk": true,
            "ongoingCall": undefined
        };

        assertSame(
            await db.setSimOnline(
                userSim.sim.imsi,
                userSim.password,
                ttTesting.genHexStr(32),
                userSim.towardSimEncryptKeyStr,
                userSim.gatewayLocation.ip,
                userSim.dongle,
                userSim.reachableSimState.isGsmConnectivityOk,
                userSim.reachableSimState.cellSignalStrength
            ),
            {
                "isSimRegistered": true,
                "storageDigest": userSim.sim.storage.digest,
                "passwordStatus": "UNCHANGED",
                "gatewayLocation": userSim.gatewayLocation,
                "uasRegisteredToSim": [ ...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
            }
        );

        for (const user of [alice, bob, carol, dave]) {

            assertSame(
                await db.getUserSims(user),
                user.userSims
            );

        }

    }


    {

        const userSim = alice.userSims[0];

        for (const isGsmConnectivityOk of [true, false, true]) {

            const { cellSignalStrength } = userSim.reachableSimState!;

            userSim.reachableSimState = isGsmConnectivityOk ? ({
                cellSignalStrength,
                isGsmConnectivityOk,
                "ongoingCall": undefined
            }) : ({
                cellSignalStrength,
                isGsmConnectivityOk
            })

            assertSame(
                await db.changeSimGsmConnectivityOrSignal(
                    userSim.sim.imsi, { isGsmConnectivityOk }
                ),
                {
                    "isSimRegistered": true as const,
                    "uasRegisteredToSim": uasRegisteredToSim
                }
            );

            assertSame(await db.getUserSims(alice), alice.userSims);

            assertSame(
                await db.changeSimGsmConnectivityOrSignal(
                    genUniq.imsi(), { isGsmConnectivityOk }
                ),
                {
                    "isSimRegistered": false as const,
                }
            );

        }


    }

    {

        const userSim = alice.userSims[0];


        for (const cellSignalStrength of ["NULL", "VERY WEAK", "WEAK", "GOOD", "EXCELLENT"] as const) {

            userSim.reachableSimState!.cellSignalStrength = cellSignalStrength;

            assertSame(
                await db.changeSimGsmConnectivityOrSignal(
                    userSim.sim.imsi, { cellSignalStrength }
                ),
                {
                    "isSimRegistered": true as const,
                    "uasRegisteredToSim": uasRegisteredToSim
                }
            );

            assertSame(await db.getUserSims(alice), alice.userSims);

            assertSame(
                await db.changeSimGsmConnectivityOrSignal(
                    genUniq.imsi(), { cellSignalStrength }
                ),
                {
                    "isSimRegistered": false as const,
                }
            );

        }


    }

    delete alice.userSims[0].reachableSimState;
    delete bob.userSims[0].reachableSimState;

    assertSame(
        await db.setSimsOffline([alice.userSims[0].sim.imsi, bob.userSims[0].sim.imsi]),
        {
            [alice.userSims[0].sim.imsi]: uasRegisteredToSim,
            [bob.userSims[0].sim.imsi]: bob.uas
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
            alice.userSims[0].towardSimEncryptKeyStr,
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle,
            true,
            "GOOD"
        ),
        { "isSimRegistered": false }
    );

    alice.userSims[0].reachableSimState = {
        "cellSignalStrength": "GOOD",
        "isGsmConnectivityOk": false,
    };

    alice.userSims[0].dongle.isVoiceEnabled = false;

    assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            ttTesting.genHexStr(32),
            alice.userSims[0].towardSimEncryptKeyStr,
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle,
            alice.userSims[0].reachableSimState!.isGsmConnectivityOk,
            alice.userSims[0].reachableSimState!.cellSignalStrength
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
            alice.userSims[0].towardSimEncryptKeyStr,
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle,
            alice.userSims[0].reachableSimState!.isGsmConnectivityOk,
            alice.userSims[0].reachableSimState!.cellSignalStrength
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
        { "user": alice.user, "shared": { "email": alice.shared.email } }
    );

    bob.userSims.pop();
    carol.userSims.pop();

    (alice.userSims[0].ownership as feTypes.SimOwnership.Owned)
        .sharedWith.confirmed = (() => {

            let set = new Set(
                (alice.userSims[0].ownership as feTypes.SimOwnership.Owned)
                    .sharedWith.confirmed
            );

            set.delete(bob.shared.email);
            set.delete(carol.shared.email);

            return Array.from(set);

        })();

    assertSame(
        await db.stopSharingSim(
            alice,
            alice.userSims[0].sim.imsi,
            [bob.shared.email, carol.shared.email]
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
                alice.userSims[0].towardSimEncryptKeyStr,
                alice.userSims[0].gatewayLocation.ip,
                alice.userSims[0].dongle,
                alice.userSims[0].reachableSimState!.isGsmConnectivityOk,
                alice.userSims[0].reachableSimState!.cellSignalStrength
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
            "owner": { "user": alice.user, "shared": { "email": alice.shared.email } }
        }
    );

    assertSame(
        await db.setSimOnline(
            alice.userSims[0].sim.imsi,
            alice.userSims[0].password,
            ttTesting.genHexStr(32),
            alice.userSims[0].towardSimEncryptKeyStr,
            alice.userSims[0].gatewayLocation.ip,
            alice.userSims[0].dongle,
            alice.userSims[0].reachableSimState!.isGsmConnectivityOk,
            alice.userSims[0].reachableSimState!.cellSignalStrength
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

    eve.userSims.push(
        createUserSimSharedNotConfirmed(
            alice.userSims[0] as feTypes.UserSim.Owned,
            alice.shared.email,
            eve.shared.email,
            sharingRequestMessage
        )
    );

    assertSame(await db.getUserSims(eve), eve.userSims);

    //for (let _ of new Array(~~(Math.random() * 2) + 1)) {
    for (let _ of new Array(3)) {
        //for (let _ of new Array(1)) {

        let ua = generateUa(eve.shared.email, eve.towardUserEncryptKeyStr);

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
            "owner": { "user": alice.user, "shared": { "email": alice.shared.email } }
        }
    );

    for (let user of [alice, eve]) {
        assertSame(await db.getUserSims(user), user.userSims);
    }

    {

        const dongles: dcTypes.Dongle.Usable[] = [
            {
                "imei": ttTesting.genDigits(15),
                "manufacturer": "Whatever",
                "model": "Foo Bar",
                "firmwareVersion": "1.000.223",
                "isVoiceEnabled": true,
                "sim": generateSim(),
                "isGsmConnectivityOk": false,
                "cellSignalStrength": "NULL"
            },
            {
                "imei": ttTesting.genDigits(15),
                "manufacturer": alice.userSims[0].dongle.manufacturer,
                "model": alice.userSims[0].dongle.model,
                "firmwareVersion": alice.userSims[0].dongle.firmwareVersion,
                "isVoiceEnabled": alice.userSims[0].dongle.isVoiceEnabled,
                "sim": alice.userSims[0].sim,
                "isGsmConnectivityOk": alice.userSims[0].reachableSimState.isGsmConnectivityOk,
                "cellSignalStrength": alice.userSims[0].reachableSimState.cellSignalStrength
            }
        ];

        assertSame(
            await db.filterDongleWithRegistrableSim(
                alice,
                dongles
            ),
            [dongles[0]]
        );

    }

    alice.userSims.forEach(userSim => { delete userSim.reachableSimState; });

    await db.setAllSimOffline(
        alice.userSims.map(({ sim }) => sim.imsi)
    );

    assertSame(
        await db.getUserSims(alice),
        alice.userSims
    );

    [bob, carol, dave]
        .map(({ userSims }) => userSims)
        .reduce((prev, curr) => [...prev, ...curr], [])
        .forEach(userSim => { delete userSim.reachableSimState; })
        ;

    await db.setAllSimOffline();

    for (const user of [bob, carol, dave]) {

        assertSame(
            await db.getUserSims(user),
            user.userSims
        );

    }

    console.log("PASS MAIN");

}

async function testUser() {

    let count = 1;

    console.log("Start USER tests");

    {


        await db.flush();

        const ip = "1.1.1.1";

        let email = "joseph.garrone.gj@gmail.com";

        let secret = crypto.randomBytes(500).toString("hex");

        const towardUserEncryptKeyStr = crypto.randomBytes(300).toString("binary");

        const encryptedSymmetricKey = crypto.randomBytes(128).toString("binary");

        const createAccountResp = await db.createUserAccount(
            email,
            secret,
            towardUserEncryptKeyStr,
            encryptedSymmetricKey,
            ip
        );

        const user = createAccountResp!.user;

        const [{ web_ua_instance_id: webUaInstanceId }] = await db.query(`SELECT web_ua_instance_id FROM user WHERE id_=${db.esc(user)};`);

        assert(
            await db.validateUserEmail(email, createAccountResp!.activationCode!)
            ===
            true
        );

        assert(createAccountResp !== undefined);

        assert(
            undefined === await db.createUserAccount(email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey, ip)
        );

        assert(
            undefined === await db.createUserAccount(email, "anotherPass", towardUserEncryptKeyStr, encryptedSymmetricKey, ip)
        );

        assertSame(
            await db.authenticateUser(email, secret),
            {
                "status": "SUCCESS",
                "authenticatedSessionDescriptor": { user, "shared": { email, webUaInstanceId, encryptedSymmetricKey }, towardUserEncryptKeyStr }
            }
        );

        assertSame(
            await db.authenticateUser(email, "not password"),
            {
                "status": "WRONG PASSWORD",
                "retryDelay": 1000
            }
        );

        for (const _ in [null, null]) {

            await new Promise(resolve => setTimeout(resolve, 10));

            const resp = await db.authenticateUser(email, secret);

            if (resp.status !== "RETRY STILL FORBIDDEN") {
                assert(false);
                return;
            }

            assert(typeof resp.retryDelayLeft === "number" && resp.retryDelayLeft < 1000);

        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        assertSame(
            await db.authenticateUser(email, "not password"),
            {
                "status": "WRONG PASSWORD",
                "retryDelay": 2000
            }
        );

        await new Promise(resolve => setTimeout(resolve, 2000));

        assertSame(
            await db.authenticateUser(email, "not password"),
            {
                "status": "WRONG PASSWORD",
                "retryDelay": 4000
            }
        );

        await new Promise(resolve => setTimeout(resolve, 4000));

        assertSame(
            await db.authenticateUser(email, secret),
            {
                "status": "SUCCESS",
                "authenticatedSessionDescriptor": { user, "shared": { email, webUaInstanceId, encryptedSymmetricKey }, towardUserEncryptKeyStr }
            }
        );

        assert(
            true === await db.deleteUser({ user, "shared": { email } })
        );

        assert(
            false === await db.deleteUser({ "user": 220333, "shared": { "email": "foo@bar.com" } })
        );

        assertSame(
            await db.authenticateUser(email, secret),
            {
                "status": "NO SUCH ACCOUNT"
            }
        );

        //Create an account as does the shareSim function
        const { insertId: phonyUser } = await db.query([
            "INSERT IGNORE INTO user",
            "   (email, salt, digest, toward_user_encrypt_key, sym_key_enc, creation_date, ip)",
            "VALUES",
            [email].map(email => `   ( ${db.esc(email)}, '', '', '', '', 0, '')`).join(",\n"),
            ";",
        ].join("\n"));


        assertSame(
            await db.authenticateUser(email, ""),
            {
                "status": "NO SUCH ACCOUNT"
            }
        );

        assertSame(
            await db.authenticateUser(email, secret),
            {
                "status": "NO SUCH ACCOUNT"
            }
        );

        {


            const createAccountResp = await db.createUserAccount(
                email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey, ip
            );

            assert(
                phonyUser === createAccountResp!.user
            );

            assert(createAccountResp!.activationCode === null);

        }

        assertSame(
            await db.authenticateUser(email, secret),
            {
                "status": "SUCCESS",
                "authenticatedSessionDescriptor": { "user": phonyUser!, "shared": { email, webUaInstanceId, encryptedSymmetricKey }, towardUserEncryptKeyStr }
            }
        );

        assertSame(
            await db.authenticateUser(email, "not secret"),
            {
                "status": "WRONG PASSWORD",
                "retryDelay": 1000
            }
        );

        assert(
            await db.deleteUser({ "user": phonyUser!, "shared": { email } })
        );

        assertSame(
            await db.authenticateUser(email, secret),
            {
                "status": "NO SUCH ACCOUNT"
            }
        );

        console.log(`USER test ${count++} PASS`);

    }

    for (const ovToken of [false, true]) {

        await db.flush();

        assert(
            await db.setPasswordRenewalToken("thisEmailDoesNotExist@gmail.com")
            ===
            undefined
        );

        const email = "alice@gmail.com";

        const secret = crypto.randomBytes(500).toString("hex");

        const towardUserEncryptKeyStr = crypto.randomBytes(300).toString("binary");

        const encryptedSymmetricKey = crypto.randomBytes(128).toString("binary");

        const ip = "1.1.1.1";

        const createAccountResp = await db.createUserAccount(
            email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey, ip
        );

        const user = createAccountResp!.user;

        const [{ web_ua_instance_id: webUaInstanceId }] = await db.query(`SELECT web_ua_instance_id FROM user WHERE id_=${db.esc(user)};`);

        assert(
            await db.validateUserEmail(email, createAccountResp!.activationCode!)
        );


        let token = await db.setPasswordRenewalToken(email);

        if (!token) throw new Error();

        assert(token.length === 32);

        assertSame(
            await db.renewPassword("thisEmailDoesNotExist@gmail.com", "|new Secret|", towardUserEncryptKeyStr, encryptedSymmetricKey, token),
            { "wasTokenStillValid": false }
        );


        assertSame(
            await db.renewPassword("thisEmailDoesNotExist@gmail.com", "|new Secret|", towardUserEncryptKeyStr, encryptedSymmetricKey, "|not the token|"),
            { "wasTokenStillValid": false }
        );

        if (ovToken) {

            token = await db.setPasswordRenewalToken(email);

            if (!token) throw new Error();

        }

        const newSecret = crypto.randomBytes(500).toString("hex");

        const newTowardUserEncryptKeyStr = crypto.randomBytes(300).toString("binary");

        const newEncryptedSymmetricKey = crypto.randomBytes(128).toString("binary");

        assertSame(
            await db.renewPassword(email, newSecret, newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token),
            { "wasTokenStillValid": true, user }
        );

        const failedAuth = await db.authenticateUser(email, secret)

        if (failedAuth.status !== "WRONG PASSWORD") throw new Error();

        await new Promise(resolve => setTimeout(resolve, failedAuth.retryDelay));

        assertSame(
            await db.authenticateUser(email, newSecret),
            {
                "status": "SUCCESS",
                "authenticatedSessionDescriptor": {
                    user,
                    "shared": { email, webUaInstanceId, "encryptedSymmetricKey": newEncryptedSymmetricKey },
                    "towardUserEncryptKeyStr": newTowardUserEncryptKeyStr
                }
            }
        );

        assertSame(
            await db.renewPassword(email, "| yet a new secret |", newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token),
            { "wasTokenStillValid": false }
        );

        console.log(`USER test ${count++} PASS`);

    }

    {

        await db.flush();

        assert(
            await db.validateUserEmail("thisEmailDoesNotExist@gmail.com", "0000")
            ===
            false
        );

        const email = "foo-bar@gmail.com";

        const secret = crypto.randomBytes(500).toString("hex");

        const towardUserEncryptKeyStr = crypto.randomBytes(300).toString("binary");

        const encryptedSymmetricKey = crypto.randomBytes(128).toString("binary");

        const accountCreationResp = await db.createUserAccount(email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey, "1.1.1.1");

        const user = accountCreationResp!.user;

        const [{ web_ua_instance_id: webUaInstanceId }] = await db.query(`SELECT web_ua_instance_id FROM user WHERE id_=${db.esc(user)};`);

        assertSame(
            await db.authenticateUser(email, secret),
            {
                "status": "NOT VALIDATED YET"
            }
        );

        assert(
            await db.validateUserEmail(email, accountCreationResp!.activationCode!)
            ===
            true
        );

        assertSame(
            await db.authenticateUser(email, secret),
            {
                "status": "SUCCESS",
                "authenticatedSessionDescriptor": {
                    user,
                    "shared": { email, webUaInstanceId, encryptedSymmetricKey },
                    towardUserEncryptKeyStr
                }
            }
        );

        console.log(`USER test ${count++} PASS`);

    }

    {

        await db.flush();

        const email = "foo-bar@gmail.com";

        const secret = crypto.randomBytes(500).toString("hex");

        const towardUserEncryptKeyStr = crypto.randomBytes(300).toString("binary");

        const encryptedSymmetricKey = crypto.randomBytes(128).toString("binary");


        //Create an account as does the shareSim function
        const { insertId: phonyUser } = await db.query([
            "INSERT IGNORE INTO user",
            "   (email, salt, digest, toward_user_encrypt_key, sym_key_enc, creation_date, ip)",
            "VALUES",
            [email].map(email => `   ( ${db.esc(email)}, '', '', '', '', 0, '')`).join(",\n"),
            ";",
        ].join("\n"));

        assertSame(
            await db.createUserAccount(email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey, "1.1.1.1"),
            {
                "user": phonyUser,
                "activationCode": null
            }
        );

        const [{ web_ua_instance_id: webUaInstanceId }] = await db.query(`SELECT web_ua_instance_id FROM user WHERE id_=${db.esc(phonyUser)};`);

        assertSame(
            await db.authenticateUser(email, secret),
            {
                "status": "SUCCESS",
                "authenticatedSessionDescriptor": {
                    "user": phonyUser!,
                    "shared": { email, webUaInstanceId, encryptedSymmetricKey },
                    towardUserEncryptKeyStr
                }
            }
        );

        console.log(`USER test ${count++} PASS`);

    }

    await db.flush();

    console.log("PASS TEST USERS");

}
