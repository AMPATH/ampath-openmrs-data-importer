import { Connection } from "mysql";
import { Person, Patient, PatientProgram } from "../tables.types";
import { PatientData } from "./patient-data";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";

const CM = ConnectionManager.getInstance();

export const KenyaEMR_HIV_Program = 2;
export const AMR_HIV_Program = 1;

export async function saveProgramEnrolments(
  enrollmentsToInsert: PatientProgram[],
  patient: PatientData,
  insertMap: InsertedMap,
  connection: Connection
) {
  await saveHivEnrolments(enrollmentsToInsert, insertMap, connection);
}

export async function saveHivEnrolments(
  enrollmentsToInsert: PatientProgram[],
  insertMap: InsertedMap,
  connection: Connection
) {
  for (const p of enrollmentsToInsert) {
    if (p.program_id === KenyaEMR_HIV_Program) {
      await saveProgramEnrolment(p, AMR_HIV_Program, insertMap, connection);
    }
  }
}

export async function saveProgramEnrolment(
  enrolment: PatientProgram,
  programId: number,
  insertMap: InsertedMap,
  connection: Connection
) {
  // console.log("user person id", personId);
  const userMap = UserMapper.instance.userMap;
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      creator: userMap[enrolment.creator],
      changed_by: userMap[enrolment.changed_by],
      voided_by: userMap[enrolment.voided_by],
      location_id: 1, //TODO replace with actual location
      patient_id: insertMap.patient,
      program_id: programId,
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
