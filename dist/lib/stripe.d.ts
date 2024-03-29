import { UserAuthentication } from "./web/sessionManager";
import * as types from "../frontend/types";
export declare function launch(): Promise<void>;
/** Assert customer exist and is subscribed */
export declare function unsubscribeUser(auth: UserAuthentication): Promise<void>;
export declare function getSubscriptionInfos(auth: UserAuthentication): Promise<types.subscription.SubscriptionInfos>;
export declare function isUserSubscribed(auth: UserAuthentication): Promise<boolean>;
/**
 * -Create new subscription
 * -Re-enable subscription that have been canceled.
 * -Update default source for user.
 */
export declare function subscribeUser(auth: UserAuthentication, sourceId?: string): Promise<void>;
export declare function createCheckoutSessionForSubscription(auth: UserAuthentication, currency: string, success_url: string, cancel_url: string): Promise<string>;
export declare function createCheckoutSessionForShop(auth: UserAuthentication, cartDescription: {
    productName: string;
    quantity: number;
}[], shippingFormData: types.shop.ShippingFormData, currency: string, success_url: string, cancel_url: string): Promise<string>;
