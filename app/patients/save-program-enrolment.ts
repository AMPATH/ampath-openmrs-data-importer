import { Connection } from "mysql";
import { Person, PatientProgram } from "../tables.types";
import { PatientData } from "./patient-data";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";

import moment from "moment";
import { LoadSingleHivSummary } from "../encounters/load-patient-obs";
import {
  fetchPerson,
  fetchPersonIdByUuid,
  UpdateEnrollmentDate,
} from "./load-patient-data";
import ConceptMapper from "../concept-map";

const CM = ConnectionManager.getInstance();

export const KenyaEMR_HIV_Program = 1;
export const KenyaEMR_MCH_Program = 3;
export const KenyaEMR_HEI_MCH_Program = 2;
export const AMR_HIV_Program = 1;
export const AMR_OVC_Program = 2;
export const EMR_OVC_Program = 7;
export const AMR_PMTCT_Program = 4;
export const AMR_DC_Program = 9;
export const AMR_HEI_Program = 29;
export const AMR_VIREMIA_Program = 27;

export async function saveProgramEnrolments(
  enrollmentsToInsert: PatientProgram[],
  patient: PatientData,
  insertMap: InsertedMap,
  connection: Connection,
  locationId: any
) {
  await saveHivEnrolments(
    enrollmentsToInsert,
    insertMap,
    connection,
    locationId
  );
}

export async function saveHivEnrolments(
  enrollmentsToInsert: PatientProgram[],
  insertMap: InsertedMap,
  connection: Connection,
  locationId: any
) {
  // create enrolment encounter
  //   encounterObs.encounterTypeUuid =
  //     "de78a6be-bfc5-4634-adc3-5f1a280455cc";
  //   encounterObs.encounterTypId = "7";
  //   encounterObs.formId = "8";

  //TODO Retrieve initial encounter from POC to get the right enrolment date.

  for (const p of enrollmentsToInsert) {
    //TODO: Determine if we should create other AMRS programs a patient was enrolled in on EMR
    await saveProgramEnrolment(
      p,
      EMR_OVC_Program,
      insertMap,
      connection,
      locationId
    );
  }
}

export async function saveProgramEnrolment(
  enrolment: PatientProgram,
  programId: number,
  insertMap: InsertedMap,
  connection: Connection,
  locationId: any
) {
  // console.log("user person id", personId);
  const userMap = UserMapper.instance.userMap;
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      //TODO replace with actual location
      patient_id: insertMap.patient,
      location_id: locationId,
      creator: 2,
    };
  }
  const results = await CM.query(
    toEnrolmentInsertStatement(enrolment, replaceColumns),
    connection
  );
  insertMap.patientPrograms[enrolment.patient_program_id] = results.insertId;
}

export function toEnrolmentInsertStatement(
  enrolment: PatientProgram,
  replaceColumns?: any
) {
  return toInsertSql(
    enrolment,
    ["patient_program_id"],
    "patient_program",
    replaceColumns
  );
}
