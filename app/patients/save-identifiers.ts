import { Connection } from "mysql";
import { PatientProgram, PatientIdentifier } from "../tables.types";
import { PatientData } from "./patient-data";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";

const CM = ConnectionManager.getInstance();

export const KenyaEMR_CCC_ID = 3; // TODO map to the right identifier types
export const AMR_CCC_ID = 1;
export const KenyaEMR_National_ID = 8;
export const AMR_National_ID = 1;
export const KenyaEMR_ID = 2;
export const AMR_KenyaEMR_ID = 4;

export async function savePatientIdentifiers(
  identifiersToSave: PatientIdentifier[],
  patient: PatientData,
  insertMap: InsertedMap,
  connection: Connection
) {
  await saveKnownIdentifiers(identifiersToSave, insertMap, connection);
}

export async function saveKnownIdentifiers(
  identifiers: PatientIdentifier[],
  insertMap: InsertedMap,
  connection: Connection
) {
  for (const p of identifiers) {
    let newId: PatientIdentifier = Object.assign({}, p);
    switch (p.identifier_type) {
      case KenyaEMR_CCC_ID:
        handleCccId(newId);
        break;

      case KenyaEMR_National_ID:
        handleNationalId(newId);
        break;

      case KenyaEMR_ID:
        handleKenyaEmrId(newId);
        break;
      default:
        continue;
    }

    await saveIdentifier(newId, insertMap, connection);
  }
}

export function handleCccId(identifier: PatientIdentifier) {
  identifier.identifier_type = AMR_CCC_ID;
  identifier.identifier = toAmrsCccId(identifier.identifier);
}

export function toAmrsCccId(identifier: string): string {
  return identifier.slice(0, 5) + "-" + identifier.slice(identifier.length - 5);
}

export function handleNationalId(identifier: PatientIdentifier) {
  identifier.identifier_type = AMR_National_ID;
}

export function handleKenyaEmrId(identifier: PatientIdentifier) {
  identifier.identifier_type = AMR_KenyaEMR_ID;
}

export async function saveIdentifier(
  identifier: PatientIdentifier,
  insertMap: InsertedMap,
  connection: Connection
) {
  // console.log("user person id", personId);
  const userMap = UserMapper.instance.userMap;
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      creator: userMap[identifier.creator],
      changed_by: userMap[identifier.changed_by],
      voided_by: userMap[identifier.voided_by],
      location_id: 1, //TODO replace with actual location
      patient_id: insertMap.patient,
    };
  }
  const results = await CM.query(
    toIdentifierInsertStatement(identifier, replaceColumns),
    connection
  );
  // console.log('insert results', results);
  insertMap.patientIdentifier[identifier.patient_identifier_id] =
    results.insertId;
}

export function toIdentifierInsertStatement(
  identifier: PatientIdentifier,
  replaceColumns?: any
) {
  return toInsertSql(
    identifier,
    ["patient_identifier_id"],
    "patient_identifier",
    replaceColumns
  );
}
