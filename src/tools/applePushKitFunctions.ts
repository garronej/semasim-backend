
import * as apn from "apn";
import * as path from "path";

let apnProvider: apn.Provider | undefined = undefined;

export function init(options: apn.ProviderOptions) {

  if ( apnProvider ) return;

  options.production = false;

  console.log(options);

  apnProvider = new apn.Provider(options);

}

export async function sendPushNotification(
  registrationToken: string,
  appId: string
) {

  if (!apnProvider) throw new Error("ApplePushKit not initialized");

  // Prepare the notifications
  let notification = new apn.Notification();
  notification.expiry = Math.floor(Date.now() / 1000) + 24 * 3600; // will expire in 24 hours from now
  //notification.badge = 2;
  //notification.sound = "ping.aiff";
  //notification.alert = "Hello from solarianprogrammer.com";
  notification.payload = { "p1": "Hello world" };

  // Replace this with your app bundle ID:
  notification.topic = appId;

  let resp=  await apnProvider.send(notification, registrationToken);

  if ( resp.failed.length ){

    throw new Error(JSON.stringify(resp.failed.pop()));

  }

}
