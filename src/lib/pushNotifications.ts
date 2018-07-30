import { types as gwTypes } from "../semasim-gateway";
import * as pushSender from "../tools/pushSender";
import * as i from "../bin/installer";
import * as logger from "logger";

const debug= logger.debugFactory();

export function beforeExit(){
    return beforeExit.impl();
}

export namespace beforeExit {
    export let impl= ()=> Promise.resolve();
}

export function launch() {

    pushSender.launch(i.pushNotificationCredentials);

    beforeExit.impl = async () => {

        debug("BeforeExit...");

        try {

            await pushSender.close();

        } catch (error) {

            debug(error);

            throw error;

        }

        debug("BeforeExit success");

    };

}

/** Return true if everything goes as expected */
export async function send(
    target: gwTypes.Ua | gwTypes.Ua[],
    reloadConfig: "RELOAD CONFIG" | undefined = undefined
): Promise<boolean> {

    if (target instanceof Array) {

        const uas = target;

        const tasks: Promise<boolean>[] = [];

        for (let ua of uas) {

            tasks[tasks.length] = send(ua, reloadConfig);

        }

        return (await Promise.all(tasks))
            .reduce((r, elem) => r && elem, true);

    } else {

        const ua = target;

        if (ua.platform === "web") {

            return true;

        }

        let prIsSent = pending.get(ua);

        if (prIsSent) {

            debug("avoid sending push as it was recently sent");

            return prIsSent;

        }

        prIsSent = (async () => {

            try {

                await pushSender.send(
                    ua.platform as pushSender.Platform,
                    ua.pushToken,
                    { "reload_config": !!reloadConfig ? "1" : "0" }
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

