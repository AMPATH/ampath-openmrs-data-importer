import { Connection } from "mysql";
import { Person, Patient, PatientProgram, Encounter } from "../tables.types";
import { PatientData } from "./patient-data";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";
import transferLocationToEmr from "../location/location";
import { uuidv4 } from "../encounters/save-obs";
import moment from "moment";
import { toEncounterInsertStatement } from "../encounters/amrs-emr-encounter-map";
import { loadEnrolementPatientObs } from "../encounters/load-patient-obs";

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
  connection: Connection
) {
  await saveHivEnrolments(enrollmentsToInsert, insertMap, connection);
}

export async function saveHivEnrolments(
  enrollmentsToInsert: PatientProgram[],
  insertMap: InsertedMap,
  connection: Connection
) {
  // create enrolment encounter
  //   encounterObs.encounterTypeUuid =
  //     "de78a6be-bfc5-4634-adc3-5f1a280455cc";
  //   encounterObs.encounterTypId = "7";
  //   encounterObs.formId = "8";

  //TODO Retrieve initial encounter from POC to get the right enrolment date.

  let enrollmentEncounter: Encounter = {
    encounter_datetime:
      enrollmentsToInsert[enrollmentsToInsert.length - 1].date_enrolled,
    creator: 1,
    changed_by: 1,
    voided_by: 1,
    encounter_type: 7,
    form_id: 8,
    location_id: 1604,
    patient_id: insertMap.patient,
    visit_id: null,
    uuid: uuidv4(),
    encounter_id: 0,
    date_created:
      enrollmentsToInsert[enrollmentsToInsert.length - 1].date_created,
    voided: 0,
    void_reason: "",
    date_changed: undefined,
  };
  let savedEncounter = await CM.query(
    toEncounterInsertStatement(enrollmentEncounter, {}),
    connection
  );
  let entryPoint = toInsertSql(
    {
      person_id: insertMap.patient,
      concept_id: 159936,
      encounter_id: savedEncounter.insertId,
      order_id: 0,
      obs_datetime:
        enrollmentsToInsert[enrollmentsToInsert.length - 1].date_created,
      location_id: 1604,
      accession_number: "",
      value_group_id: 0,
      value_boolean: 0,
      value_coded: 160542,
      value_coded_name_id: 0,
      value_drug: undefined,
      value_datetime: null,
      value_numeric: null,
      value_modifier: "",
      value_text: "",
      value_complex: "",
      comments: "",
      creator: 1,
      date_created:
        enrollmentsToInsert[enrollmentsToInsert.length - 1].date_created,
      voided: 0,
      voided_by: null,
      void_reason: "",
      uuid: uuidv4(),
      form_namespace_and_path: 0,
      previous_version: "",
      status: "",
      interpretation: 0,
      obs_id: 0,
      amrs_obs_id: 0,
    },
    [
      "amrs_obs_id",
      "value_boolean",
      "status",
      "interpretation",
      "obs_id",
      "order_id",
      "obs_group_id",
      "previous_version",
      "value_coded_name_id",
    ],
    "obs",
    {}
  );
  await CM.query(entryPoint, connection);
  let patientType = toInsertSql(
    {
      person_id: insertMap.patient,
      concept_id: 164932,
      encounter_id: savedEncounter.insertId,
      order_id: 0,
      obs_datetime:
        enrollmentsToInsert[enrollmentsToInsert.length - 1].date_created,
      location_id: 1604,
      accession_number: "",
      value_group_id: 0,
      value_boolean: 0,
      value_coded: 5622,
      value_coded_name_id: 0,
      value_drug: undefined,
      value_datetime: null,
      value_numeric: null,
      value_modifier: "",
      value_text: "",
      value_complex: "",
      comments: "",
      creator: 1,
      date_created:
        enrollmentsToInsert[enrollmentsToInsert.length - 1].date_created,
      voided: 0,
      voided_by: null,
      void_reason: "",
      uuid: uuidv4(),
      form_namespace_and_path: 0,
      previous_version: "",
      status: "",
      interpretation: 0,
      obs_id: 0,
      amrs_obs_id: 0,
    },
    [
      "amrs_obs_id",
      "value_boolean",
      "status",
      "interpretation",
      "obs_id",
      "order_id",
      "obs_group_id",
      "previous_version",
      "value_coded_name_id",
    ],
    "obs",
    {}
  );
  await CM.query(patientType, connection);
  for (const p of enrollmentsToInsert) {
    //TODO: Determine if we should create other AMRS programs a patient was enrolled in on EMR
    if (
      p.program_id === AMR_HIV_Program ||
      p.program_id === AMR_VIREMIA_Program ||
      p.program_id === AMR_DC_Program
    ) {
      await saveProgramEnrolment(
        p,
        KenyaEMR_HIV_Program,
        insertMap,
        connection
      );
    } else if (p.program_id === AMR_PMTCT_Program) {
      await saveProgramEnrolment(
        p,
        KenyaEMR_MCH_Program,
        insertMap,
        connection
      );
    } else if (p.program_id === AMR_HEI_Program) {
      await saveProgramEnrolment(
        p,
        KenyaEMR_HEI_MCH_Program,
        insertMap,
        connection
      );
    } else if (p.program_id === AMR_OVC_Program) {
      await saveProgramEnrolment(p, EMR_OVC_Program, insertMap, connection);
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
      location_id: await transferLocationToEmr(enrolment.location_id), //TODO replace with actual location
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
