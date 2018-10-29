"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
if (require.main === module) {
    process.once("unhandledRejection", error => { throw error; });
}
const dcMisc = require("chan-dongle-extended-client/dist/lib/misc");
const dcSanityChecks = require("chan-dongle-extended-client/dist/lib/sanityChecks");
const transfer_tools_1 = require("transfer-tools");
var assertSame = transfer_tools_1.testing.assertSame;
const deploy_1 = require("../deploy");
const geoiplookup_1 = require("../tools/geoiplookup");
const mysqlCustom = require("../tools/mysqlCustom");
const db = require("../lib/dbSemasim");
exports.generateUa = (email = `${transfer_tools_1.testing.genHexStr(10)}@foo.com`) => ({
    "instance": `"<urn:uuid:${transfer_tools_1.testing.genHexStr(30)}>"`,
    "platform": Date.now() % 2 ? "android" : "iOS",
    "pushToken": transfer_tools_1.testing.genHexStr(60),
    "software": transfer_tools_1.testing.genHexStr(20),
    "userEmail": email
});
var genUniq;
(function (genUniq) {
    let counter = 1;
    function phoneNumber() {
        const c = `${counter++}`;
        return "+33" + (new Array(8 - c.length)).fill("0").join("") + c;
    }
    genUniq.phoneNumber = phoneNumber;
    /** Same function for imei  */
    function imsi() {
        const c = `${counter++}`;
        return (new Array(15 - c.length)).fill("0").join("") + c;
    }
    genUniq.imsi = imsi;
    function iccid() {
        const c = `${counter++}`;
        return (new Array(22 - c.length)).fill("0").join("") + c;
    }
    genUniq.iccid = iccid;
})(genUniq = exports.genUniq || (exports.genUniq = {}));
function generateSim(contactCount = ~~(Math.random() * 200), noSpecialChar = false) {
    const genStr = (n) => !!noSpecialChar ? transfer_tools_1.testing.genHexStr(n) : transfer_tools_1.testing.genUtf8Str(n);
    const sim = {
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
            "name": transfer_tools_1.testing.genHexStr(5),
            "number": genUniq.phoneNumber()
        });
    }
    sim.storage.digest = dcMisc.computeSimStorageDigest(sim.storage.number, sim.storage.infos.storageLeft, sim.storage.contacts);
    console.assert(dcSanityChecks.simStorage(sim.storage));
    return sim;
}
exports.generateSim = generateSim;
(() => __awaiter(this, void 0, void 0, function* () {
    if (require.main === module) {
        console.assert(deploy_1.deploy.getEnv() === "DEV", "You DO NOT want to run DB tests in prod");
        console.log("START TESTING...");
        yield db.launch();
        (yield mysqlCustom.createPoolAndGetApi(Object.assign({}, (yield deploy_1.deploy.getDbAuth()), { "database": "semasim_express_session" }))).query("DELETE FROM sessions");
        yield testUser();
        yield testMain();
        yield db.flush();
        console.log("ALL DB TESTS PASSED");
        process.exit(0);
    }
}))();
function genIp() {
    let genGroup = () => ~~(Math.random() * 255);
    return (new Array(4)).fill("").map(() => `${genGroup()}`).join(".");
}
exports.genIp = genIp;
function createUserSimProxy(userSim, ownership) {
    let userSimProxy = { ownership };
    let friendlyName = undefined;
    Object.defineProperties(userSimProxy, {
        "sim": {
            "enumerable": true,
            "get": () => userSim.sim
        },
        "friendlyName": {
            "enumerable": true,
            "get": () => (friendlyName === undefined) ? userSim.friendlyName : friendlyName,
            "set": (value) => friendlyName = value
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
function testMain() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.flush();
        const genUser = (email = `${transfer_tools_1.testing.genHexStr(20)}@foobar.com`) => __awaiter(this, void 0, void 0, function* () {
            return ({
                "user": yield (() => __awaiter(this, void 0, void 0, function* () {
                    const createUserResp = yield db.createUserAccount(email, transfer_tools_1.testing.genUtf8Str(10), "1.1.1.1");
                    yield db.validateUserEmail(email, createUserResp.activationCode);
                    return createUserResp.user;
                }))(),
                email,
                "userSims": [],
                "uas": []
            });
        });
        let alice = yield genUser("alice@foo.com");
        let bob = yield genUser("bob@foo.com");
        let carol = yield genUser("carol@foo.com");
        let dave = yield genUser("dave@foo.com");
        let unregisteredEmail = "eve@foobar.com";
        for (let user of [alice, bob, carol, dave]) {
            for (const _ of new Array(~~(Math.random() * 10) + 1)) {
                //for (let _ of [ null ]) {
                if (user === carol) {
                    break;
                }
                let ua = exports.generateUa(user.email);
                user.uas.push(ua);
                yield db.addOrUpdateUa(ua);
            }
            for (let _ of new Array(~~(Math.random() * 5) + 2)) {
                //for (let _ of [null]) {
                if (user === dave) {
                    break;
                }
                const userSim = yield (() => __awaiter(this, void 0, void 0, function* () {
                    const sim = generateSim();
                    const out = {
                        sim,
                        "friendlyName": transfer_tools_1.testing.genUtf8Str(12),
                        "password": transfer_tools_1.testing.genHexStr(32),
                        "dongle": {
                            "imei": genUniq.imsi(),
                            "isVoiceEnabled": (Date.now() % 2 === 0) ? true : undefined,
                            "manufacturer": transfer_tools_1.testing.genUtf8Str(7),
                            "model": transfer_tools_1.testing.genUtf8Str(7),
                            "firmwareVersion": `1.${transfer_tools_1.testing.genDigits(3)}.${transfer_tools_1.testing.genDigits(3)}`
                        },
                        "gatewayLocation": yield (() => __awaiter(this, void 0, void 0, function* () {
                            const ip = genIp();
                            try {
                                const { countryIso, subdivisions, city } = yield geoiplookup_1.geoiplookup(ip);
                                return { ip, countryIso, subdivisions, city };
                            }
                            catch (_a) {
                                return {
                                    ip,
                                    "countryIso": undefined,
                                    "subdivisions": undefined,
                                    "city": undefined
                                };
                            }
                        }))(),
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
                }))();
                yield db.addGatewayLocation(userSim.gatewayLocation.ip);
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    let [row] = yield db.query(`SELECT * FROM gateway_location WHERE ip= ${db.esc(userSim.gatewayLocation.ip)}`);
                    userSim.gatewayLocation.countryIso = row["country_iso"] || undefined;
                    userSim.gatewayLocation.subdivisions = row["subdivisions"] || undefined;
                    userSim.gatewayLocation.city = row["city"] || undefined;
                }))();
                user.userSims.push(userSim);
                assertSame(yield db.registerSim(user, userSim.sim, userSim.friendlyName, userSim.password, userSim.dongle, userSim.gatewayLocation.ip), user.uas);
                assertSame((yield db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi), userSim);
                for (let i = 0; i < 7; i++) {
                    const name = transfer_tools_1.testing.genUtf8Str(30);
                    const number_raw = genUniq.phoneNumber();
                    const c = {
                        "mem_index": undefined,
                        name,
                        number_raw
                    };
                    userSim.phonebook.push(c);
                    assertSame(yield db.createOrUpdateSimContact(userSim.sim.imsi, name, number_raw), user.uas);
                    assertSame((yield db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi), userSim);
                    if (i === 0) {
                        userSim.phonebook.pop();
                        assertSame(yield db.deleteSimContact(userSim.sim.imsi, { number_raw }), user.uas);
                        assertSame((yield db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi), userSim);
                    }
                    if (i === 1) {
                        c.name = transfer_tools_1.testing.genUtf8Str(30);
                        assertSame(yield db.createOrUpdateSimContact(userSim.sim.imsi, c.name, c.number_raw), user.uas);
                        assertSame((yield db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi), userSim);
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
                        const name_as_stored = transfer_tools_1.testing.genHexStr(12);
                        const number_raw = genUniq.phoneNumber();
                        userSim.sim.storage.contacts.push({
                            "index": mem_index,
                            "name": name_as_stored,
                            "number": number_raw
                        });
                        const name = isStepByStep ? transfer_tools_1.testing.genUtf8Str(20) : name_as_stored;
                        userSim.phonebook.push({
                            mem_index,
                            name,
                            number_raw
                        });
                        userSim.sim.storage.infos.storageLeft--;
                        dcMisc.updateStorageDigest(userSim.sim.storage);
                        if (isStepByStep) {
                            assertSame(yield db.createOrUpdateSimContact(userSim.sim.imsi, name, number_raw, { mem_index, name_as_stored, "new_storage_digest": userSim.sim.storage.digest }), user.uas);
                            assertSame((yield db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi), userSim);
                        }
                    }
                    if (isStepByStep) {
                        const updatedContact = userSim.sim.storage.contacts[userSim.sim.storage.contacts.length - 1];
                        const c = userSim.phonebook.find(({ mem_index }) => mem_index === updatedContact.index);
                        c.name = transfer_tools_1.testing.genUtf8Str(20);
                        updatedContact.name = transfer_tools_1.testing.genHexStr(10);
                        dcMisc.updateStorageDigest(userSim.sim.storage);
                        assertSame(yield db.createOrUpdateSimContact(userSim.sim.imsi, c.name, c.number_raw, {
                            "mem_index": updatedContact.index,
                            "name_as_stored": updatedContact.name,
                            "new_storage_digest": userSim.sim.storage.digest
                        }), user.uas);
                        assertSame((yield db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi), userSim);
                    }
                    for (const _ of [null, null]) {
                        const deletedContact = userSim.sim.storage.contacts.pop();
                        userSim.phonebook.splice(userSim.phonebook.indexOf(userSim.phonebook.find(({ mem_index }) => mem_index === deletedContact.index)), 1);
                        userSim.sim.storage.infos.storageLeft++;
                        dcMisc.updateStorageDigest(userSim.sim.storage);
                        if (isStepByStep) {
                            assertSame(yield db.deleteSimContact(userSim.sim.imsi, { "mem_index": deletedContact.index, "new_storage_digest": userSim.sim.storage.digest }), user.uas);
                            assertSame((yield db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi), userSim);
                        }
                    }
                    yield (() => __awaiter(this, void 0, void 0, function* () {
                        const updatedContact = userSim.sim.storage.contacts[0];
                        updatedContact.name = transfer_tools_1.testing.genHexStr(8);
                        dcMisc.updateStorageDigest(userSim.sim.storage);
                        const c = userSim.phonebook.find(({ mem_index }) => mem_index === updatedContact.index);
                        //storage name updated => full name updated.
                        c.name = updatedContact.name;
                        if (isStepByStep) {
                            assertSame(yield db.createOrUpdateSimContact(userSim.sim.imsi, c.name, c.number_raw, {
                                "mem_index": updatedContact.index,
                                "name_as_stored": updatedContact.name,
                                "new_storage_digest": userSim.sim.storage.digest
                            }), user.uas);
                            assertSame((yield db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi), userSim);
                        }
                    }))();
                    yield (() => __awaiter(this, void 0, void 0, function* () {
                        const updatedContact = userSim.sim.storage.contacts[1];
                        updatedContact.number = genUniq.phoneNumber();
                        dcMisc.updateStorageDigest(userSim.sim.storage);
                        const c = userSim.phonebook.find(({ mem_index }) => mem_index === updatedContact.index);
                        //storage number updated => full name updated.
                        c.name = updatedContact.name;
                        c.number_raw = updatedContact.number;
                        if (isStepByStep) {
                            assertSame(yield db.createOrUpdateSimContact(userSim.sim.imsi, c.name, c.number_raw, {
                                "mem_index": updatedContact.index,
                                "name_as_stored": updatedContact.name,
                                "new_storage_digest": userSim.sim.storage.digest
                            }), user.uas);
                            assertSame((yield db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi), userSim);
                        }
                    }))();
                    if (!isStepByStep) {
                        yield db.updateSimStorage(userSim.sim.imsi, userSim.sim.storage);
                        assertSame((yield db.getUserSims(user)).find(({ sim }) => sim.imsi === userSim.sim.imsi), userSim);
                    }
                }
            }
            assertSame(yield db.getUserSims(user), user.userSims);
        }
        alice.userSims[0].ownership
            .sharedWith.notConfirmed = [bob.email, carol.email, dave.email, unregisteredEmail];
        let sharingRequestMessage = transfer_tools_1.testing.genUtf8Str(50);
        for (let user of [bob, carol, dave]) {
            user.userSims.push(createUserSimProxy(alice.userSims[0], {
                "status": "SHARED NOT CONFIRMED",
                "ownerEmail": alice.email,
                sharingRequestMessage
            }));
        }
        assertSame(yield db.shareSim({ "user": alice.user, "email": alice.email }, alice.userSims[0].sim.imsi, alice.userSims[0].ownership.sharedWith.notConfirmed, sharingRequestMessage), {
            "registered": [bob, carol, dave].map(({ user, email }) => ({ user, email })),
            "notRegistered": [unregisteredEmail]
        });
        for (let user of [alice, bob, carol, dave]) {
            assertSame(yield db.getUserSims(user), user.userSims);
        }
        let uasRegisteredToSim = [...alice.uas];
        for (let user of [bob, carol, dave]) {
            user.userSims[user.userSims.length - 1].friendlyName = transfer_tools_1.testing.genUtf8Str(12);
            user.userSims[user.userSims.length - 1].ownership = {
                "status": "SHARED CONFIRMED",
                "ownerEmail": alice.email
            };
            alice.userSims[0].ownership
                .sharedWith.notConfirmed = (() => {
                let set = new Set(alice.userSims[0].ownership
                    .sharedWith.notConfirmed);
                set.delete(user.email);
                return Array.from(set);
            })();
            alice.userSims[0].ownership
                .sharedWith.confirmed.push(user.email);
            uasRegisteredToSim = [...uasRegisteredToSim, ...user.uas];
            assertSame(yield db.setSimFriendlyName(user, alice.userSims[0].sim.imsi, user.userSims[user.userSims.length - 1].friendlyName), user.uas);
            assertSame(yield db.getUserSims(user), user.userSims);
            assertSame(yield db.getUserSims(alice), alice.userSims);
            assertSame(yield db.setSimOnline(alice.userSims[0].sim.imsi, alice.userSims[0].password, transfer_tools_1.testing.genHexStr(32), alice.userSims[0].gatewayLocation.ip, alice.userSims[0].dongle), {
                "isSimRegistered": true,
                "storageDigest": alice.userSims[0].sim.storage.digest,
                "passwordStatus": "UNCHANGED",
                "gatewayLocation": alice.userSims[0].gatewayLocation,
                uasRegisteredToSim
            });
        }
        alice.userSims[0].isOnline = false;
        assertSame(yield db.setSimsOffline([alice.userSims[0].sim.imsi]), {
            [alice.userSims[0].sim.imsi]: uasRegisteredToSim
        });
        for (let user of [alice, bob, carol, dave]) {
            assertSame(yield db.getUserSims(user), user.userSims);
        }
        assertSame(yield db.setSimOnline(transfer_tools_1.testing.genDigits(15), alice.userSims[0].password, transfer_tools_1.testing.genHexStr(32), alice.userSims[0].gatewayLocation.ip, alice.userSims[0].dongle), { "isSimRegistered": false });
        alice.userSims[0].isOnline = true;
        alice.userSims[0].dongle.isVoiceEnabled = false;
        assertSame(yield db.setSimOnline(alice.userSims[0].sim.imsi, alice.userSims[0].password, transfer_tools_1.testing.genHexStr(32), alice.userSims[0].gatewayLocation.ip, alice.userSims[0].dongle), {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "UNCHANGED",
            "gatewayLocation": alice.userSims[0].gatewayLocation,
            "uasRegisteredToSim": [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        });
        for (let user of [alice, bob, carol, dave]) {
            assertSame(yield db.getUserSims(user), user.userSims);
        }
        alice.userSims[0].password = transfer_tools_1.testing.genHexStr(32);
        assertSame(yield db.setSimOnline(alice.userSims[0].sim.imsi, alice.userSims[0].password, transfer_tools_1.testing.genHexStr(32), alice.userSims[0].gatewayLocation.ip, alice.userSims[0].dongle), {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "WAS DIFFERENT",
            "gatewayLocation": alice.userSims[0].gatewayLocation,
            "uasRegisteredToSim": [...alice.uas, ...bob.uas, ...carol.uas, ...dave.uas]
        });
        for (let user of [alice, bob, carol, dave]) {
            assertSame(yield db.getUserSims(user), user.userSims);
        }
        alice.userSims[0].friendlyName = transfer_tools_1.testing.genUtf8Str(11);
        assertSame(yield db.setSimFriendlyName(alice, alice.userSims[0].sim.imsi, alice.userSims[0].friendlyName), alice.uas);
        assertSame(yield db.getSimOwner(alice.userSims[0].sim.imsi), { "user": alice.user, "email": alice.email });
        bob.userSims.pop();
        carol.userSims.pop();
        alice.userSims[0].ownership
            .sharedWith.confirmed = (() => {
            let set = new Set(alice.userSims[0].ownership
                .sharedWith.confirmed);
            set.delete(bob.email);
            set.delete(carol.email);
            return Array.from(set);
        })();
        assertSame(yield db.stopSharingSim(alice, alice.userSims[0].sim.imsi, [bob.email, carol.email]), [...bob.uas, ...carol.uas]);
        for (let user of [alice, bob, carol, dave]) {
            assertSame(yield db.getUserSims(user), user.userSims);
        }
        {
            const replacementPassword = transfer_tools_1.testing.genHexStr(32);
            assertSame(yield db.setSimOnline(alice.userSims[0].sim.imsi, alice.userSims[0].password, replacementPassword, alice.userSims[0].gatewayLocation.ip, alice.userSims[0].dongle), {
                "isSimRegistered": true,
                "storageDigest": alice.userSims[0].sim.storage.digest,
                "passwordStatus": "PASSWORD REPLACED",
                "gatewayLocation": alice.userSims[0].gatewayLocation,
                "uasRegisteredToSim": [...alice.uas, ...dave.uas]
            });
            alice.userSims[0].password = replacementPassword;
            for (let user of [alice, dave]) {
                assertSame(yield db.getUserSims(user), user.userSims);
            }
        }
        dave.userSims.pop();
        alice.userSims[0].ownership
            .sharedWith.confirmed = [];
        assertSame(yield db.unregisterSim(dave, alice.userSims[0].sim.imsi), {
            "affectedUas": dave.uas,
            "owner": { "user": alice.user, "email": alice.email }
        });
        assertSame(yield db.setSimOnline(alice.userSims[0].sim.imsi, alice.userSims[0].password, transfer_tools_1.testing.genHexStr(32), alice.userSims[0].gatewayLocation.ip, alice.userSims[0].dongle), {
            "isSimRegistered": true,
            "storageDigest": alice.userSims[0].sim.storage.digest,
            "passwordStatus": "UNCHANGED",
            "gatewayLocation": alice.userSims[0].gatewayLocation,
            "uasRegisteredToSim": alice.uas
        });
        for (let user of [alice, dave]) {
            assertSame(yield db.getUserSims(user), user.userSims);
        }
        let eve = yield genUser(unregisteredEmail);
        eve.userSims.push(createUserSimProxy(alice.userSims[0], {
            "status": "SHARED NOT CONFIRMED",
            "ownerEmail": alice.email,
            "sharingRequestMessage": sharingRequestMessage
        }));
        assertSame(yield db.getUserSims(eve), eve.userSims);
        for (let _ of new Array(~~(Math.random() * 2) + 1)) {
            let ua = exports.generateUa(eve.email);
            eve.uas.push(ua);
            yield db.addOrUpdateUa(ua);
        }
        eve.userSims.pop();
        assertSame(yield db.unregisterSim(alice, alice.userSims.shift().sim.imsi), {
            "affectedUas": alice.uas,
            "owner": { "user": alice.user, "email": alice.email }
        });
        for (let user of [alice, eve]) {
            assertSame(yield db.getUserSims(user), user.userSims);
        }
        let dongles = [
            {
                "imei": transfer_tools_1.testing.genDigits(15),
                "manufacturer": "Whatever",
                "model": "Foo Bar",
                "firmwareVersion": "1.000.223",
                "isVoiceEnabled": true,
                "sim": generateSim()
            },
            {
                "imei": transfer_tools_1.testing.genDigits(15),
                "manufacturer": alice.userSims[0].dongle.manufacturer,
                "model": alice.userSims[0].dongle.model,
                "firmwareVersion": alice.userSims[0].dongle.firmwareVersion,
                "isVoiceEnabled": alice.userSims[0].dongle.isVoiceEnabled,
                "sim": alice.userSims[0].sim,
            }
        ];
        assertSame(yield db.filterDongleWithRegistrableSim(alice, dongles), [dongles[0]]);
        alice.userSims.forEach(userSim => userSim.isOnline = false);
        yield db.setAllSimOffline(alice.userSims.map(({ sim }) => sim.imsi));
        transfer_tools_1.testing.assertSame(yield db.getUserSims(alice), alice.userSims);
        [bob, carol, dave]
            .map(({ userSims }) => userSims)
            .reduce((prev, curr) => [...prev, ...curr], [])
            .forEach(userSim => userSim.isOnline = false);
        yield db.setAllSimOffline();
        for (const user of [bob, carol, dave]) {
            transfer_tools_1.testing.assertSame(yield db.getUserSims(user), user.userSims);
        }
        console.log("PASS MAIN");
    });
}
function testUser() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.flush();
        const ip = "1.1.1.1";
        let email = "joseph.garrone.gj@gmail.com";
        let password = "fooBarBazBazBaz";
        const createAccountResp = yield db.createUserAccount(email, password, ip);
        console.assert((yield db.validateUserEmail(email, createAccountResp.activationCode))
            ===
                true);
        const auth = { "user": createAccountResp.user, email };
        console.assert(createAccountResp !== undefined);
        console.assert(undefined === (yield db.createUserAccount(email, password, ip)));
        console.assert(undefined === (yield db.createUserAccount(email, "anotherPass", ip)));
        transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, password), {
            "status": "SUCCESS",
            "user": auth.user
        });
        transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, "not password"), {
            "status": "WRONG PASSWORD",
            "retryDelay": 1000
        });
        for (const _ in [null, null]) {
            yield new Promise(resolve => setTimeout(resolve, 10));
            const resp = yield db.authenticateUser(email, password);
            if (resp.status !== "RETRY STILL FORBIDDEN") {
                console.assert(false);
                return;
            }
            console.assert(typeof resp.retryDelayLeft === "number" && resp.retryDelayLeft < 1000);
        }
        yield new Promise(resolve => setTimeout(resolve, 1000));
        transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, "not password"), {
            "status": "WRONG PASSWORD",
            "retryDelay": 2000
        });
        yield new Promise(resolve => setTimeout(resolve, 2000));
        transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, "not password"), {
            "status": "WRONG PASSWORD",
            "retryDelay": 4000
        });
        yield new Promise(resolve => setTimeout(resolve, 4000));
        transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, password), {
            "status": "SUCCESS",
            "user": auth.user
        });
        console.assert(true === (yield db.deleteUser(auth)));
        console.assert(false === (yield db.deleteUser({ "user": 220333, "email": "foo@bar.com" })));
        transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, password), {
            "status": "NO SUCH ACCOUNT"
        });
        //Create an account as does the shareSim function
        let { insertId: phonyUser } = yield db.query([
            "INSERT INTO user",
            "   (email, salt, digest, creation_date, ip)",
            "VALUES",
            `   ( ${db.esc(email)}, '', '', '', '')`
        ].join("\n"));
        transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, password), {
            "status": "NO SUCH ACCOUNT"
        });
        {
            const createAccountResp = yield db.createUserAccount(email, password, ip);
            console.assert(phonyUser === createAccountResp.user);
            console.assert(createAccountResp.activationCode === null);
        }
        transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, password), {
            "status": "SUCCESS",
            "user": phonyUser
        });
        transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, "not password"), {
            "status": "WRONG PASSWORD",
            "retryDelay": 1000
        });
        console.assert(yield db.deleteUser({ "user": phonyUser, email }));
        transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, password), {
            "status": "NO SUCH ACCOUNT",
        });
        {
            for (const ovToken of [false, true]) {
                yield db.flush();
                console.assert((yield db.setPasswordRenewalToken("thisEmailDoesNotExist@gmail.com"))
                    ===
                        undefined);
                const email = "alice@gmail.com";
                const password = "theCoolPasswordSecure++";
                const createAccountResp = yield db.createUserAccount(email, password, ip);
                yield db.validateUserEmail(email, createAccountResp.activationCode);
                const auth = { "user": createAccountResp.user, email };
                let token = yield db.setPasswordRenewalToken(auth.email);
                if (!token)
                    throw new Error();
                console.assert(token.length === 32);
                console.assert((yield db.renewPassword("thisEmailDoesNotExist@gmail.com", token, "fooBarPass"))
                    ===
                        false);
                console.assert((yield db.renewPassword(auth.email, "notTheToken", "fooBarPass"))
                    ===
                        false);
                if (ovToken) {
                    token = yield db.setPasswordRenewalToken(auth.email);
                    if (!token)
                        throw new Error();
                }
                const newPassword = "theSuperNewPasswordSecure++++";
                console.assert((yield db.renewPassword(auth.email, token, newPassword))
                    ===
                        true);
                const failedAuth = yield db.authenticateUser(auth.email, password);
                if (failedAuth.status !== "WRONG PASSWORD")
                    throw new Error();
                yield new Promise(resolve => setTimeout(resolve, failedAuth.retryDelay));
                transfer_tools_1.testing.assertSame(yield db.authenticateUser(auth.email, newPassword), {
                    "status": "SUCCESS",
                    "user": auth.user
                });
                console.assert((yield db.renewPassword(auth.email, token, "fooBarPassword"))
                    ===
                        false);
            }
        }
        yield db.flush();
        {
            console.assert((yield db.validateUserEmail("thisEmailDoesNotExist@gmail.com", "0000"))
                ===
                    false);
            const email = "foo-bar@gmail.com";
            const password = "the_super_secret_password";
            const accountCreationResp = yield db.createUserAccount(email, password, "1.1.1.1");
            transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, password), {
                "status": "NOT VALIDATED YET"
            });
            console.assert((yield db.validateUserEmail(email, accountCreationResp.activationCode))
                ===
                    true);
            transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, password), {
                "status": "SUCCESS",
                "user": accountCreationResp.user
            });
        }
        yield db.flush();
        {
            const email = "foo-bar@gmail.com";
            const password = "the_super_secret_password";
            //Create an account as does the shareSim function
            const { insertId: phonyUser } = yield db.query([
                "INSERT INTO user",
                "   (email, salt, digest, creation_date, ip)",
                "VALUES",
                `   ( ${db.esc(email)}, '', '', '', '')`
            ].join("\n"));
            transfer_tools_1.testing.assertSame(yield db.createUserAccount(email, password, "1.1.1.1"), {
                "user": phonyUser,
                "activationCode": null
            });
            transfer_tools_1.testing.assertSame(yield db.authenticateUser(email, password), {
                "status": "SUCCESS",
                "user": phonyUser
            });
        }
        yield db.flush();
    });
}
