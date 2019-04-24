
import * as Stripe from "stripe";
import { Auth } from "../lib/web/sessionManager";
import { deploy } from "../deploy";
import { types as feTypes, currencyLib, getShopProducts, shipping as shippingLib } from "../frontend";
import * as assert from "assert";
import * as loadBalancerLocalApiHandler from "./toLoadBalancer/localApiHandlers";



let stripe: Stripe;

const planByCurrency: { [currency: string]: { id: string; amount: number; } } = {};

const pricingByCurrency: feTypes.SubscriptionInfos.Regular["pricingByCurrency"] = {};

const customers: Stripe.customers.ICustomer[] = [];

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

    console.log(JSON.stringify(customers, null, 2));


    loadBalancerLocalApiHandler.evtStripe.attach(
        ({ type }) => type === "customer.updated",
        ({ data: { object } }) => {

            const customer = object as Stripe.customers.ICustomer;

            customers[
                customers.indexOf(
                    customers.find(
                        ({ id }) => id === customer.id
                    )!
                )
            ] = customer;

            console.log("customer.updated", JSON.stringify(customers, null, 2));

        }
    );

    loadBalancerLocalApiHandler.evtStripe.attach(
        ({ type }) => type === "customer.created",
        ({ data: { object } }) => {

            const customer = object as Stripe.customers.ICustomer;

            customers.push(customer);

            console.log("customer.created", JSON.stringify(customers, null, 2));

        }
    );

    loadBalancerLocalApiHandler.evtStripe.attach(
        ({ type }) => type === "customer.deleted",
        ({ data: { object } }) => {


            const { id } = object as Stripe.customers.ICustomer;

            customers.splice(
                customers.indexOf(
                    customers.find(customer => customer.id === id)!
                ),
                1
            );

            console.log("customer.deleted", JSON.stringify(customers, null, 2));


        }
    );

}


type CustomerMetadata = {
    one_time_or_subscription: "ONE-TIME" | "SUBSCRIPTION"
    auth_user: string;
}

async function getCustomerFromAuth(
    auth: Auth,
    one_time_or_subscription: CustomerMetadata["one_time_or_subscription"],
    customers: Stripe.customers.ICustomer[]
): Promise<Stripe.customers.ICustomer | undefined> {

    return customers
        .filter(({ metadata }) => (metadata as CustomerMetadata).one_time_or_subscription === one_time_or_subscription)
        .find(({ metadata }) => (metadata as CustomerMetadata).auth_user === `${auth.user}`);

}

function createCustomerForAuth(
    auth: Auth,
    one_time_or_subscription: CustomerMetadata["one_time_or_subscription"]
): Promise<Stripe.customers.ICustomer> {

    const metadata: CustomerMetadata = {
        one_time_or_subscription,
        "auth_user": `${auth.user}`
    };

    return stripe.customers.create({
        "email": auth.email,
        metadata
    });

}










/** 
 * -Create new subscription
 * -Re-enable subscription that have been canceled.
 * -Update default source for user.
 */
export async function subscribeUser(auth: Auth, sourceId?: string): Promise<void> {

    //let { customerStatus, customerId } = await db.getCustomerId(auth);


    //TODO: Re-implement
    const customerStatus: string = "REGULAR";

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

    let { subscriptions: { data: subscriptions } } = customer;

    subscriptions = subscriptions.filter(({ status }) => status !== "canceled");

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


/** Assert customer exist and is subscribed */
export async function unsubscribeUser(auth: Auth): Promise<void> {

    //TODO: Re-implement
    const customerStatus: string = "REGULAR";

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

    await stripe.subscriptions.update(subscriptionId, {
        "cancel_at_period_end": true
    });

}




export async function getSubscriptionInfos(auth: Auth): Promise<feTypes.SubscriptionInfos> {


    //TODO: Re-implement
    const customerStatus: "REGULAR" | "EXEMPTED" = "REGULAR" as any;

    if (customerStatus === "EXEMPTED") {
        return { customerStatus };
    }

    const out: feTypes.SubscriptionInfos.Regular = {
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
    return out;

}

export async function isUserSubscribed(auth: Auth): Promise<boolean> {

    const subscriptionInfos = await getSubscriptionInfos(auth);

    return (
        subscriptionInfos.customerStatus === "EXEMPTED" ||
        !!subscriptionInfos.subscription
    );

}







//TODO: Cart should be a set of product name quantity
export async function createStripeCheckoutSession(
    auth: Auth,
    cartDescription: { productName: string; quantity: number; }[],
    shippingFormData: feTypes.shop.ShippingFormData,
    currency: string
): Promise<string> {

    await currencyLib.convertFromEuro.refreshChangeRates();

    let customer = await getCustomerFromAuth(auth, "ONE-TIME", customers);

    if (customer === undefined) {

        customer = await createCustomerForAuth(auth, "ONE-TIME");

    }

    const cart: feTypes.shop.Cart = cartDescription.map(
        ({ productName, quantity }) => ({
            "product": getShopProducts().find(({ name }) => name === productName)!,
            quantity
        })
    );

    const shipping = shippingLib.solve(
        shippingFormData.addressComponents
            .find(({ types: [type] }) => type === "country")!
            .short_name.toLowerCase(),
        feTypes.shop.Cart.getOverallFootprint(cart),
        feTypes.shop.Cart.getOverallWeight(cart),
    );

    const stripeShipping = feTypes.shop.ShippingFormData.toStripeShippingInformation(
        shippingFormData,
        shipping.carrier
    );

    const sessionParams = {
        /*
        "subscription_data": {
            "items": [ { "plan": "plan_E25sJsRtiJ0hh1", } ],
            "trial_period_days": 180
        },
        */
        "success_url": `https://web.${deploy.getBaseDomain()}/shop?sucess=true`,
        "cancel_url": `https://web.${deploy.getBaseDomain()}/shop?success=false`,
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
                "amount": feTypes.shop.Price.getAmountInCurrency(
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


