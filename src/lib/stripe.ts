
import * as Stripe from "stripe";
import { Auth } from "../lib/web/sessionManager";
import * as f from "../tools/mysqlCustom";
import { deploy } from "../deploy";
import { bodyParser } from "../tools/webApi/misc";
import { SyncEvent } from "ts-events-extended";
import { types as feTypes } from "../frontend";

namespace db {

    /** exported only for tests */
    export let query: f.Api["query"];
    export let esc: f.Api["esc"];
    let buildInsertQuery: f.Api["buildInsertQuery"];

    /** Must be called and before use */
    export function launch() {

        const api = f.createPoolAndGetApi({
            ...deploy.dbAuth.value!,
            "database": "semasim_stripe"
        }, "HANDLE STRING ENCODING");

        query = api.query;
        esc = api.esc;
        buildInsertQuery = api.buildInsertQuery;

    }

    export async function setCustomerId(auth: Auth, customerId: string): Promise<void> {

        const sql = buildInsertQuery(
            "customer",
            { "id": customerId, "user": auth.user },
            "THROW ERROR"
        );

        await query(sql, { "user": auth.user });

    }

    export async function getCustomerId(auth: Auth): Promise<string | undefined> {

        const sql = `SELECT id FROM customer WHERE user=${esc(auth.user)}`;

        const rows = await query(sql, { "user": auth.user });

        if (rows.length === 0) {
            return undefined;
        }

        return rows[0]["id"];

    }


}

let stripe: Stripe;

export function launch() {

    db.launch();

    stripe = new Stripe("sk_test_tjDeOW7JrFihMOM3134bNpIO");

}

/** 
 * -Create new subscription
 * -Re-enable subscription that have been canceled.
 * -Update default source for user.
 */
export async function subscribeUser(auth: Auth, sourceId?: string): Promise<void> {

    let customerId = await db.getCustomerId(auth);

    if (customerId === undefined) {

        if (sourceId === undefined) {
            throw new Error("assert");
        }

        const { id } = await stripe.customers.create({ "email": auth.email });

        customerId = id;

        await db.setCustomerId(auth, customerId);

    }

    if (sourceId !== undefined) {

        await stripe.customers.update(customerId, { "source": sourceId });

    } else {

        const customer = await stripe.customers.retrieve(customerId);

        if (customer.default_source === null) {
            throw new Error("assert");
        }

        const state: string = customer.sources!.data
            .find(({ id }) => id === customer.default_source)!["state"];

        if (state !== "chargeable") {
            throw new Error("assert");
        }

    }

    let { subscriptions: { data: subscriptions } } = await stripe.customers.retrieve(customerId);

    subscriptions = subscriptions.filter(({ status }) => status !== "canceled");

    if (subscriptions.length === 0) {

        await stripe.subscriptions.create({
            "customer": customerId,
            "items": [{ "plan": "plan_E25sJsRtiJ0hh1" }],
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

    const customerId = await db.getCustomerId(auth);

    if (customerId === undefined) {
        throw new Error("assert");
    }

    const { subscriptions: { data: subscriptions } } = await stripe.customers.retrieve(customerId);

    console.assert(subscriptions.length !== 0);

    const [{ id: subscriptionId }] = subscriptions;

    await stripe.subscriptions.update(subscriptionId, {
        "cancel_at_period_end": true
    });

}

export async function getSubscriptionInfos(
    auth: Auth
): Promise<feTypes.SubscriptionInfos> {

    const customerId = await db.getCustomerId(auth);

    if (customerId === undefined) {

        return {};

    }

    const customer = await stripe.customers.retrieve(customerId);

    const { account_balance } = customer;

    const out: feTypes.SubscriptionInfos = {};

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
            "current_period_end": new Date(subscription.current_period_end),
            "start": new Date(subscription.start)
        };

    }

    if (customer.default_source !== null) {

        const source = customer.sources!.data
            .find(({ id }) => id === customer.default_source)!;

        out.source = {
            "isChargeable": source["status"] === "chargeable",
            "expiration": "XX/XX",
            "lastDigits": source["card"]["last4"],
            "brand": source["card"]["brand"]
        };


    }

    return out;

}


const evt = new SyncEvent<any>();

evt.attach(data => console.log("stripe webhook", data));

export function registerWebHooks(app: import("express").Express) {

    app.post("/stripe_webhooks", async (res, req) => {

        const { isSuccess, data } = await bodyParser(res);

        if (isSuccess) {

            evt.post(
                JSON.parse(data.toString("utf8"))
            );

        }

        req.status(200).send();

    })

}


