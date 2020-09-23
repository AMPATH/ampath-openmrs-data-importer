export type Person = {
    person_id: number;
    uuid: string;
    gender: string;
    birthdate: Date;
    birthdate_estimated: number;
    birthtime: string;
    dead: number;
    death_date: Date;
    deathdate_estimated: number;
    cause_of_death: any;
    creator: number;
    date_created: Date;
    changed_by: number;
    date_changed: Date;
    voided: number;
    voided_by: number;
    date_voided: Date;
    void_reason: string;
};

export type Patient = {
    patient_id: number;
    creator: number;
    date_created: string,
    changed_by: number,
    date_changed: string,
    voided: number,
    voided_by: number,
    date_voided: string,
    void_reason: string
};

export type Address = {
    person_address_id: number;
    person_id: number;
    preferred: number;
    address1: string;
    address2: string;
    city_village: string;
    state_province: string;
    postal_code: string;
    country: string;
    latitude: string;
    longitude: string;
    start_date: string;
    end_date: string;
    creator: number;
    date_created: string;
    voided: number;
    voided_by: number;
    date_voided: string;
    void_reason: string;
    county_district: string;
    address3: string;
    address4: string;
    address5: string;
    address6: string;
    date_changed: string;
    changed_by: number;
    uuid: string;
};

export type PersonName = {
    person_name_id: number;
    preferred: number;
    person_id: number;
    prefix: any;
    given_name: string;
    middle_name: string;
    family_name_prefix: any;
    family_name: string;
    family_name2: string;
    family_name_suffix: any;
    degree: any;
    creator: number;
    date_created: string;
    voided: number;
    voided_by: number;
    date_voided: string;
    void_reason: string;
    changed_by: number;
    date_changed: string;
    uuid: string;
};

export type PersonAttribute = {
    person_attribute_id: number;
    person_id: number;
    value: string;
    person_attribute_type_id: number;
    creator: number;
    date_created: string;
    changed_by: number;
    date_changed: string;
    voided: number;
    voided_by: number;
    date_voided: string;
    void_reason: string;
    uuid: string;
};

export type PatientIdentifier = {
    patient_identifier_id: number;
    patient_id: number;
    identifier: string;
    identifier_type: number;
    preferred: number;
    location_id: number;
    creator: number;
    date_created: string;
    date_changed: string;
    changed_by: number;
    voided: number;
    voided_by: number;
    date_voided: string;
    void_reason: string;
    uuid: string;
};
export type User = {
    user_id: number;
    system_id: string;
    username: string;
    password: string;
    salt: string;
    secret_question: string;
    secret_answer: string;
    creator: number;
    date_created: Date;
    changed_by: number;
    date_changed: Date;
    person_id: number;
    retired: number;
    retired_by: number;
    date_retired: Date;
    retire_reason: string;
    uuid: string;
}

export type Obs = {
    obs_id: number;
    amrs_obs_id: number;
    person_id: number;
    concept_id: number;
    encounter_id: number;
    order_id: number;
    obs_datetime: Date;
    location_id: number;
    obs_group_id: number;
    accession_number: string;
    value_group_id: number;
    value_boolean: number;
    value_coded: number;
    value_coded_name_id: number;
    value_drug: number;
    value_datetime: Date;
    value_numeric: number;
    value_modifier: string;
    value_text: string;
    value_complex: string;
    comments: string;
    creator: number;
    date_created: Date;
    voided: number;
    voided_by: number;
    date_voided: Date;
    void_reason: string;
    uuid: string;
    form_namespace_and_path: number;
    previous_version: string;
    status: string; // Default FINAL
    interpretation: number;
}
export type Visit = {
    visit_id: number;
    patient_id: number;
    visit_type_id: number;
    date_started: Date;
    date_stopped: Date;
    indication_concept_id: number;
    location_id: number;
    creator: number;
    date_created: Date;
    changed_by: number;
    date_changed: Date;
    voided: number;
    voided_by: number;
    date_voided: Date;
    void_reason: string;
    uuid: string;

}

export type VisitAttribute = {
    visit_attribute_id: number;
    visit_id: number;
    attribute_type_id: number;
    value_reference: number;
    uuid: string;
    creator: number;
    date_created: Date;
    changed_by: number;
    date_changed: Date;
    voided: number;
    voided_by: number
    date_voided: Date;
    void_reason: string;
}

export type Order = {
    order_id: number;
    order_type_id: number;
    concept_id: number;
    orderer: number;
    encounter_id: number;
    instructions: string;
    date_activated: Date;
    auto_expire_date: Date;
    date_stopped: Date;
    order_reason: number;
    order_reason_non_coded: string;
    creator: number;
    date_created: Date;
    voided: number;
    voided_by: number;
    date_voided: Date;
    void_reason: string;
    patient_id: number;
    accession_number: string;
    uuid: string;
    urgency: string;
    order_number: string;
    previous_order_id: number;
    order_action: string;
    comment_to_fulfiller: string;
    care_setting: number;
    scheduled_date: Date;
    order_group_id: number;
    sort_weight: number; 
};
export type Provider = {
    provider_id: number;
    person_id: number;
    name: string;
    identifier: string;
    creator: number;
    date_created: Date;
    changed_by: number;
    date_changed: Date;
    retired: number;
    retired_by: number;
    date_retired: Date;
    retire_reason: string;
    uuid: string;
}
