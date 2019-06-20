
import * as Stripe from "stripe";
import { UserAuthentication } from "./web/sessionManager";
import { deploy } from "../deploy";
import { subscriptionTypes, shopTypes, currencyLib, getShopProducts, shipping as shippingLib } from "../frontend";
import { types as lbTypes } from "../load-balancer";
import * as assert from "assert";
import * as loadBalancerLocalApiHandler from "./toLoadBalancer/localApiHandlers";
import * as fs from "fs";
import * as path from "path";

const ALL_CUSTOMERS_EXEMPTED= true;

let stripe: Stripe;

const planByCurrency: { [currency: string]: { id: string; amount: number; } } = {};

const pricingByCurrency: subscriptionTypes.SubscriptionInfos.Regular["pricingByCurrency"] = {};

const customers: Stripe.customers.ICustomer[] = [];

async function getCustomerStatus(email: string): Promise<"EXEMPTED" | "REGULAR"> {

    if( ALL_CUSTOMERS_EXEMPTED ){
        return "EXEMPTED";
    }

    return JSON.parse(
        (await new Promise<Buffer>(
            (resolve, reject) =>
                fs.readFile(
                    path.join(__dirname, "..", "..", "res", "exempted_customers.json"),
                    (error, data) => {

                        if (!!error) {
                            reject(error);

                        } else {
                            resolve(data);
                        }

                    }
                )
        )).toString("utf8")
    ).indexOf(email) >= 0 ? "EXEMPTED" : "REGULAR";

}

export async function launch() {

    stripe = new Stripe(deploy.getStripeApiKeys().secretApiKey);

    //NOTE: Fetch priceByCurrency
    {

        const { data } = await stripe.plans.list({ "limit": 100 });

        for (const { id, currency, amount } of data) {

            planByCurrency[currency] = { id, amount };
            pricingByCurrency[currency] = amount;

        }

    }

    //NOTE: Fetching of customer list.
    {

        let starting_after: string | undefined = undefined;

        while (true) {

            const customers_list_result = await stripe.customers.list((() => {

                const customerListOptions: Stripe.customers.ICustomerListOptions = {
                    "limit": 100,
                    starting_after
                };


                return customerListOptions;

            })());

            customers_list_result.data.forEach(customer => customers.push(customer));

            if (customers_list_result.has_more) {

                //TODO: test! 
                starting_after = customers_list_result.data[customers_list_result.data.length - 1].id;

            } else {

                break;

            }

        }

    }

    {

        const eventName: lbTypes.StripeEventsType = "customer.updated";

        loadBalancerLocalApiHandler.evtStripe.attach(
            ({ type }) => type === eventName,
            ({ data: { object } }) => {

                const customer = object as Stripe.customers.ICustomer;

                let index = customers.indexOf(
                    customers.find(
                        ({ id }) => id === customer.id
                    )!
                );

                if (index < 0) {

                    index = customers.length;
                }

                customers[index] = customer;

                console.log(eventName, JSON.stringify(customers, null, 2));

            }
        );

    }

    {

        const eventName: lbTypes.StripeEventsType = "customer.created";

        loadBalancerLocalApiHandler.evtStripe.attach(
            ({ type }) => type === eventName,
            ({ data: { object } }) => {

                const customer = object as Stripe.customers.ICustomer;

                if ((customer.metadata as CustomerMetadata).auth_user === undefined) {
                    return;
                }

                customers.push(customer);

                console.log(eventName, JSON.stringify(customers, null, 2));

            }
        );

    }

    {

        const eventName: lbTypes.StripeEventsType = "customer.deleted";

        loadBalancerLocalApiHandler.evtStripe.attach(
            ({ type }) => type === eventName,
            ({ data: { object } }) => {

                const { id } = object as Stripe.customers.ICustomer;

                customers.splice(
                    customers.indexOf(
                        customers.find(customer => customer.id === id)!
                    ),
                    1
                );

                console.log(eventName, JSON.stringify(customers, null, 2));

            }
        );

    }

    {

        const eventName: lbTypes.StripeEventsType = "customer.subscription.updated";

        loadBalancerLocalApiHandler.evtStripe.attach(
            ({ type }) => type === eventName,
            ({ data: { object } }) => {

                const subscription: Stripe.subscriptions.ISubscription = object as any;

                {

                    const customerSubscriptions = customers.find(({ id }) => id === subscription.customer)!
                        .subscriptions
                        .data;

                    customerSubscriptions[
                        customerSubscriptions.indexOf(
                            customerSubscriptions.find(({ id }) => id === subscription.id)!
                        )
                    ] = subscription;
                }

                console.log(eventName, JSON.stringify(customers, null, 2));

            }
        );

    }

}


type CustomerMetadata = {
    one_time_or_subscription: "ONE-TIME" | "SUBSCRIPTION"
    auth_user: string;
}


async function getCustomerFromAuth(
    auth: UserAuthentication,
    one_time_or_subscription: CustomerMetadata["one_time_or_subscription"],
    customers: Stripe.customers.ICustomer[]
): Promise<Stripe.customers.ICustomer | undefined> {

    return customers
        .filter(({ metadata }) => (metadata as CustomerMetadata).one_time_or_subscription === one_time_or_subscription)
        .find(({ metadata }) => (metadata as CustomerMetadata).auth_user === `${auth.user}`);

}

function createCustomerForAuth(
    auth: UserAuthentication,
    one_time_or_subscription: CustomerMetadata["one_time_or_subscription"]
): Promise<Stripe.customers.ICustomer> {

    const metadata: CustomerMetadata = {
        one_time_or_subscription,
        "auth_user": `${auth.user}`
    };

    return stripe.customers.create({
        "email": auth.shared.email,
        metadata
    });

}












/** Assert customer exist and is subscribed */
export async function unsubscribeUser(auth: UserAuthentication): Promise<void> {

    //TODO: Re-implement
    const customerStatus= await getCustomerStatus(auth.shared.email);

    if (customerStatus === "EXEMPTED") {
        return;
    }

    const customer = await getCustomerFromAuth(auth, "SUBSCRIPTION", customers);

    if (customer === undefined) {
        throw new Error("assert");
    }

    const { subscriptions: { data: subscriptions } } = customer;

    assert(subscriptions.length !== 0);

    const [{ id: subscriptionId }] = subscriptions;

    stripe.subscriptions.update(
        subscriptionId,
        { "cancel_at_period_end": true }
    );

    {

        const eventName: lbTypes.StripeEventsType = "customer.subscription.updated";

        await loadBalancerLocalApiHandler.evtStripe.waitFor(
            ({ type, data: { object } }) => (
                type === eventName &&
                (object as Stripe.subscriptions.ISubscription).id === subscriptionId
            )
        );

    }


}





export async function getSubscriptionInfos(auth: UserAuthentication): Promise<subscriptionTypes.SubscriptionInfos> {


    //TODO: Re-implement
    const customerStatus= await getCustomerStatus(auth.shared.email);

    if (customerStatus === "EXEMPTED") {
        return { customerStatus };
    }

    const out: subscriptionTypes.SubscriptionInfos.Regular = {
        customerStatus,
        "stripePublicApiKey": deploy.getStripeApiKeys().publicApiKey,
        pricingByCurrency
    };

    const customer = await getCustomerFromAuth(auth, "SUBSCRIPTION", customers);

    if (customer === undefined) {
        return out;
    }


    const { account_balance } = customer;

    if (account_balance! < 0) {

        out.due = {
            "value": -account_balance!,
            "currency": customer.currency!
        };

    }

    const subscriptions = customer.subscriptions.data
        .filter(({ status }) => status !== "canceled");

    if (subscriptions.length !== 0) {

        const [subscription] = subscriptions;

        out.subscription = {
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "current_period_end": new Date(subscription.current_period_end * 1000),
            "currency": subscription.plan!.currency
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

}

export async function isUserSubscribed(auth: UserAuthentication): Promise<boolean> {

    const subscriptionInfos = await getSubscriptionInfos(auth);

    return (
        subscriptionInfos.customerStatus === "EXEMPTED" ||
        !!subscriptionInfos.subscription
    );

}


/** 
 * -Create new subscription
 * -Re-enable subscription that have been canceled.
 * -Update default source for user.
 */
export async function subscribeUser(auth: UserAuthentication, sourceId?: string): Promise<void> {

    const customerStatus= await getCustomerStatus(auth.shared.email);

    if (customerStatus === "EXEMPTED") {
        return;
    }

    let customer = await getCustomerFromAuth(auth, "SUBSCRIPTION", customers);

    if (customer === undefined) {

        if (sourceId === undefined) {
            throw new Error("assert");
        }

        customer = await createCustomerForAuth(auth, "SUBSCRIPTION");

    }

    if (sourceId !== undefined) {

        customer = await stripe.customers.update(
            customer.id,
            { "source": sourceId }
        );

    } else {

        if (customer.default_source === null) {
            throw new Error("assert");
        }

        const state: string = customer.sources!.data
            .find(({ id }) => id === customer!.default_source)!["status"];

        if (state !== "chargeable") {
            throw new Error("assert");
        }

    }


    const subscriptions = customer.subscriptions.data
        .filter(({ status }) => status !== "canceled");

    if (subscriptions.length === 0) {

        await (stripe as any).subscriptions.create({
            "customer": customer.id,
            "items": [{
                "plan": (() => {

                    const currency = currencyLib.getCardCurrency(
                        customer
                            .sources!
                            .data
                            .find(({ id }) => id === customer!.default_source)!["card"],
                        pricingByCurrency
                    );

                    return planByCurrency[currency].id;

                })()
            }]
        });

    } else {

        const [subscription] = subscriptions;

        if (subscription.cancel_at_period_end) {

            await stripe.subscriptions.update(subscription.id, {
                "cancel_at_period_end": false
            });

        }

    }

}



//TODO: validate that currency is one of the supported
export async function createCheckoutSessionForSubscription(
    auth: UserAuthentication,
    currency: string,
    success_url: string,
    cancel_url: string
): Promise<string> {

    await currencyLib.convertFromEuro.refreshChangeRates();

    assert(await getCustomerFromAuth(auth, "SUBSCRIPTION", customers) === undefined);

    //TODO: Implement for real 
    const shouldHaveTrialPeriodOffered = await getCustomerFromAuth(auth, "ONE-TIME", customers) !== undefined;

    const sessionParams = {
        success_url,
        cancel_url,
        "customer_email": auth.shared.email,
        "payment_method_types": ["card"],
        "subscription_data": {
            "items": [{ "plan": planByCurrency[currency].id, }],
            "trial_period_days": shouldHaveTrialPeriodOffered ? 180 : undefined
        },
    };

    {

        const eventName: lbTypes.StripeEventsType = "customer.created";

        const metadata: CustomerMetadata = {
            "one_time_or_subscription": "SUBSCRIPTION",
            "auth_user": `${auth.user}`
        };

        loadBalancerLocalApiHandler.evtStripe.attachOnce(
            ({ type, data: { object: customer } }) => (
                type === eventName &&
                (customer as Stripe.customers.ICustomer).email === auth.shared.email
            ),
            ({ data: { object } }) => stripe.customers.update(
                (object as Stripe.customers.ICustomer).id,
                { metadata }
            )

        );

    }

    const session = await (stripe as any).checkout.sessions.create(
        sessionParams
    ).catch(error => error as Error);

    if (session instanceof Error) {

        throw session;

    }

    return session.id;

}



//TODO: Cart should be a set of product name quantity
export async function createCheckoutSessionForShop(
    auth: UserAuthentication,
    cartDescription: { productName: string; quantity: number; }[],
    shippingFormData: shopTypes.ShippingFormData,
    currency: string,
    success_url: string,
    cancel_url: string
): Promise<string> {

    await currencyLib.convertFromEuro.refreshChangeRates();

    let customer = await getCustomerFromAuth(auth, "ONE-TIME", customers);

    if (customer === undefined) {

        customer = await createCustomerForAuth(auth, "ONE-TIME");

    }

    const cart: shopTypes.Cart = cartDescription.map(
        ({ productName, quantity }) => ({
            "product": getShopProducts().find(({ name }) => name === productName)!,
            quantity
        })
    );

    const shipping = shippingLib.solve(
        shippingFormData.addressComponents
            .find(({ types: [type] }) => type === "country")!
            .short_name.toLowerCase(),
        shopTypes.Cart.getOverallFootprint(cart),
        shopTypes.Cart.getOverallWeight(cart),
    );

    const stripeShipping = shopTypes.ShippingFormData.toStripeShippingInformation(
        shippingFormData,
        shipping.carrier
    );

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

                    metadata[`address_${i}`] = JSON.stringify(
                        shippingFormData.addressComponents[i]
                    );

                }

                return metadata;

            })(),
            "shipping": stripeShipping
        },
        "line_items": [
            ...cart.map(({ product, quantity }) => ({
                "amount": shopTypes.Price.getAmountInCurrency(
                    product.price,
                    currency,
                    currencyLib.convertFromEuro
                ),
                currency,
                "name": product.name,
                "description": product.shortDescription,
                "images": [product.cartImageUrl],
                quantity
            })),
            {
                "amount": currencyLib.convertFromEuro(
                    shipping.eurAmount,
                    currency
                ),
                currency,
                "name": `Shipping to ${stripeShipping.address.country}`,
                "description": `~ ${shipping.delay.join("-")} working days`,
                "images": [],
                "quantity": 1
            }
        ]
    };

    console.log(JSON.stringify(sessionParams, null, 2));

    const session = await (stripe as any).checkout.sessions.create(
        sessionParams
    ).catch(error => error as Error);

    if (session instanceof Error) {

        throw session;

    }

    return session.id;

}


