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
  Encounter,
} from "../tables.types";
import { PatientData } from "./patient-data";
import loadPatientObs from "../encounters/load-patient-obs";
import loadVisitData from "../visits/load-visits-data";
import loadPatientOrders from "../encounters/load-orders";
import { fetchProvider } from "../providers/load-provider-data";
import loadencounters from "../encounters/load-encounters";
import toInsertSql from "../prepare-insert-sql";
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
  let obs = [{}];
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
  const sql = `select * from person_address where person_id= ${personId} and voided=0`;
  let results: Address[] = await CM.query(sql, connection);
  return results[0];
}

export async function fetchPersonNames(
  personId: number,
  connection: Connection
) {
  const sql = `select * from person_name where person_id= ${personId} and voided=0`;
  let results: PersonName[] = await CM.query(sql, connection);
  return results;
}

export async function fetchPersonAttributes(
  personId: number,
  connection: Connection
) {
  const sql = `select * from person_attribute where person_id= ${personId} and voided=0`;
  let results: PersonAttribute[] = await CM.query(sql, connection);
  //console.log("Iman", sql, results);
  return results;
}

export async function fetchPersonIdentifiers(
  personId: number,
  connection: Connection
) {
  const sql = `select * from patient_identifier where patient_id= ${personId} and voided=0`;
  let results: PatientIdentifier[] = await CM.query(sql, connection);
  return results;
}

export async function fetchPatientPrograms(
  personId: number,
  connection: Connection
) {
  const sql = `select * from amrs.patient_program where patient_id= ${personId} and voided=0`;
  let results: PatientProgram[] = await CM.query(sql, connection);
  return results;
}

export async function fetchPersonAttributeTypes(connection: Connection) {
  const sql = `select * from person_attribute_type and voided=0`;
  let results: PersonAttributeType[] = await CM.query(sql, connection);
  return results;
}
export async function fetchorCreatePersonAttributeTypes(
  amrsConnection: Connection,
  emrConnection: Connection,
  attributeTypeId: any
) {
  const sql = `select * from person_attribute_type where person_attribute_type_id =${attributeTypeId}`;
  let results: PersonAttributeType[] = await CM.query(sql, amrsConnection);
  if (results.length > 0) {
    const sql2 = `select * from person_attribute_type where uuid ="${results[0].uuid}"`;
    let emrAttr: PersonAttributeType[] = await CM.query(sql2, emrConnection);

    console.log("chomune", emrAttr);
    if (emrAttr.length > 0) {
      return emrAttr[0].person_attribute_type_id;
    } else {
      let replaceColumns = {
        creator: 1,
        changed_by: 1,
        voided_by: 1,
        visit_id: 1,
      };
      let attrID = await CM.query(
        toVisitAttributeInsertStatement(results[0], replaceColumns),
        emrConnection
      );
      console.log("MEEEEE", attrID);
      return attrID.insertId;
    }
  }
}
export function toVisitAttributeInsertStatement(
  personAttribute: PersonAttributeType,
  replaceColumns?: any
) {
  return toInsertSql(
    personAttribute,
    ["person_attribute_id", "person_attribute_type_id"],
    "person_attribute_type",
    replaceColumns
  );
}
export async function LoadEMRenrolmentEncounter(
  personId: any,
  emrcon: Connection
) {
  const sql = `select * from encounter where patient_id= ${personId} and encounter_type=7 and voided=0`;
  let results: Encounter = await CM.query(sql, emrcon);
  return results;
}
export async function UpdateEnrollmentDate(
  personId: any,
  enrollment_date: string,
  emrcon: Connection
) {
  const sql = `update encounter set encounter_datetime=DATE("${enrollment_date}") where patient_id= ${personId} and encounter_type=7 and voided=0`;
  let results: Encounter = await CM.query(sql, emrcon);
  console.log(sql, results);
  return results;
}
