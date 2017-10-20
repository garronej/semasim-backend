import { DongleController as Dc } from "chan-dongle-extended-client";


export function validDongle(
    dongle: Dc.ActiveDongle
) {

    console.assert( typeof dongle.imei === "string")
    console.assert( dongle.isVoiceEnabled === undefined || typeof dongle.isVoiceEnabled === "boolean" );

}

export function sameDongle( 
    dongle1: Dc.ActiveDongle, 
    dongle2: Dc.ActiveDongle 
){

    validDongle(dongle1);
    validDongle(dongle2);

    console.assert(dongle1.imei === dongle2.imei );
    console.assert(dongle1.isVoiceEnabled === dongle2.isVoiceEnabled );

}

export function validSim(
    sim: Dc.ActiveDongle["sim"]
){

    console.assert( typeof sim.iccid === "string" );
    console.assert( typeof sim.imsi === "string" );
    console.assert( sim.number === undefined || typeof sim.number === "string");
    console.assert( sim.serviceProvider === undefined || typeof sim.serviceProvider === "string");

    console.assert( typeof sim.phonebook.infos.contactNameMaxLength === "number");
    console.assert( typeof sim.phonebook.infos.numberMaxLength === "number");
    console.assert( typeof sim.phonebook.infos.storageLeft === "number");

    console.assert(  sim.phonebook.contacts instanceof Array );

    for( let contact of sim.phonebook.contacts ){

        console.assert( typeof contact.index === "number" );
        console.assert( typeof contact.name === "string" );
        console.assert( typeof contact.number === "string");

    }

}

export function sameSim( 
    sim1: Dc.ActiveDongle["sim"], 
    sim2: Dc.ActiveDongle["sim"]
){

    validSim(sim1);
    validSim(sim2);

    console.assert( sim1.iccid === sim2.iccid );
    console.assert( sim1.imsi === sim2.imsi );
    console.assert( sim1.number === sim2.number );
    console.assert( sim1.serviceProvider === sim2.serviceProvider );

    console.assert( sim1.phonebook.infos.contactNameMaxLength === sim2.phonebook.infos.contactNameMaxLength);
    console.assert( sim1.phonebook.infos.numberMaxLength === sim2.phonebook.infos.numberMaxLength );
    console.assert( sim1.phonebook.infos.storageLeft === sim2.phonebook.infos.storageLeft );

    console.assert( sim1.phonebook.contacts.length === sim2.phonebook.contacts.length );

    for( let contact of sim1.phonebook.contacts ){
        
        let res= sim2.phonebook.contacts.filter( c => (
            c.index === contact.index,
            c.name === contact.name,
            c.number === contact.number
        ))

        console.assert(res.length === 1);

    }

}

export function validEndpoint( 
    dongle: Dc.ActiveDongle, 
){

    validDongle(dongle);
    validSim(dongle.sim);

}


export function sameEndpoint( 
    dongle1: Dc.ActiveDongle, 
    dongle2: Dc.ActiveDongle 
){

    sameDongle(dongle1, dongle2);
    sameSim(dongle1.sim, dongle2.sim);

}