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
const Stripe = require("stripe");
const f = require("../tools/mysqlCustom");
const deploy_1 = require("../deploy");
const misc_1 = require("../tools/webApi/misc");
const ts_events_extended_1 = require("ts-events-extended");
const frontend_1 = require("../frontend");
const assert = require("assert");
var db;
(function (db) {
    let buildInsertQuery;
    /** Must be called and before use */
    function launch() {
        const api = f.createPoolAndGetApi(Object.assign({}, deploy_1.deploy.dbAuth.value, { "database": "semasim_stripe" }), "HANDLE STRING ENCODING");
        db.query = api.query;
        db.esc = api.esc;
        buildInsertQuery = api.buildInsertQuery;
    }
    db.launch = launch;
    function setCustomerId(auth, customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sql = buildInsertQuery("customer", { "id": customerId, "user": auth.user }, "THROW ERROR");
            yield db.query(sql, { "user": auth.user });
        });
    }
    db.setCustomerId = setCustomerId;
    function getCustomerId(auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const sql = [
                `SELECT 1 FROM exempted WHERE email=${db.esc(auth.email)};`,
                `SELECT id FROM customer WHERE user=${db.esc(auth.user)}`
            ].join("\n");
            const resp = yield db.query(sql, { "user": auth.user });
            if (resp[0].length === 1) {
                return {
                    "customerStatus": "EXEMPTED",
                    "customerId": undefined
                };
            }
            return {
                "customerStatus": "REGULAR",
                "customerId": resp[1].length === 0 ? undefined : resp[1][0]["id"]
            };
        });
    }
    db.getCustomerId = getCustomerId;
})(db || (db = {}));
let stripe;
const planByCurrency = {};
const pricingByCurrency = {};
let stripePublicApiKey = "";
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        db.launch();
        const [public_key, secret_key] = (() => {
            switch (deploy_1.deploy.getEnv()) {
                case "DEV":
                    return [
                        "pk_test_Ai9vCY4RKGRCcRdXHCRMuZ4i",
                        "sk_test_tjDeOW7JrFihMOM3134bNpIO"
                    ];
                case "PROD":
                    return [
                        "pk_live_8DO3QFFWrOcwPslRVIHuGOMA",
                        "sk_live_ipldnIG1MKgIvt8VhGCrDrff"
                    ];
            }
        })();
        stripePublicApiKey = public_key;
        stripe = new Stripe(secret_key);
        const { data } = yield stripe.plans.list({ "limit": 250 });
        for (const { id, currency, amount } of data) {
            planByCurrency[currency] = { id, amount };
            pricingByCurrency[currency] = amount;
        }
    });
}
exports.launch = launch;
/**
 * -Create new subscription
 * -Re-enable subscription that have been canceled.
 * -Update default source for user.
 */
function subscribeUser(auth, sourceId) {
    return __awaiter(this, void 0, void 0, function* () {
        let { customerStatus, customerId } = yield db.getCustomerId(auth);
        if (customerStatus === "EXEMPTED") {
            return;
        }
        if (customerId === undefined) {
            if (sourceId === undefined) {
                throw new Error("assert");
            }
            const { id } = yield stripe.customers.create({ "email": auth.email });
            customerId = id;
            yield db.setCustomerId(auth, customerId);
        }
        if (sourceId !== undefined) {
            yield stripe.customers.update(customerId, { "source": sourceId });
        }
        else {
            const customer = yield stripe.customers.retrieve(customerId);
            if (customer.default_source === null) {
                throw new Error("assert");
            }
            const state = customer.sources.data
                .find(({ id }) => id === customer.default_source)["status"];
            if (state !== "chargeable") {
                throw new Error("assert");
            }
        }
        let { subscriptions: { data: subscriptions } } = yield stripe.customers.retrieve(customerId);
        subscriptions = subscriptions.filter(({ status }) => status !== "canceled");
        if (subscriptions.length === 0) {
            yield stripe.subscriptions.create({
                "customer": customerId,
                "items": [{
                        "plan": yield (() => __awaiter(this, void 0, void 0, function* () {
                            const customer = yield stripe.customers.retrieve(customerId);
                            const currency = frontend_1.currencyLib.getCardCurrency(customer
                                .sources
                                .data
                                .find(({ id }) => id === customer.default_source)["card"], pricingByCurrency);
                            return planByCurrency[currency].id;
                        }))()
                    }]
            });
        }
        else {
            const [subscription] = subscriptions;
            if (subscription.cancel_at_period_end) {
                yield stripe.subscriptions.update(subscription.id, {
                    "cancel_at_period_end": false
                });
            }
        }
    });
}
exports.subscribeUser = subscribeUser;
/** Assert customer exist and is subscribed */
function unsubscribeUser(auth) {
    return __awaiter(this, void 0, void 0, function* () {
        const { customerStatus, customerId } = yield db.getCustomerId(auth);
        if (customerStatus === "EXEMPTED") {
            return;
        }
        if (customerId === undefined) {
            throw new Error("assert");
        }
        const { subscriptions: { data: subscriptions } } = yield stripe.customers.retrieve(customerId);
        assert(subscriptions.length !== 0);
        const [{ id: subscriptionId }] = subscriptions;
        yield stripe.subscriptions.update(subscriptionId, {
            "cancel_at_period_end": true
        });
    });
}
exports.unsubscribeUser = unsubscribeUser;
//TODO: Implement cache but first implement 3D Secure.
function getSubscriptionInfos(auth) {
    return __awaiter(this, void 0, void 0, function* () {
        const { customerId, customerStatus } = yield db.getCustomerId(auth);
        if (customerStatus === "EXEMPTED") {
            return { customerStatus };
        }
        const out = {
            customerStatus,
            stripePublicApiKey,
            pricingByCurrency
        };
        if (customerId === undefined) {
            return out;
        }
        const customer = yield stripe.customers.retrieve(customerId);
        const { account_balance } = customer;
        if (account_balance < 0) {
            out.due = {
                "value": -account_balance,
                "currency": customer.currency
            };
        }
        const subscriptions = customer.subscriptions.data
            .filter(({ status }) => status !== "canceled");
        if (subscriptions.length !== 0) {
            const [subscription] = subscriptions;
            out.subscription = {
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "current_period_end": new Date(subscription.current_period_end * 1000),
                "currency": subscription.plan.currency
            };
        }
        if (customer.default_source !== null) {
            const source = customer.sources.data
                .find(({ id }) => id === customer.default_source);
            out.source = {
                "isChargeable": source["status"] === "chargeable",
                "expiration": `${source["card"]["exp_month"]}/${source["card"]["exp_year"]}`,
                "lastDigits": source["card"]["last4"],
                "currency": frontend_1.currencyLib.getCardCurrency(source["card"], pricingByCurrency)
            };
        }
        return out;
    });
}
exports.getSubscriptionInfos = getSubscriptionInfos;
function isUserSubscribed(auth) {
    return __awaiter(this, void 0, void 0, function* () {
        const subscriptionInfos = yield getSubscriptionInfos(auth);
        return (subscriptionInfos.customerStatus === "EXEMPTED" ||
            !!subscriptionInfos.subscription);
    });
}
exports.isUserSubscribed = isUserSubscribed;
const evt = new ts_events_extended_1.SyncEvent();
evt.attach(data => {
    //TODO: Keep a local copy of subscriptions thanks to webhooks.
});
function registerWebHooks(app) {
    app.post("/stripe_webhooks", (res, req) => __awaiter(this, void 0, void 0, function* () {
        const { isSuccess, data } = yield misc_1.bodyParser(res);
        if (isSuccess) {
            evt.post(JSON.parse(data.toString("utf8")));
        }
        req.status(200).send();
    }));
}
exports.registerWebHooks = registerWebHooks;
