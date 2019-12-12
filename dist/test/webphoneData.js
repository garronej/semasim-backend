"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (require.main === module) {
    process.once("unhandledRejection", error => { throw error; });
}
const deploy_1 = require("../deploy");
const impl_1 = require("../lib/dbWebphoneData/impl");
const dbWebphoneData_1 = require("../lib/dbWebphoneData");
const assert = require("assert");
const transfer_tools_1 = require("transfer-tools");
var assertSame = transfer_tools_1.testing.assertSame;
const webphoneData_1 = require("../lib/toUa/localApiHandlers/webphoneData");
const cryptoLib = require("crypto-lib");
const ts_events_extended_1 = require("ts-events-extended");
const webphoneData_2 = require("../../../frontend/shared/dist/lib/toBackend/remoteApiCaller/webphoneData");
const wd = require("../../../frontend/shared/dist/lib/types/webphoneData/logic");
const exposedForTestingPurpose = { getWdApiCallerForSpecificSimFactory: webphoneData_2.getApiCallerForSpecificSimFactory };
const maxMessageCountByChat = 10;
const evtSendRequest = new ts_events_extended_1.SyncEvent();
const evtWdChatCheckedFromOtherDevice = new ts_events_extended_1.SyncEvent();
async function testApiCall(client, runApiCall, expect) {
    const boundTo = [];
    let wasRequestSent = false;
    evtSendRequest.attachOnce(({ uaInstanceId }) => uaInstanceId === client.uaInstanceId, boundTo, () => wasRequestSent = true);
    let wasChangeNotifiedToOtherUas = false;
    evtWdChatCheckedFromOtherDevice.attachOnce(({ originatorUaInstanceId }) => originatorUaInstanceId === client.uaInstanceId, boundTo, () => wasChangeNotifiedToOtherUas = true);
    const out = await runApiCall();
    evtSendRequest.detach(boundTo);
    evtWdChatCheckedFromOtherDevice.detach(boundTo);
    try {
        assert(expect.requestSent === wasRequestSent);
    }
    catch (error) {
        console.log({ expect });
        throw error;
    }
    if (expect.otherUaUpdateEvent !== undefined) {
        assert(expect.otherUaUpdateEvent === wasChangeNotifiedToOtherUas);
    }
    return out;
}
async function newChat(client, arg1) {
    client.frontendApi.newChat(client.wdChats, arg1.contactNumber, arg1.contactName, arg1.contactIndexInSim);
    const { wdChat } = await client.wdEvts.evtNewUpdatedOrDeletedWdChat.waitFor(({ eventType, wdChat }) => (eventType === "NEW" &&
        wdChat.contactNumber === arg1.contactNumber), 10000);
    assert(client.wdChats.indexOf(wdChat) >= 0);
    assert(typeof wdChat.ref === "string");
    return wdChat;
}
;
function getIsolatedWdApiCallerForSpecificSimFactory(arg) {
    const { aesWorkerThreadPoolId, symmetricKey, user, userEmail } = arg;
    const uas = [];
    //NOTE: In this test the web UAs will not receive realtime updates but will propagate them to other UAs.
    return function getIsolatedWdApiCallerForSpecificSim(platform, uaInstanceId) {
        uas.push({
            "instance": uaInstanceId,
            platform,
            "pushToken": "",
            "towardUserEncryptKeyStr": "",
            "userEmail": ""
        });
        const encryptorDecryptor = (() => {
            const out = cryptoLib.aes.encryptorDecryptorFactory(symmetricKey, aesWorkerThreadPoolId);
            (new Array(~~(Math.random() * 50)))
                .fill("")
                .forEach(() => out.encrypt(Buffer.from("foo bar", "utf8")));
            return out;
        })();
        const handlers = webphoneData_1.getHandlers(impl_1.getApi((() => {
            const mysqlApi = impl_1.connectToDbAndGetMysqlApi("SINGLE CONNECTION");
            return () => mysqlApi;
        })()), {
            "getUserUas": () => Promise.resolve(uas)
        }, {
            "wd_notifyActionFromOtherUa": (methodNameAndParams, uas) => Promise.all(uas
                .filter(({ platform }) => platform !== "web")
                .map(({ instance }) => new Promise((resolve, reject) => {
                let count = 0;
                const evtData = {
                    "originatorUaInstanceId": uaInstanceId,
                    "targetUaInstanceId": instance,
                    "methodNameAndParams": Object.assign(Object.assign({}, methodNameAndParams), { "handlerCb": error => {
                            if (!!error) {
                                reject(error);
                                return;
                            }
                            count++;
                            if (handlerCount !== count) {
                                return;
                            }
                            resolve();
                        } })
                };
                const handlerCount = evtWdChatCheckedFromOtherDevice.getHandlers().filter(({ matcher }) => matcher(evtData)).length;
                if (handlerCount === 0) {
                    throw new Error("wrong assertion");
                }
                evtWdChatCheckedFromOtherDevice.post(evtData);
            }))).then(() => { })
        }, true);
        return exposedForTestingPurpose.getWdApiCallerForSpecificSimFactory((methodName, params) => {
            var _a, _b;
            const { handler, sanityCheck } = handlers[methodName];
            assert((_b = (_a = sanityCheck) === null || _a === void 0 ? void 0 : _a(params), (_b !== null && _b !== void 0 ? _b : true)), `SanityCheck failed ${methodName}, ${JSON.stringify(params, null, 2)}`);
            evtSendRequest.post({ uaInstanceId, methodName, params });
            return handler(params, webphoneData_1.getSocketForIntegrationTests({ user, uaInstanceId }));
        }, {
            "evtWdActionFromOtherUa": (() => {
                const out = new ts_events_extended_1.SyncEvent();
                evtWdChatCheckedFromOtherDevice.attach(({ targetUaInstanceId }) => targetUaInstanceId === uaInstanceId, ({ methodNameAndParams }) => out.post(methodNameAndParams));
                return out;
            })()
        }, encryptorDecryptor, userEmail);
    };
}
async function runTests() {
    var _a, _b;
    console.log("START TESTS");
    await deploy_1.deploy.dbAuth.resolve();
    dbWebphoneData_1.launch();
    await dbWebphoneData_1.dbWebphoneData.flush();
    const aesWorkerThreadPoolId = cryptoLib.workerThreadPool.Id.generate();
    cryptoLib.workerThreadPool.preSpawn(aesWorkerThreadPoolId, 1);
    const user = 66;
    const userEmail = "bob@gmail.com";
    const getIsolatedWdApiCallerForSpecificSim = getIsolatedWdApiCallerForSpecificSimFactory({
        aesWorkerThreadPoolId,
        "symmetricKey": await cryptoLib.aes.generateKey(),
        user,
        userEmail
    });
    const imsi = "123456789012345";
    const newClient = async (platform) => {
        const uaInstanceId = `"<urn:uuid:${newClient.clientCount++}6794eaf-1249-3a00-99be-03e4a31f5e91>"`;
        const frontendApi = getIsolatedWdApiCallerForSpecificSim(platform, uaInstanceId)(imsi);
        return Object.assign({ frontendApi,
            uaInstanceId }, await frontendApi.getUserSimChats(maxMessageCountByChat));
    };
    newClient.clientCount = 0;
    const clients = await Promise.all(["web", ...(new Array(3)).fill("android")]
        .map(platform => newClient(platform)));
    const [webClient, ...androidClients] = clients;
    const [androidClient1, ...otherAndroidClients] = androidClients;
    const assertCheckPass = () => {
        otherAndroidClients
            .forEach(({ wdChats }) => assertSame(wdChats, androidClient1.wdChats));
        return Promise.all(clients.map(async ({ frontendApi }) => assertSame((await frontendApi.getUserSimChats(maxMessageCountByChat)).wdChats, androidClient1.wdChats)));
    };
    assertSame(androidClient1.wdChats, []);
    await assertCheckPass();
    for (let i = 0; i <= 5; i++) {
        const contactName = `Foo Bar ${i % 2}`;
        const contactNumber = `+3363678638${i}`;
        const contactIndexInSim = i === 0 ? null : i;
        const wdChat = await newChat(androidClient1, { contactName, contactNumber, contactIndexInSim });
        assertSame(wdChat, {
            "ref": wdChat.ref,
            contactName,
            contactNumber,
            contactIndexInSim,
            "messages": [],
            "refOfLastMessageSeen": null
        });
        testApiCall(androidClient1, () => androidClient1.frontendApi.updateChatContactInfos(wdChat, contactName, contactIndexInSim), { "requestSent": false });
        const newContactName = contactName + " new";
        const newContactIndexInSim = i === 0 ? 0 : null;
        await androidClient1.frontendApi.updateChatContactInfos(wdChat, newContactName, newContactIndexInSim);
        assertSame(wdChat, {
            "ref": wdChat.ref,
            "contactName": newContactName,
            contactNumber,
            "contactIndexInSim": newContactIndexInSim,
            "messages": [],
            "refOfLastMessageSeen": null
        });
        await assertCheckPass();
    }
    for (const wdChat of [...androidClient1.wdChats]) {
        const wdChatsCopyBefore = [...androidClient1.wdChats];
        await androidClient1.frontendApi.destroyWdChat(androidClient1.wdChats, wdChat.ref);
        assertSame(androidClient1.wdChats, wdChatsCopyBefore.filter(wdChat_ => wdChat_ !== wdChat));
        await assertCheckPass();
    }
    assert(androidClient1.wdChats.length === 0);
    {
        const { ref: chatRef } = await newChat(androidClient1, {
            "contactNumber": "+33636786385",
            "contactName": "John Doe",
            "contactIndexInSim": null
        });
        await Promise.all((new Array(5))
            .fill(Date.now())
            .map((time, i) => ({
            "type": "MESSAGE",
            "pduDateTime": time + i,
            "text": `Hello World ${i}`
        }))
            .map(async (bundledData) => {
            await Promise.all(androidClients.map(async (client) => {
                const wdChat = client.wdChats.find(({ ref }) => ref === chatRef);
                if (!wdChat) {
                    throw new Error("wrong assertion");
                }
                client.frontendApi.newMessage(wdChat, {
                    "type": "SERVER TO CLIENT",
                    bundledData
                });
                const time = bundledData.pduDateTime;
                const { wdMessage } = await (() => {
                    const wdMessagesBefore = [...wdChat.messages];
                    return client.wdEvts.evtNewOrUpdatedWdMessage.waitFor(({ wdChat: wdChat_, wdMessage }) => (wdChat_ === wdChat &&
                        wdMessagesBefore.indexOf(wdMessage) < 0 &&
                        wdMessage.direction === "INCOMING" &&
                        wdMessage.time === time), 10000);
                })();
                assert(typeof wdMessage.ref === "string");
                assert(wdChat.messages.indexOf(wdMessage) >= 0);
                assertSame(wdMessage, {
                    "ref": wdMessage.ref,
                    "direction": "INCOMING",
                    time,
                    "text": bundledData.text,
                    "isNotification": false
                });
            }));
        }));
        await assertCheckPass();
        await androidClient1.frontendApi.destroyWdChat(androidClient1.wdChats, chatRef);
        await assertCheckPass();
    }
    assert(androidClient1.wdChats.length === 0);
    {
        const { ref: chatRef } = await newChat(androidClient1, {
            "contactNumber": "+33636786385",
            "contactName": "John Doe",
            "contactIndexInSim": null
        });
        Object.assign(webClient, await webClient.frontendApi.getUserSimChats(maxMessageCountByChat));
        const bundledData = {
            "type": "MESSAGE",
            "pduDateTime": Date.now(),
            "text": "Hello World"
        };
        const wdChat = androidClient1.wdChats.find(({ ref }) => ref === chatRef);
        if (!wdChat) {
            throw new Error("wrong assertion");
        }
        await androidClient1.frontendApi.newMessage(wdChat, {
            "type": "SERVER TO CLIENT",
            bundledData
        });
        await assertCheckPass();
        const test = (client, expect) => testApiCall(client, () => client.frontendApi.newMessage(client.wdChats.find(({ ref }) => ref === chatRef), {
            "type": "SERVER TO CLIENT",
            bundledData
        }), expect);
        await Promise.all([
            ...otherAndroidClients.map(client => test(client, { "requestSent": false })),
            test(webClient, { "requestSent": true, "otherUaUpdateEvent": false })
        ]);
        await assertCheckPass();
        await androidClient1.frontendApi.destroyWdChat(androidClient1.wdChats, chatRef);
    }
    assert(androidClient1.wdChats.length === 0);
    {
        const snapshotClients = [];
        const takeSnapshot = async () => snapshotClients.push(await newClient("web"));
        ;
        await takeSnapshot();
        const contactNumber = "+33636786385";
        const { ref: chatRef } = await newChat(androidClient1, {
            contactNumber,
            "contactName": "",
            "contactIndexInSim": null
        });
        await takeSnapshot();
        const bundledDataMessage = {
            "type": "MESSAGE",
            "exactSendDateTime": Date.now(),
            "appendPromotionalMessage": false,
            "text": "Lorem Ipsum"
        };
        const messageRef = await (async () => {
            const wdChat = androidClient1.wdChats.find(({ ref }) => ref === chatRef);
            if (!wdChat) {
                throw new Error("wrong assertion");
            }
            androidClient1.frontendApi.newMessage(wdChat, {
                "type": "CLIENT TO SERVER",
                "bundledData": bundledDataMessage
            });
            const time = bundledDataMessage.exactSendDateTime;
            const { wdMessage } = await (() => {
                const wdMessagesBefore = [...wdChat.messages];
                return androidClient1.wdEvts.evtNewOrUpdatedWdMessage.waitFor(({ wdChat: wdChat_, wdMessage }) => (wdChat_ === wdChat &&
                    wdMessagesBefore.indexOf(wdMessage) < 0 &&
                    wdMessage.direction === "OUTGOING" &&
                    wdMessage.time === time), 10000);
            })();
            assert(typeof wdMessage.ref === "string");
            assert(wdChat.messages.indexOf(wdMessage) >= 0);
            assertSame(wdMessage, {
                "ref": wdMessage.ref,
                time,
                "direction": "OUTGOING",
                "status": "PENDING",
                "text": bundledDataMessage.text
            });
            return wdMessage.ref;
        })();
        await assertCheckPass();
        await takeSnapshot();
        const messageTowardGsm = {
            "dateTime": bundledDataMessage.exactSendDateTime,
            "uaSim": {
                imsi,
                "ua": {
                    "instance": androidClient1.uaInstanceId,
                    userEmail,
                    "towardUserEncryptKeyStr": null,
                    "platform": null,
                    "pushToken": null
                }
            },
            "toNumber": androidClient1.wdChats.find(({ ref }) => ref === chatRef).contactNumber,
            "text": bundledDataMessage.text,
            "appendPromotionalMessage": bundledDataMessage.appendPromotionalMessage
        };
        const bundledDataSendReport = {
            "text": "✓",
            "type": "SEND REPORT",
            messageTowardGsm,
            "sendDateTime": bundledDataMessage.exactSendDateTime + 500
        };
        {
            const wdChat = androidClient1.wdChats.find(({ ref }) => ref === chatRef);
            const [wdMessage_ref, wdMessage_copyOfOldState] = (() => {
                const wdMessage = wdChat.messages.find(({ ref }) => ref === messageRef);
                return [wdMessage, Object.assign({}, wdMessage)];
            })();
            androidClient1.frontendApi.notifySendReportReceived(wdChat, bundledDataSendReport);
            const { wdMessage } = await (() => {
                const wdMessagesBefore = [...wdChat.messages];
                return androidClient1.wdEvts.evtNewOrUpdatedWdMessage.waitFor(({ wdChat: wdChat_, wdMessage }) => (wdChat_ === wdChat &&
                    wdMessagesBefore.indexOf(wdMessage) >= 0), 10000);
            })();
            assert(wdChat.messages.indexOf(wdMessage) >= 0 &&
                wdMessage_ref === wdMessage);
            assertSame(wdMessage, {
                "ref": wdMessage_copyOfOldState.ref,
                "time": wdMessage_copyOfOldState.time,
                "direction": "OUTGOING",
                "status": "SEND REPORT RECEIVED",
                "text": wdMessage_copyOfOldState.text,
                "isSentSuccessfully": bundledDataSendReport.sendDateTime !== null
            });
        }
        await assertCheckPass();
        await takeSnapshot();
        const bundledDataStatusReport = {
            "text": "✓✓",
            "type": "STATUS REPORT",
            messageTowardGsm,
            "statusReport": {
                "sendDateTime": bundledDataSendReport.sendDateTime,
                "dischargeDateTime": bundledDataSendReport.sendDateTime + 300,
                "isDelivered": true,
                "status": null,
                "recipient": null
            }
        };
        {
            const wdChat = androidClient1.wdChats.find(({ ref }) => ref === chatRef);
            const [wdMessage_ref, wdMessage_copyOfOldState] = (() => {
                const wdMessage = wdChat.messages.find(({ ref }) => ref === messageRef);
                return [wdMessage, Object.assign({}, wdMessage)];
            })();
            androidClient1.frontendApi.notifyStatusReportReceived(wdChat, bundledDataStatusReport);
            const { wdMessage } = await (() => {
                const wdMessagesBefore = [...wdChat.messages];
                return androidClient1.wdEvts.evtNewOrUpdatedWdMessage.waitFor(({ wdChat: wdChat_, wdMessage }) => (wdChat_ === wdChat &&
                    wdMessagesBefore.indexOf(wdMessage) >= 0), 10000);
            })();
            assert(wdChat.messages.indexOf(wdMessage) >= 0 &&
                wdMessage_ref === wdMessage);
            assertSame(wdMessage, {
                "ref": wdMessage_copyOfOldState.ref,
                "time": wdMessage_copyOfOldState.time,
                "direction": "OUTGOING",
                "status": "STATUS REPORT RECEIVED",
                "text": wdMessage_copyOfOldState.text,
                "deliveredTime": bundledDataStatusReport.statusReport.dischargeDateTime,
                "sentBy": { "who": "USER" }
            });
        }
        await assertCheckPass();
        await takeSnapshot();
        for (let i = 0; i < snapshotClients.length; i++) {
            const client = snapshotClients[i];
            if (i === 0) {
                const { ref } = await testApiCall(client, () => newChat(client, { contactNumber, "contactName": "", "contactIndexInSim": null }), { "requestSent": true, "otherUaUpdateEvent": false });
                assert(ref === chatRef);
            }
            const wdChat = client.wdChats.find(({ ref }) => ref === chatRef);
            if (!wdChat) {
                throw new Error("wrong assertion");
            }
            {
                const wdMessage = wdChat.messages.find(({ ref }) => ref === messageRef);
                switch (i) {
                    case 0:
                    case 1:
                        assert(wdMessage === undefined);
                        break;
                    case 2:
                        assert(!!wdMessage &&
                            wdMessage.direction === "OUTGOING" &&
                            wdMessage.status === "PENDING");
                        break;
                    case 3:
                        assert(!!wdMessage &&
                            wdMessage.direction === "OUTGOING" &&
                            wdMessage.status === "SEND REPORT RECEIVED");
                        break;
                    case 4:
                        assert(!!wdMessage &&
                            wdMessage.direction === "OUTGOING" &&
                            wdMessage.status === "STATUS REPORT RECEIVED");
                        break;
                    default:
                        throw new Error("never");
                }
            }
            await testApiCall(client, () => client.frontendApi.notifyStatusReportReceived(wdChat, bundledDataStatusReport), (() => {
                switch (i) {
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                        return { "requestSent": true, "otherUaUpdateEvent": false };
                    case 4:
                        return { "requestSent": false };
                }
            })());
            assertSame(androidClient1.wdChats, client.wdChats);
        }
        await assertCheckPass();
        await androidClient1.frontendApi.destroyWdChat(androidClient1.wdChats, chatRef);
    }
    assert(androidClient1.wdChats.length === 0);
    {
        const wdChat = await newChat(androidClient1, {
            "contactNumber": "+33636786385",
            "contactName": "John Doe",
            "contactIndexInSim": null
        });
        assert(wd.getUnreadMessagesCount(wdChat) === 0);
        //Object.assign(webClient, await webClient.frontendApi.getUserSimChats());
        const timeSentFromClient = Date.now();
        const timeSentFromDongle = timeSentFromClient + 500;
        const timeDelivered = timeSentFromDongle + 1000;
        const bundledDataStatusReport = {
            "text": "✓✓",
            "type": "STATUS REPORT",
            "messageTowardGsm": {
                "dateTime": timeSentFromClient,
                "uaSim": {
                    imsi,
                    "ua": {
                        "instance": `"<urn:uuid:00000000-1249-3a00-99be-03e4a31f5e91>"`,
                        "userEmail": `not-${userEmail}`,
                        "towardUserEncryptKeyStr": null,
                        "platform": null,
                        "pushToken": null
                    }
                },
                "toNumber": wdChat.contactNumber,
                "text": "A message sent by an other user that share the sim",
                "appendPromotionalMessage": false
            },
            "statusReport": {
                "sendDateTime": timeSentFromDongle,
                "dischargeDateTime": timeDelivered,
                "isDelivered": true,
                "status": null,
                "recipient": null
            }
        };
        const bundledDataMessage = {
            "type": "MESSAGE",
            "pduDateTime": timeDelivered - 100,
            "text": "Hello World"
        };
        const wdMessageOutgoingRef = await (async () => {
            androidClient1.frontendApi.notifyStatusReportReceived(wdChat, bundledDataStatusReport);
            const wdMessagesBefore = [...wdChat.messages];
            const [wdMessage, ...othersWdMessages] = (await Promise.all([
                androidClient1.wdEvts.evtNewOrUpdatedWdMessage.attachOnce(({ wdChat: wdChat_, wdMessage }) => (wdChat_ === wdChat &&
                    wdMessagesBefore.indexOf(wdMessage) < 0 &&
                    wdMessage.direction === "OUTGOING" &&
                    wdMessage.status === "PENDING"), 10000, () => assert(wd.getUnreadMessagesCount(wdChat) === 0)),
                androidClient1.wdEvts.evtNewOrUpdatedWdMessage.attachOnce(({ wdChat: wdChat_, wdMessage }) => (wdChat_ === wdChat &&
                    wdMessage.direction === "OUTGOING" &&
                    wdMessage.status === "SEND REPORT RECEIVED"), 10000, () => assert(wd.getUnreadMessagesCount(wdChat) === 0)),
                androidClient1.wdEvts.evtNewOrUpdatedWdMessage.attachOnce(({ wdChat: wdChat_, wdMessage }) => (wdChat_ === wdChat &&
                    wdMessage.direction === "OUTGOING" &&
                    wdMessage.status === "STATUS REPORT RECEIVED"), 10000, () => assert(wd.getUnreadMessagesCount(wdChat) === 1))
            ])).map(({ wdMessage }) => wdMessage);
            othersWdMessages.every(wdMessage_ => wdMessage_ === wdMessage);
            if (!(wdMessage.direction === "OUTGOING" && wdMessage.status === "STATUS REPORT RECEIVED")) {
                throw new Error("wrong assertion");
            }
            assertSame(wdMessage, {
                "ref": wdMessage.ref,
                "time": timeSentFromClient,
                "direction": "OUTGOING",
                "status": "STATUS REPORT RECEIVED",
                "text": bundledDataStatusReport.messageTowardGsm.text,
                "deliveredTime": timeDelivered,
                "sentBy": {
                    "who": "OTHER",
                    "email": bundledDataStatusReport.messageTowardGsm.uaSim.ua.userEmail
                }
            });
            return wdMessage.ref;
        })();
        Object.assign(webClient, await webClient.frontendApi.getUserSimChats(maxMessageCountByChat));
        await androidClient1.frontendApi.newMessage(wdChat, {
            "type": "SERVER TO CLIENT",
            "bundledData": bundledDataMessage
        });
        assert(wd.getUnreadMessagesCount(wdChat) === 2);
        assert((() => {
            const [wdMessage1, wdMessage2] = wdChat.messages;
            return (wdMessage1.direction === "INCOMING" &&
                wdMessage2.direction === "OUTGOING");
        })());
        await androidClient1.frontendApi.updateChatLastMessageSeen(wdChat);
        assert(wd.getUnreadMessagesCount(wdChat) === 0);
        assert(wdChat.refOfLastMessageSeen
            === ((_a = wdChat.messages.find(({ ref }) => ref === wdMessageOutgoingRef)) === null || _a === void 0 ? void 0 : _a.ref));
        await testApiCall(androidClient1, () => androidClient1.frontendApi.updateChatLastMessageSeen(wdChat), { "requestSent": false });
        await testApiCall(webClient, () => webClient.frontendApi.updateChatLastMessageSeen(webClient.wdChats.find(({ ref }) => ref === wdChat.ref)), { "requestSent": true, "otherUaUpdateEvent": false });
        assert(wdChat.refOfLastMessageSeen
            === ((_b = wdChat.messages.find(({ ref }) => ref === wdMessageOutgoingRef)) === null || _b === void 0 ? void 0 : _b.ref));
        await assertCheckPass();
        await androidClient1.frontendApi.destroyWdChat(androidClient1.wdChats, wdChat.ref);
    }
    assert(androidClient1.wdChats.length === 0);
    {
        let wdChat = await newChat(androidClient1, {
            "contactNumber": "+33636786385",
            "contactName": "John Doe",
            "contactIndexInSim": null
        });
        const messageCount = maxMessageCountByChat * 3;
        await Promise.all((new Array(maxMessageCountByChat * 3))
            .fill(Date.now())
            .map((time, i) => ({
            "type": "MESSAGE",
            "pduDateTime": time + i,
            "text": `Hello World ${i}`
        }))
            .reverse()
            .map(async (bundledData) => androidClient1.frontendApi.newMessage(wdChat, { "type": "SERVER TO CLIENT", bundledData })));
        assert(wdChat.messages.length === messageCount &&
            wdChat.messages.every((wdMessage, i) => i === 0 || wdChat.messages[i - 1].time < wdMessage.time));
        Object.assign(androidClient1, await androidClient1.frontendApi.getUserSimChats(maxMessageCountByChat));
        wdChat = androidClient1.wdChats.find(({ ref }) => ref === wdChat.ref);
        assert(wdChat.messages.length === maxMessageCountByChat);
        {
            const n = 10;
            await androidClient1.frontendApi.fetchOlderMessages(wdChat, n);
            assert(wdChat.messages.length === maxMessageCountByChat + n);
        }
        await androidClient1.frontendApi.fetchOlderMessages(wdChat, messageCount);
        assert(wdChat.messages.length === messageCount &&
            wdChat.messages.every((wdMessage, i) => i === 0 || wdChat.messages[i - 1].time < wdMessage.time));
        await androidClient1.frontendApi.destroyWdChat(androidClient1.wdChats, wdChat.ref);
    }
    assert(androidClient1.wdChats.length === 0);
    {
        const wdChat = await newChat(androidClient1, {
            "contactNumber": "+33636786385",
            "contactName": "John Doe",
            "contactIndexInSim": null
        });
        const time = Date.now();
        const text1 = "text 1";
        {
            const bundledData = {
                "type": "MESSAGE",
                "pduDateTime": time,
                "text": text1
            };
            await androidClient1.frontendApi.newMessage(wdChat, {
                "type": "SERVER TO CLIENT",
                bundledData
            });
        }
        const text2 = "text 2";
        const bundledDataMessage = {
            "type": "MESSAGE",
            "exactSendDateTime": time + 100,
            "appendPromotionalMessage": false,
            "text": text2
        };
        {
            await androidClient1.frontendApi.newMessage(wdChat, {
                "type": "CLIENT TO SERVER",
                "bundledData": bundledDataMessage
            });
        }
        assertSame.handleArrayAsSet = false;
        try {
            assertSame([1, 2], [2, 1]);
            throw new Error("wrong assertion");
        }
        catch (_c) {
        }
        assertSame(wdChat.messages.map(({ text }) => text), [text1, text2]);
        const text3 = "text 3";
        {
            const bundledData = {
                "type": "MESSAGE",
                "pduDateTime": time + 10,
                "text": text3
            };
            await androidClient1.frontendApi.newMessage(wdChat, {
                "type": "SERVER TO CLIENT",
                bundledData
            });
        }
        assertSame(wdChat.messages.map(({ text }) => text), [text1, text3, text2]);
        const text4 = "text 4";
        {
            const bundledData = {
                "type": "MESSAGE",
                "pduDateTime": time + 200,
                "text": text4
            };
            await androidClient1.frontendApi.newMessage(wdChat, {
                "type": "SERVER TO CLIENT",
                bundledData
            });
        }
        assertSame(wdChat.messages.map(({ text }) => text), [text1, text3, text4, text2]);
        {
            const messageTowardGsm = {
                "dateTime": bundledDataMessage.exactSendDateTime,
                "uaSim": {
                    imsi,
                    "ua": {
                        "instance": androidClient1.uaInstanceId,
                        userEmail,
                        "towardUserEncryptKeyStr": null,
                        "platform": null,
                        "pushToken": null
                    }
                },
                "toNumber": wdChat.contactNumber,
                "text": bundledDataMessage.text,
                "appendPromotionalMessage": bundledDataMessage.appendPromotionalMessage
            };
            const bundledDataSendReport = {
                "text": "✓",
                "type": "SEND REPORT",
                messageTowardGsm,
                "sendDateTime": time + 149
            };
            const orderBefore = wdChat.messages.map(({ text }) => text);
            await androidClient1.frontendApi.notifySendReportReceived(wdChat, bundledDataSendReport);
            assertSame(wdChat.messages.map(({ text }) => text), orderBefore);
            const bundledDataStatusReport = {
                "text": "✓✓",
                "type": "STATUS REPORT",
                messageTowardGsm,
                "statusReport": {
                    "sendDateTime": bundledDataSendReport.sendDateTime,
                    "dischargeDateTime": time + 150,
                    "isDelivered": true,
                    "status": null,
                    "recipient": null
                }
            };
            await androidClient1.frontendApi.notifyStatusReportReceived(wdChat, bundledDataStatusReport);
        }
        const finalOrdering = [text1, text3, text2, text4];
        assertSame(wdChat.messages.map(({ text }) => text), finalOrdering);
        otherAndroidClients.forEach(({ wdChats }) => assertSame(wdChats.find(({ ref }) => ref === wdChat.ref).messages.map(({ text }) => text), finalOrdering));
        Object.assign(webClient, await webClient.frontendApi.getUserSimChats(maxMessageCountByChat));
        assertSame(webClient.wdChats.find(({ ref }) => ref === wdChat.ref)
            .messages.map(({ text }) => text), finalOrdering);
        assertSame.handleArrayAsSet = true;
    }
    await dbWebphoneData_1.dbWebphoneData.flush();
    console.log("PASS");
}
(async () => {
    if (require.main !== module) {
        return;
    }
    assert(deploy_1.deploy.getEnv() === "DEV", "You DO NOT want to run DB tests in prod");
    await runTests();
    process.exit(0);
})();
