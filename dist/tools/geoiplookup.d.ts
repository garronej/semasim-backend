export declare const db_file_path = "/usr/share/GeoIP/GeoLiteCity.dat";
export declare type GeoInfo = {
    countryIso: string | undefined;
    subdivisions: string | undefined;
    city: string | undefined;
    postalCode: string | undefined;
};
/** May reject error */
export declare function geoiplookup(address: string): Promise<GeoInfo>;
