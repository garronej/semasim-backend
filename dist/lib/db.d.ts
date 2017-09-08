export declare namespace semasim_backend {
    interface EndpointConfig {
        dongle_imei: string;
        sim_iccid: string;
        sim_service_provider: string | null;
        sim_number: string | null;
    }
    function addUser(email: string, password: string): Promise<number>;
    function deleteUser(user_id: number): Promise<boolean>;
    function getUserIdIfGranted(email: string, password: string): Promise<number>;
    function addEndpointConfig(user_id: number, {dongle_imei, sim_iccid, sim_service_provider, sim_number}: EndpointConfig): Promise<boolean>;
    function deleteEndpointConfig(user_id: number, imei: string): Promise<boolean>;
    function getUserEndpointConfigs(user_id: number): Promise<EndpointConfig[]>;
}
