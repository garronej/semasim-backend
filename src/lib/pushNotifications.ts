import { types as gwTypes } from "../semasim-gateway";
import * as pushSender from "../tools/pushSender";
import * as c from "./_constants";

export function launch() {

    pushSender.launch(c.pushNotificationCredentials);

}

export async function send(
    target: gwTypes.Ua | gwTypes.Ua[],
    reloadConfig: "RELOAD CONFIG" | undefined = undefined
): Promise<boolean> {

    if (target instanceof Array) {

        let uas = target;

        let task: Promise<boolean>[] = [];

        for (let ua of uas) {

            task[task.length] = send(ua, reloadConfig);

        }

        try {

            await task;


        } catch{

            return false;

        }

        return true;

    } else {

        let ua = target;

        let prIsSent = pending.get(ua);

        if (prIsSent) return prIsSent;

        prIsSent = (async () => {

            try {

                await pushSender.send(
                    ua.platform as pushSender.Platform,
                    ua.pushToken
                );

            } catch{

                return false;

            }

            return true;

        })();

        pending.set(ua, prIsSent);

        return prIsSent;


    }


}

namespace pending {

    /** UaId => prIsSent */
    const map = new Map<string, Promise<boolean>>();

    export function get(
        ua: gwTypes.Ua
    ) {
        return map.get(gwTypes.misc.generateUaId(ua));
    }

    export function set(
        ua: gwTypes.Ua,
        prIsSent: Promise<boolean>
    ) {

        let uaId = gwTypes.misc.generateUaId(ua);

        switch (ua.platform) {
            case "iOS":
                setTimeout(() => map.delete(uaId), 10000);
                break;
            case "android":
                prIsSent.then(() => map.delete(uaId))
                break;
        }

        map.set(uaId, prIsSent);

    }

}

