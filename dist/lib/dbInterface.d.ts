import { Contact } from "./sipContacts";
export declare namespace asterisk {
    const queryEndpoints: () => Promise<string[]>;
    const truncateContacts: () => Promise<void>;
    const queryContacts: () => Promise<Contact[]>;
    const queryLastConnectionTimestampOfDonglesEndpoint: (endpoint: string) => Promise<number>;
    const deleteContact: (contact: Contact) => Promise<boolean>;
    const addOrUpdateEndpoint: (endpoint: string, password: string) => Promise<void>;
}
export declare namespace semasim {
    type UaInstancePk = {
        dongle_imei: string;
        instance_id: string;
    };
    type TargetUaInstances = {
        allUaInstanceOfImei?: string;
        uaInstance?: UaInstancePk;
        allUaInstanceOfEndpointOtherThan?: UaInstancePk;
    };
    type MessageTowardGsmPk = {
        sim_iccid: string;
        creation_timestamp: number;
    };
    const addMessageTowardGsm: (to_number: string, text: string, sender: UaInstancePk) => Promise<MessageTowardGsmPk>;
    const setMessageToGsmSentId: ({sim_iccid, creation_timestamp}: MessageTowardGsmPk, sent_message_id: number | null) => Promise<void>;
    const getUnsentMessageOfDongleSim: (imei: string) => Promise<{
        pk: MessageTowardGsmPk;
        sender: UaInstancePk;
        to_number: string;
        text: string;
    }[]>;
    const getSenderAndTextOfSentMessageToGsm: (imei: string, sent_message_id: number) => Promise<{
        sender: UaInstancePk;
        text: string;
    } | undefined>;
    const addDongleAndSim: (imei: string, iccid: string) => Promise<void>;
    const addUaInstance: ({dongle_imei, instance_id}: UaInstancePk) => Promise<boolean>;
    const addMessageTowardSip: (from_number: string, contact_name: string | null, text: string, date: Date, target: TargetUaInstances) => Promise<void>;
    const setMessageTowardSipDelivered: ({dongle_imei, instance_id}: UaInstancePk, message_toward_sip_creation_timestamp: number) => Promise<void>;
    const getUndeliveredMessagesOfUaInstance: ({dongle_imei, instance_id}: UaInstancePk) => Promise<{
        creation_timestamp: number;
        from_number: string;
        contact_name: string | null;
        text: string;
    }[]>;
}
export declare namespace semasim_backend {
    interface Config {
        dongle_imei: string;
        sim_iccid: string;
        sim_service_provider: string | null;
        sim_number: string | null;
    }
    function addUser(email: string, password: string): Promise<number>;
    function deleteUser(user_id: number): Promise<boolean>;
    function getUserIdIfGranted(email: string, password: string): Promise<number>;
    function addConfig(user_id: number, {dongle_imei, sim_iccid, sim_service_provider, sim_number}: Config): Promise<boolean>;
    function getUserConfigs(user_id: number): Promise<Config[]>;
}
