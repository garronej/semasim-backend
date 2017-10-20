export declare const data: {
    "title": string;
    "table_panel_title": string;
    "table_rows": {
        "title": string;
        "key": string;
    }[];
    "form_instructions": string;
    "form_fields": {
        "imei": {
            "text": string;
            "placeholder": string;
        };
        "last_four_digits_of_iccid": {
            "text": string;
            "placeholder": string;
        };
        "pin_first_try": {
            "text": string;
            "placeholder": string;
        };
        "pin_second_try": {
            "text": string;
            "placeholder": string;
        };
    };
    "form_title": string;
    "success": string;
    "wait": string;
    "submit": string;
};
export declare function buildData(email: string, userEndpoints: {
    dongle_imei: string;
    sim_iccid: string;
    sim_service_provider: string | null;
    sim_number: string | null;
}[]): {
    email: string;
    userEndpoints: {
        dongle_imei: string;
        sim_iccid: string;
        sim_service_provider: string | null;
        sim_number: string | null;
    }[];
    "title": string;
    "table_panel_title": string;
    "table_rows": {
        "title": string;
        "key": string;
    }[];
    "form_instructions": string;
    "form_fields": {
        "imei": {
            "text": string;
            "placeholder": string;
        };
        "last_four_digits_of_iccid": {
            "text": string;
            "placeholder": string;
        };
        "pin_first_try": {
            "text": string;
            "placeholder": string;
        };
        "pin_second_try": {
            "text": string;
            "placeholder": string;
        };
    };
    "form_title": string;
    "success": string;
    "wait": string;
    "submit": string;
};
