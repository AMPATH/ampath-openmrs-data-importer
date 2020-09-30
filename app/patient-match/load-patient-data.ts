import { Connection } from "mysql";
import ConnectionManager from "../connection-manager";

import {
  fetchPerson,
  fetchPersonNames,
  fetchPersonIdentifiers,
} from "../patients/load-patient-data";
import { PatientData } from "../types/patient.types";

const connection = ConnectionManager.getInstance();

export async function fetchKenyaEMRPatientIds(limit: number) {
  const kenyaEmrConnection = await connection.getConnectionKenyaemr();
  const sql = `select patient_id from kenya_emr.patient limit ${limit}`;
  let results: any[] = await connection.query(sql, kenyaEmrConnection);
  kenyaEmrConnection.destroy();
  return results;
}

export async function loadData(patientId: number) {
  const kenyaEmrConnection = await connection.getConnectionKenyaemr();
  try {
    return await loadPatientData(patientId, kenyaEmrConnection);
  } catch (e) {
    console.error("Error loading patient data: ", e);
  }
}

async function loadPatientData(patientId: number, connection: Connection) {
  let person = await fetchPerson(patientId, connection);
  let names = await fetchPersonNames(patientId, connection);
  let identifiers = await fetchPersonIdentifiers(patientId, connection);

  let results: PatientData = {
    person: person,
    names: names,
    identifiers: identifiers,
  };
  connection.destroy();
  return results;
}
