export type PatientComparator = {
    amrsPersonUuid: string,
    amrsIdentifiers: string,
    amrsNames: string,
    kenyaEMRPersonId: number,
    kenyaEMRIdentifiers: string,
    kenyaEMRNames: string
}

export type PatientData = {
    person:any,
    names: Array<any>,
    identifiers: Array<any>
}