require("rejection-tracker").main(__dirname, "..", "..");

import { DongleController as Dc } from "chan-dongle-extended-client";
import * as db from "../lib/db";
import * as assert from "./assert";

(async function testDb() {

    console.log("START TEST...");

    await db.flush();

    let start = Date.now();

    let email= "joseph.garrone.gj@gmail.com";
    let password= "abcde12345";

    let user= await db.addUser(email, password);

    if( user === undefined ){
        console.assert(false, "m1");
        return;
    }

    console.assert( await db.authenticateUser(email, password) === user, "m2" );
    console.assert( await db.authenticateUser(email, "notMyPassword") === undefined, "m3" );

    console.assert( await db.addUser(email, "fooBarBaz") === undefined ,"m4");

    console.assert( (await db.getEndpoints(user)).length === 0);

    let dongle: Dc.ActiveDongle = {
        "imei": "353762037478870",
        "isVoiceEnabled": true,
        "sim": {
            "iccid": "8933150116110005978",
            "imsi": "208150113995832",
            "number": "+33769365812",
            "serviceProvider": "Free",
            "phonebook": {
                "infos": { "contactNameMaxLength": 14, "numberMaxLength": 24, "storageLeft": 242 },
                "contacts": [
                    { "index": 1, "number": "0636786385", "name": "Joseph Garrone" },
                    { "index": 2, "number": "0606894175", "name": "Antonin Garron" },
                    { "index": 3, "number": "+33671124615", "name": "William Therry" }, 
                    { "index": 4, "number": "+33769365812", "name": "Sim Free" }, 
                    { "index": 5, "number": "+33621713869", "name": "Florian Cahuza" },
                    { "index": 6, "number": "+33650530956", "name": "Alexi Dafoncec" },
                    { "index": 7, "number": "0782397709", "name": "Sienna" }
                ]
            }
        }
    };

    assert.validEndpoint(dongle);

    await db.addEndpoint(dongle, user);

    assert.sameEndpoint( 
        dongle, 
        (await db.getEndpoints(user))[0]
    );

    let sim2= {
            "iccid": "1111111111111",
            "imsi": "444444444444444",
            "number": "+007",
            "serviceProvider": "Free",
            "phonebook": {
                "infos": { "contactNameMaxLength": 14, "numberMaxLength": 24, "storageLeft": 250 },
                "contacts": [ ]
            }
    };

    await db.addEndpoint({ ...dongle, "sim": sim2 }, user);

    console.assert((await db.getEndpoints(user)).length === 1);

    assert.sameDongle(
        dongle, 
        (await db.getEndpoints(user))[0]
    );

    assert.sameSim(
        sim2,
        (await db.getEndpoints(user))[0].sim
    )

    console.assert( await db.deleteEndpoint(dongle.imei, user) );
    console.assert( !(await db.deleteEndpoint(dongle.imei, user)) );
    console.assert( (await db.getEndpoints(user)).length === 0 );

    let dongle2: Dc.ActiveDongle= {
        "imei": "111111111111203",
        "isVoiceEnabled": undefined,
        "sim": dongle.sim
    };

    await db.addEndpoint(dongle, user);

    await db.addEndpoint(dongle2, user);

    console.assert( (await db.getEndpoints(user)).length === 2 );
    
    await(async ()=>{

        let [ d1, d2 ]= await db.getEndpoints(user);

        assert.sameEndpoint(dongle, d1);
        assert.sameEndpoint(dongle2, d2);

    })();


    let runTime = Date.now() - start;

    await db.flush();

    console.log(`...PASS! runTime: ${runTime}ms`);

})();
