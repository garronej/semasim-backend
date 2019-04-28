import { Auth } from "../lib/web/sessionManager";
import { types as feTypes } from "../frontend";
export declare function launch(): Promise<void>;
/** Assert customer exist and is subscribed */
export declare function unsubscribeUser(auth: Auth): Promise<void>;
export declare function getSubscriptionInfos(auth: Auth): Promise<feTypes.SubscriptionInfos>;
export declare function isUserSubscribed(auth: Auth): Promise<boolean>;
/**
 * -Create new subscription
 * -Re-enable subscription that have been canceled.
 * -Update default source for user.
 */
export declare function subscribeUser(auth: Auth, sourceId?: string): Promise<void>;
export declare function createCheckoutSessionForSubscription(auth: Auth, currency: string, success_url: string, cancel_url: string): Promise<string>;
export declare function createCheckoutSessionForShop(auth: Auth, cartDescription: {
    productName: string;
    quantity: number;
}[], shippingFormData: feTypes.shop.ShippingFormData, currency: string, success_url: string, cancel_url: string): Promise<string>;
