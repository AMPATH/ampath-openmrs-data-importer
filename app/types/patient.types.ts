export type PatientComparator = {
    Amrs_person_uuid: string,
    Amrs_identifiers: string,
    Amrs_names: string,
    Kenya_emr_personId: number,
    Kenya_emr_identifiers: string,
    Kenya_emr_names: string
}

export type PatientData = {
    person:any,
    names: Array<any>,
    identifiers: Array<any>
}