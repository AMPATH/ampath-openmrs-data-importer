import { Connection } from "mysql";
import {
  Person,
  Patient,
  Address,
  PersonName,
  PatientContact,
  Relationship,
} from "../tables.types";
import { PatientData } from "./patient-data";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";
import { fetchPerson, loadPatientDataByUuid } from "./load-patient-data";

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
  let savedPerson = await loadPatientDataByUuid(
    patient.person.uuid,
    connection
  );
  if (savedPerson.person) {
    return savedPerson;
  }
  if (userMap) {
    replaceColumns = {
      creator: userMap[patient.person.creator],
      changed_by: patient.person.changed_by
        ? userMap[patient.person.changed_by]
        : null,
      voided_by: patient.person.changed_by
        ? userMap[patient.person.voided_by]
        : null,
    };
  }
  //await CM.query("SET FOREIGN_KEY_CHECKS = 0", connection);
  return await CM.query(
    toPersonInsertStatement(patient.person, replaceColumns),
    connection
  );
}

export function toPersonInsertStatement(person: Person, replaceColumns?: any) {
  return toInsertSql(
    person,
    ["person_id", "cause_of_death_non_coded"],
    "person",
    replaceColumns
  );
}

export async function savePatient(
  patient: PatientData,
  personId: number,
  connection: Connection
) {
  const userMap = UserMapper.instance.userMap;
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      patient_id: personId,
      creator: userMap[patient.address.creator],
      changed_by: patient.address.changed_by
        ? userMap[patient.address.changed_by]
        : null,
      voided_by: patient.address.voided_by
        ? userMap[patient.address.voided_by]
        : null,
    };
  }
  await CM.query(
    toPatientInsertStatement(patient.patient, replaceColumns),
    connection
  );
}
export async function savePatientContacts(
  patient: PatientData,
  destinationConnection: Connection,
  insertMap: InsertedMap,
  sourceConnection: Connection
) {
  const userMap = UserMapper.instance.userMap;
  let replaceColumns = {};
  if (userMap) {
    for (const p of patient.patientContact) {
      let related_patient_id = "";
      let a = null;
      if (p.patient_id && p.patient_id > 0) {
        let relatedPerson = await fetchPerson(p.patient_id, sourceConnection);
        let persona = await loadPatientDataByUuid(
          relatedPerson.uuid,
          sourceConnection
        );
        a = await savePatientData(persona, destinationConnection);
        related_patient_id = a.insertId;
      }
      replaceColumns = {
        patient_id: related_patient_id ? related_patient_id : a.person_id,
        patient_related_to: insertMap.patient,
        changed_by: p.changed_by ? userMap[p.changed_by] : null,
        voided_by: p.voided_by ? userMap[p.voided_by] : null,
      };
      await CM.query(
        toPatientContactInsertStatement(p, replaceColumns),
        destinationConnection
      );
    }
  }
}
export async function savePersonRelationship(
  patient: PatientData,
  destinationConnection: Connection,
  insertMap: InsertedMap,
  sourceConnection: Connection
) {
  const userMap = UserMapper.instance.userMap;
  let replaceColumns = {};
  if (userMap) {
    for (const r of patient.relationship) {
      let related_patient_id = "";
      let a = null;

      let relatedPerson = await fetchPerson(r.person_b, sourceConnection);
      let persona = await loadPatientDataByUuid(
        relatedPerson.uuid,
        sourceConnection
      );
      a = await savePatientData(persona, destinationConnection);
      related_patient_id = a.insertId;

      replaceColumns = {
        patient_id: related_patient_id ? related_patient_id : a.person_id,
        patient_related_to: insertMap.patient,
        changed_by: r.changed_by ? userMap[r.changed_by] : null,
        voided_by: r.voided_by ? userMap[r.voided_by] : null,
      };
      await CM.query(
        toPatientPersonInsertStatement(r, replaceColumns),
        destinationConnection
      );
    }
  }
}
export function toPatientInsertStatement(
  patient: Patient,
  replaceColumns?: any
) {
  return toInsertSql(patient, ["allergy_status"], "patient", replaceColumns);
}
export function toPatientContactInsertStatement(
  patient: PatientContact,
  replaceColumns?: any
) {
  return toInsertSql(
    patient,
    [],
    "kenyaemr_hiv_testing_patient_contact",
    replaceColumns
  );
}
export function toPatientPersonInsertStatement(
  patient: Relationship,
  replaceColumns?: any
) {
  return toInsertSql(patient, [], "relationship", replaceColumns);
}
export async function savePersonAddress(
  patient: PatientData,
  insertMap: InsertedMap,
  connection: Connection,
  updateStatement = false
) {
  let replaceColumns = {};
  const userMap = UserMapper.instance.userMap;

  if (userMap && patient.address) {
    replaceColumns = {
      creator: userMap[patient.address.creator]
        ? userMap[patient.address.creator]
        : 2,
      changed_by: userMap[patient.address.changed_by]
        ? userMap[patient.address.changed_by]
        : 2,
      voided_by: patient.address.voided_by
        ? userMap[patient.address.voided_by]
        : 2,
      person_id: insertMap.patient,
    };

    await CM.query(
      toPersonAddressInsertStatement(patient.address, replaceColumns),
      connection
    );
  }
}

export function toPersonAddressInsertStatement(
  personAddress: Address,
  replaceColumns?: any
) {
  return toInsertSql(
    personAddress,
    [
      "person_address_id",
      "address7",
      "address8",
      "address9",
      "address10",
      "address11",
      "address12",
      "address13",
      "address14",
      "address15",
    ],
    "person_address",
    replaceColumns
  );
}

export function toPersonAddressUpdateStatement(
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
        person_id: insertMap.patient,
        creator: userMap[name.creator],
        changed_by: name.changed_by ? userMap[name.changed_by] : null,
        voided_by: name.voided_by ? userMap[name.voided_by] : null,
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
