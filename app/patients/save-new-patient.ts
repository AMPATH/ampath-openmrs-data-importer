import { Connection } from "mysql";
import { Person, Patient, Address, PersonName } from "../tables.types";
import { PatientData } from "./patient-data";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";

const CM = ConnectionManager.getInstance();

export default async function savePatientData(
  patient: PatientData,
  connection: Connection
) {
  await UserMapper.instance.initialize();
  return savePerson(patient, connection, UserMapper.instance.userMap);
}

export async function savePerson(
  patient: PatientData,
  connection: Connection,
  userMap?: any
) {
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      creator: userMap[patient.person.creator],
      changed_by: userMap[patient.person.changed_by],
      voided_by: userMap[patient.person.voided_by],
    };
  }
  await CM.query(
    toPersonInsertStatement(patient.person, replaceColumns),
    connection
  );
}

export function toPersonInsertStatement(person: Person, replaceColumns?: any) {
  return toInsertSql(person, ["person_id"], "person", replaceColumns);
}

export async function savePatient(
  patient: PatientData,
  personId: number,
  connection: Connection
) {
  // console.log("user person id", personId);
  const userMap = UserMapper.instance.userMap;
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      creator: userMap[patient.person.creator],
      changed_by: userMap[patient.person.changed_by],
      voided_by: userMap[patient.person.voided_by],
      patient_id: personId,
    };
  }
  await CM.query(
    toPatientInsertStatement(patient.patient, replaceColumns),
    connection
  );
}

export function toPatientInsertStatement(
  patient: Patient,
  replaceColumns?: any
) {
  return toInsertSql(patient, [""], "patient", replaceColumns);
}
export async function savePersonAddress(
  patient: PatientData,
  insertMap: InsertedMap,
  connection: Connection
) {
  let replaceColumns = {};
  const userMap = UserMapper.instance.userMap;
  if (userMap) {
    replaceColumns = {
      creator: userMap[patient.address.creator],
      changed_by: userMap[patient.address.changed_by],
      voided_by: userMap[patient.address.voided_by],
      person_id: insertMap.patient,
      address1: patient.address.county_district, //County
      address3: patient.address.address2, //Landmark
      address8: patient.address.address6, //Location,
      address9: patient.address.address5, //Sub Location,
    };
  }
  await CM.query(
    toPersonAddressInsertStatement(patient.address, replaceColumns),
    connection
  );
}

export function toPersonAddressInsertStatement(
  personAddress: Address,
  replaceColumns?: any
) {
  return toInsertSql(
    personAddress,
    ["person_address_id"],
    "person_address",
    replaceColumns
  );
}
export async function savePersonName(
  patient: PatientData,
  insertMap: InsertedMap,
  connection: Connection
) {
  const userMap = UserMapper.instance.userMap;
  let replaceColumns = {};
  if (userMap) {
    for (const name of patient.names) {
      replaceColumns = {
        creator: userMap[name.creator],
        changed_by: userMap[name.changed_by],
        voided_by: userMap[name.voided_by],
        person_id: insertMap.patient,
      };
      await CM.query(
        toPersonNameInsertStatement(name, replaceColumns),
        connection
      );
    }
  }
}

export function toPersonNameInsertStatement(
  personName: PersonName,
  replaceColumns?: any
) {
  return toInsertSql(
    personName,
    ["person_name_id"],
    "person_name",
    replaceColumns
  );
}
