import ConnectionManager from "../connection-manager";
import { Connection } from "mysql";
import {
  Person,
  Patient,
  Address,
  PersonName,
  PersonAttribute,
  PatientIdentifier,
  PatientProgram,
  PersonAttributeType,
} from "../tables.types";
import { PatientData } from "./patient-data";
import loadPatientObs from "../encounters/load-patient-obs";
import loadVisitData from "../visits/load-visits-data";
import loadPatientOrders from "../encounters/load-orders";
import { fetchProvider } from "../providers/load-provider-data";
import loadencounters from "../encounters/load-encounters";
const CM = ConnectionManager.getInstance();

export async function loadPatientDataByUuid(
  personUuid: string,
  connection: Connection
) {
  const personId = await fetchPersonIdByUuid(personUuid, connection);
  return await loadPatientData(personId, connection);
}

export default async function loadPatientData(
  patientId: number,
  connection: Connection
) {
  let person = await fetchPerson(patientId, connection);
  let patient = await fetchPatient(patientId, connection);
  let address = await fetchAddress(patientId, connection);
  let names = await fetchPersonNames(patientId, connection);
  let attributes = await fetchPersonAttributes(patientId, connection);
  let identifiers = await fetchPersonIdentifiers(patientId, connection);
  let obs = await loadPatientObs(patientId, connection);
  let visits = await loadVisitData(patientId, connection);
  let orders = await loadPatientOrders(patientId, connection);
  let provider = await fetchProvider(patientId, connection);
  let encounters = await loadencounters(patientId, connection);
  let patientPrograms = await fetchPatientPrograms(patientId, connection);
  let results: PatientData = {
    person: person,
    patient: patient,
    address: address,
    names: names,
    attributes: attributes,
    identifiers: identifiers,
    patientPrograms: patientPrograms,
    obs: obs,
    orders: orders,
    visits: visits,
    provider: provider,
    encounter: encounters,
  };
  return results;
}

export async function fetchPersonIdByUuid(
  personUuid: string,
  connection: Connection
) {
  const sql = `select person_id from person where uuid= '${personUuid}'`;
  let results: any[] = await CM.query(sql, connection);
  // console.log('persons with uuid', results);
  return results.length > 0 ? (results[0]["person_id"] as number) : -1;
}

export async function fetchPerson(personId: number, connection: Connection) {
  const sql = `select * from person where person_id= ${personId}`;
  let results: Person[] = await CM.query(sql, connection);
  return results[0];
}

export async function fetchPatient(personId: number, connection: Connection) {
  const sql = `select * from patient where patient_id= ${personId}`;
  let results: Patient[] = await CM.query(sql, connection);
  return results[0];
}

export async function fetchAddress(personId: number, connection: Connection) {
  const sql = `select * from person_address where person_id= ${personId}`;
  let results: Address[] = await CM.query(sql, connection);
  return results[0];
}

export async function fetchPersonNames(
  personId: number,
  connection: Connection
) {
  const sql = `select * from person_name where person_id= ${personId}`;
  let results: PersonName[] = await CM.query(sql, connection);
  return results;
}

export async function fetchPersonAttributes(
  personId: number,
  connection: Connection
) {
  const sql = `select * from person_attribute where person_id= ${personId}`;
  let results: PersonAttribute[] = await CM.query(sql, connection);
  return results;
}

export async function fetchPersonIdentifiers(
  personId: number,
  connection: Connection
) {
  const sql = `select * from patient_identifier where patient_id= ${personId}`;
  let results: PatientIdentifier[] = await CM.query(sql, connection);
  return results;
}

export async function fetchPatientPrograms(
  personId: number,
  connection: Connection
) {
  const sql = `select * from patient_program where patient_id= ${personId}`;
  let results: PatientProgram[] = await CM.query(sql, connection);
  return results;
}

export async function fetchPersonAttributeTypes(connection: Connection) {
  const sql = `select * from person_attribute_type`;
  let results: PersonAttributeType[] = await CM.query(sql, connection);
  return results;
}
