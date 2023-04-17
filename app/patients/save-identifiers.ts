import { Connection } from "mysql";
import { PatientProgram, PatientIdentifier } from "../tables.types";
import { PatientData } from "./patient-data";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";
import transferLocationToEmr from "../location/location";

const CM = ConnectionManager.getInstance();

export const KenyaEMR_CCC_ID = 6; // TODO map to the right identifier types
export const AMR_CCC_ID = 1;
export const AMR_HEI_ID = 38;
export const AMR_PREP_ID = 44;
export const EMR_HEI_ID = 7;
export const KenyaEMR_National_ID = 8;
export const AMRS_National_ID = 5;
export const KenyaEMR_ID = 5;
export const AMRS_Universal_ID = 8;
export const OLD_AMRS_Universal_ID = 1;
export const AMRS_Universal_ID_NEW = 3;
//export const AMR_KenyaEMR_ID = 1;
export const AMR_KenyaEMR_ID = 3;
export const AMRS_CCC_ID = 28;

export async function savePatientIdentifiers(
  identifiersToSave: PatientIdentifier[],
  patient: PatientData,
  insertMap: InsertedMap,
  connection: Connection
) {
  const a = await handleAmrsIdentifiers(identifiersToSave);
  await saveKnownIdentifiers(identifiersToSave, insertMap, connection);
}

export async function saveKnownIdentifiers(
  identifiers: PatientIdentifier[],
  insertMap: InsertedMap,
  connection: Connection
) {
  for (const p of identifiers) {
    await saveIdentifier(p, insertMap, connection);
  }
}

function handleAmrsIdentifiers(identifiers: PatientIdentifier[]) {
  let formattedKenyaEMRIdentifiers: any[] = [];
  for (const p of identifiers) {
    let newId: PatientIdentifier = Object.assign({}, p);
    switch (p.identifier_type) {
      case AMRS_CCC_ID:
        handleCccId(newId);
        break;
      case AMRS_National_ID:
        handleNationalId(newId);
        break;
      // TODO add emr id as part of the transferred identifiers
      case AMRS_Universal_ID:
        handleKenyaEmrId(newId);
        break;
      case OLD_AMRS_Universal_ID:
        handleKenyaEmrId(newId);
        break;
      case AMRS_Universal_ID_NEW:
        handleOLDKenyaEmrId(newId);
        break;
      case AMR_HEI_ID:
        handleHEIId(newId);
        break;
      case AMR_PREP_ID:
        handlePrepId(newId);
        break;
      default:
        continue;
    }
    formattedKenyaEMRIdentifiers.push(newId);
  }
  console.log("my identifiers", formattedKenyaEMRIdentifiers);
  return formattedKenyaEMRIdentifiers;
}

export function handleCccId(identifier: PatientIdentifier) {
  identifier.identifier_type = KenyaEMR_CCC_ID;
  identifier.identifier = toemrCccId(identifier.identifier);
}

export function toAmrsCccId(identifier: string): string {
  return identifier.slice(0, 5) + "-" + identifier.slice(identifier.length - 5);
}
export function toemrCccId(identifier: string): string {
  return identifier.replace("-", "");
}

export function handleNationalId(identifier: PatientIdentifier) {
  identifier.identifier_type = KenyaEMR_National_ID;
}

export function handleKenyaEmrId(identifier: PatientIdentifier) {
  identifier.identifier_type = AMR_KenyaEMR_ID;
}
export function handleOLDKenyaEmrId(identifier: PatientIdentifier) {
  identifier.identifier_type = 1;
}
export function handleHEIId(identifier: PatientIdentifier) {
  identifier.identifier_type = 7;
}
export function handlePrepId(identifier: PatientIdentifier) {
  identifier.identifier_type = 16;
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
export function getIdentifiers(identifiers: Array<any>): Array<string> {
  let identifierList: Array<string> = [];
  identifiers.forEach((identifier) => {
    identifierList.push(identifier?.identifier);
  });
  return identifierList;
}
