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
const deploy_1 = require("../deploy");
const frontend_1 = require("../frontend");
const assert = require("assert");
const loadBalancerLocalApiHandler = require("./toLoadBalancer/localApiHandlers");
const fs = require("fs");
const path = require("path");
const ALL_CUSTOMERS_EXEMPTED = true;
let stripe;
const planByCurrency = {};
const pricingByCurrency = {};
const customers = [];
function getCustomerStatus(email) {
    return __awaiter(this, void 0, void 0, function* () {
        if (ALL_CUSTOMERS_EXEMPTED) {
            return "EXEMPTED";
        }
        return JSON.parse((yield new Promise((resolve, reject) => fs.readFile(path.join(__dirname, "..", "..", "res", "exempted_customers.json"), (error, data) => {
            if (!!error) {
                reject(error);
            }
            else {
                resolve(data);
            }
        }))).toString("utf8")).indexOf(email) >= 0 ? "EXEMPTED" : "REGULAR";
    });
}
function launch() {
    return __awaiter(this, void 0, void 0, function* () {
        stripe = new Stripe(deploy_1.deploy.getStripeApiKeys().secretApiKey);
        //NOTE: Fetch priceByCurrency
        {
            const { data } = yield stripe.plans.list({ "limit": 100 });
            for (const { id, currency, amount } of data) {
                planByCurrency[currency] = { id, amount };
                pricingByCurrency[currency] = amount;
            }
        }
        //NOTE: Fetching of customer list.
        {
            let starting_after = undefined;
            while (true) {
                const customers_list_result = yield stripe.customers.list((() => {
                    const customerListOptions = {
                        "limit": 100,
                        starting_after
                    };
                    return customerListOptions;
                })());
                customers_list_result.data.forEach(customer => customers.push(customer));
                if (customers_list_result.has_more) {
                    //TODO: test! 
                    starting_after = customers_list_result.data[customers_list_result.data.length - 1].id;
                }
                else {
                    break;
                }
            }
        }
        {
            const eventName = "customer.updated";
            loadBalancerLocalApiHandler.evtStripe.attach(({ type }) => type === eventName, ({ data: { object } }) => {
                const customer = object;
                let index = customers.indexOf(customers.find(({ id }) => id === customer.id));
                if (index < 0) {
                    index = customers.length;
                }
                customers[index] = customer;
                console.log(eventName, JSON.stringify(customers, null, 2));
            });
        }
        {
            const eventName = "customer.created";
            loadBalancerLocalApiHandler.evtStripe.attach(({ type }) => type === eventName, ({ data: { object } }) => {
                const customer = object;
                if (customer.metadata.auth_user === undefined) {
                    return;
                }
                customers.push(customer);
                console.log(eventName, JSON.stringify(customers, null, 2));
            });
        }
        {
            const eventName = "customer.deleted";
            loadBalancerLocalApiHandler.evtStripe.attach(({ type }) => type === eventName, ({ data: { object } }) => {
                const { id } = object;
                customers.splice(customers.indexOf(customers.find(customer => customer.id === id)), 1);
                console.log(eventName, JSON.stringify(customers, null, 2));
            });
        }
        {
            const eventName = "customer.subscription.updated";
            loadBalancerLocalApiHandler.evtStripe.attach(({ type }) => type === eventName, ({ data: { object } }) => {
                const subscription = object;
                {
                    const customerSubscriptions = customers.find(({ id }) => id === subscription.customer)
                        .subscriptions
                        .data;
                    customerSubscriptions[customerSubscriptions.indexOf(customerSubscriptions.find(({ id }) => id === subscription.id))] = subscription;
                }
                console.log(eventName, JSON.stringify(customers, null, 2));
            });
        }
    });
}
exports.launch = launch;
function getCustomerFromAuth(auth, one_time_or_subscription, customers) {
    return __awaiter(this, void 0, void 0, function* () {
        return customers
            .filter(({ metadata }) => metadata.one_time_or_subscription === one_time_or_subscription)
            .find(({ metadata }) => metadata.auth_user === `${auth.user}`);
    });
}
function createCustomerForAuth(auth, one_time_or_subscription) {
    const metadata = {
        one_time_or_subscription,
        "auth_user": `${auth.user}`
    };
    return stripe.customers.create({
        "email": auth.email,
        metadata
    });
}
/** Assert customer exist and is subscribed */
function unsubscribeUser(auth) {
    return __awaiter(this, void 0, void 0, function* () {
        //TODO: Re-implement
        const customerStatus = yield getCustomerStatus(auth.email);
        if (customerStatus === "EXEMPTED") {
            return;
        }
        const customer = yield getCustomerFromAuth(auth, "SUBSCRIPTION", customers);
        if (customer === undefined) {
            throw new Error("assert");
        }
        const { subscriptions: { data: subscriptions } } = customer;
        assert(subscriptions.length !== 0);
        const [{ id: subscriptionId }] = subscriptions;
        stripe.subscriptions.update(subscriptionId, { "cancel_at_period_end": true });
        {
            const eventName = "customer.subscription.updated";
            yield loadBalancerLocalApiHandler.evtStripe.waitFor(({ type, data: { object } }) => (type === eventName &&
                object.id === subscriptionId));
        }
    });
}
exports.unsubscribeUser = unsubscribeUser;
function getSubscriptionInfos(auth) {
    return __awaiter(this, void 0, void 0, function* () {
        //TODO: Re-implement
        const customerStatus = yield getCustomerStatus(auth.email);
        if (customerStatus === "EXEMPTED") {
            return { customerStatus };
        }
        const out = {
            customerStatus,
            "stripePublicApiKey": deploy_1.deploy.getStripeApiKeys().publicApiKey,
            pricingByCurrency
        };
        const customer = yield getCustomerFromAuth(auth, "SUBSCRIPTION", customers);
        if (customer === undefined) {
            return out;
        }
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
        //TODO: Fetch payment method instead. 
        /*
        if (customer.default_source !== null) {
    
            const source = customer.sources!.data
                .find(({ id }) => id === customer.default_source)!;
    
            out.source = {
                "isChargeable": source["status"] === "chargeable",
                "expiration": `${source["card"]["exp_month"]}/${source["card"]["exp_year"]}`,
                "lastDigits": source["card"]["last4"],
                "currency": currencyLib.getCardCurrency(
                    source["card"],
                    pricingByCurrency
                )
            };
    
        }
        */
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
/**
 * -Create new subscription
 * -Re-enable subscription that have been canceled.
 * -Update default source for user.
 */
function subscribeUser(auth, sourceId) {
    return __awaiter(this, void 0, void 0, function* () {
        const customerStatus = yield getCustomerStatus(auth.email);
        if (customerStatus === "EXEMPTED") {
            return;
        }
        let customer = yield getCustomerFromAuth(auth, "SUBSCRIPTION", customers);
        if (customer === undefined) {
            if (sourceId === undefined) {
                throw new Error("assert");
            }
            customer = yield createCustomerForAuth(auth, "SUBSCRIPTION");
        }
        if (sourceId !== undefined) {
            customer = yield stripe.customers.update(customer.id, { "source": sourceId });
        }
        else {
            if (customer.default_source === null) {
                throw new Error("assert");
            }
            const state = customer.sources.data
                .find(({ id }) => id === customer.default_source)["status"];
            if (state !== "chargeable") {
                throw new Error("assert");
            }
        }
        const subscriptions = customer.subscriptions.data
            .filter(({ status }) => status !== "canceled");
        if (subscriptions.length === 0) {
            yield stripe.subscriptions.create({
                "customer": customer.id,
                "items": [{
                        "plan": (() => {
                            const currency = frontend_1.currencyLib.getCardCurrency(customer
                                .sources
                                .data
                                .find(({ id }) => id === customer.default_source)["card"], pricingByCurrency);
                            return planByCurrency[currency].id;
                        })()
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
//TODO: validate that currency is one of the supported
function createCheckoutSessionForSubscription(auth, currency, success_url, cancel_url) {
    return __awaiter(this, void 0, void 0, function* () {
        yield frontend_1.currencyLib.convertFromEuro.refreshChangeRates();
        assert((yield getCustomerFromAuth(auth, "SUBSCRIPTION", customers)) === undefined);
        //TODO: Implement for real 
        const shouldHaveTrialPeriodOffered = (yield getCustomerFromAuth(auth, "ONE-TIME", customers)) !== undefined;
        const sessionParams = {
            success_url,
            cancel_url,
            "customer_email": auth.email,
            "payment_method_types": ["card"],
            "subscription_data": {
                "items": [{ "plan": planByCurrency[currency].id, }],
                "trial_period_days": shouldHaveTrialPeriodOffered ? 180 : undefined
            },
        };
        {
            const eventName = "customer.created";
            const metadata = {
                "one_time_or_subscription": "SUBSCRIPTION",
                "auth_user": `${auth.user}`
            };
            loadBalancerLocalApiHandler.evtStripe.attachOnce(({ type, data: { object: customer } }) => (type === eventName &&
                customer.email === auth.email), ({ data: { object } }) => stripe.customers.update(object.id, { metadata }));
        }
        const session = yield stripe.checkout.sessions.create(sessionParams).catch(error => error);
        if (session instanceof Error) {
            throw session;
        }
        return session.id;
    });
}
exports.createCheckoutSessionForSubscription = createCheckoutSessionForSubscription;
//TODO: Cart should be a set of product name quantity
function createCheckoutSessionForShop(auth, cartDescription, shippingFormData, currency, success_url, cancel_url) {
    return __awaiter(this, void 0, void 0, function* () {
        yield frontend_1.currencyLib.convertFromEuro.refreshChangeRates();
        let customer = yield getCustomerFromAuth(auth, "ONE-TIME", customers);
        if (customer === undefined) {
            customer = yield createCustomerForAuth(auth, "ONE-TIME");
        }
        const cart = cartDescription.map(({ productName, quantity }) => ({
            "product": frontend_1.getShopProducts().find(({ name }) => name === productName),
            quantity
        }));
        const shipping = frontend_1.shipping.solve(shippingFormData.addressComponents
            .find(({ types: [type] }) => type === "country")
            .short_name.toLowerCase(), frontend_1.shopTypes.Cart.getOverallFootprint(cart), frontend_1.shopTypes.Cart.getOverallWeight(cart));
        const stripeShipping = frontend_1.shopTypes.ShippingFormData.toStripeShippingInformation(shippingFormData, shipping.carrier);
        const sessionParams = {
            success_url,
            cancel_url,
            "customer": customer.id,
            "payment_method_types": ["card"],
            "payment_intent_data": {
                "metadata": (() => {
                    const { carrier, offer, needLightPackage } = shipping;
                    const metadata = { carrier, offer, needLightPackage };
                    for (let i = 0; i < shippingFormData.addressComponents.length; i++) {
                        metadata[`address_${i}`] = JSON.stringify(shippingFormData.addressComponents[i]);
                    }
                    return metadata;
                })(),
                "shipping": stripeShipping
            },
            "line_items": [
                ...cart.map(({ product, quantity }) => ({
                    "amount": frontend_1.shopTypes.Price.getAmountInCurrency(product.price, currency, frontend_1.currencyLib.convertFromEuro),
                    currency,
                    "name": product.name,
                    "description": product.shortDescription,
                    "images": [product.cartImageUrl],
                    quantity
                })),
                {
                    "amount": frontend_1.currencyLib.convertFromEuro(shipping.eurAmount, currency),
                    currency,
                    "name": `Shipping to ${stripeShipping.address.country}`,
                    "description": `~ ${shipping.delay.join("-")} working days`,
                    "images": [],
                    "quantity": 1
                }
            ]
        };
        console.log(JSON.stringify(sessionParams, null, 2));
        const session = yield stripe.checkout.sessions.create(sessionParams).catch(error => error);
        if (session instanceof Error) {
            throw session;
        }
        return session.id;
    });
}
exports.createCheckoutSessionForShop = createCheckoutSessionForShop;
