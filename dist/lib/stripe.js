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
            const sql = `SELECT id FROM customer WHERE user=${db.esc(auth.user)}`;
            const rows = yield db.query(sql, { "user": auth.user });
            if (rows.length === 0) {
                return undefined;
            }
            return rows[0]["id"];
        });
    }
    db.getCustomerId = getCustomerId;
})(db || (db = {}));
let stripe;
const planByCurrency = {};
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        db.launch();
        stripe = new Stripe("sk_test_tjDeOW7JrFihMOM3134bNpIO");
        const { data } = yield stripe.plans.list();
        for (const { id, currency, amount } of data) {
            planByCurrency[currency] = { id, amount };
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
        let customerId = yield db.getCustomerId(auth);
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
                            let currency = frontend_1.currencyByCountry[customer.sources.data
                                .find(({ id }) => id === customer.default_source)["card"].country.toLowerCase()];
                            if (!(currency in planByCurrency)) {
                                currency = "usd";
                            }
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
        const customerId = yield db.getCustomerId(auth);
        if (customerId === undefined) {
            throw new Error("assert");
        }
        const { subscriptions: { data: subscriptions } } = yield stripe.customers.retrieve(customerId);
        console.assert(subscriptions.length !== 0);
        const [{ id: subscriptionId }] = subscriptions;
        yield stripe.subscriptions.update(subscriptionId, {
            "cancel_at_period_end": true
        });
    });
}
exports.unsubscribeUser = unsubscribeUser;
const stripePublicApiKey = "pk_test_Ai9vCY4RKGRCcRdXHCRMuZ4i";
function getSubscriptionInfos(auth, iso) {
    return __awaiter(this, void 0, void 0, function* () {
        const out = {
            stripePublicApiKey,
            "pricingByCurrency": (() => {
                const out = {};
                for (const currency in planByCurrency) {
                    out[currency] = planByCurrency[currency].amount;
                }
                return out;
            })(),
            "defaultCurrency": frontend_1.currencyByCountry[iso] in planByCurrency ? frontend_1.currencyByCountry[iso] : "usd"
        };
        const customerId = yield db.getCustomerId(auth);
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
                "lastDigits": source["card"]["last4"]
            };
        }
        return out;
    });
}
exports.getSubscriptionInfos = getSubscriptionInfos;
const evt = new ts_events_extended_1.SyncEvent();
evt.attach(data => console.log("stripe webhook", data));
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
