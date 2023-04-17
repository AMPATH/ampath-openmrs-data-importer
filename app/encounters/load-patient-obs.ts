import ConnectionManager from "../connection-manager";
import { Connection } from "mysql";
import { Encounter, Obs } from "../tables.types";
import moment from "moment";

const CM = ConnectionManager.getInstance();

export async function loadEnrolementPatientObs(
  personId: number,
  connection: Connection
) {
  const sql = `SELECT o.* FROM obs o JOIN encounter e ON e.encounter_id = o.encounter_id WHERE o.person_id = ${personId} AND o.voided = 0 AND e.encounter_type IN (1 , 32, 3, 73, 105) ORDER BY o.obs_group_id ASC`;
  let results: Obs[] = await CM.query(sql, connection);
  return results;
}
export default async function loadPatientObs(
  personId: number,
  connection: Connection
) {
  const sql = `select * from obs where person_id = ${personId} order by obs_group_id asc`;
  let results: Obs[] = await CM.query(sql, connection);
  return results;
}
export async function loadPatientARVPlan(
  encounterId: number,
  connection: Connection
) {
  const sql = `select * from obs where encounter_id = ${encounterId} and (concept_id=1255 or concept_id=1088 or concept_id=6744 or concept_id=1252 or concept_id=1499 or concept_id=1677 or concept_id=1193 or concept_id=1256) and voided=0`;
  let results: Obs[] = await CM.query(sql, connection);
  // results.forEach((params:Obs)=> {

  // })
  return results;
}
export async function checkConceptDrugsaved(
  ObDate: Date,
  person_id: number,
  connection: Connection
) {
  const sql = `select * from obs where person_id=${person_id} and date_created = STR_TO_DATE('${ObDate}','yyyy-dd-mm hh:mm:ss') and (concept_id=1088 or concept_id=1255)`;
  let results: Obs[] = await CM.query(sql, connection);
  return results;
}
export async function fetchEncounterVisitFromObs(
  obsId: number,
  connection: Connection
) {
  const sql = `select * from encounter where encounter_id = ${obsId}`;
  let results: Encounter[] = await CM.query(sql, connection);
  return results[0];
}
export async function insertMissingConcepts(
  obsId: number,
  conceptType: string,
  connection: Connection
) {
  const sql = `replace into missing_concepts set concept_id = ${obsId}, type="${conceptType}"`;
  let results: any = await CM.query(sql, connection);
  return results[0];
}
export async function fetchRegimenEncountersObs(
  patient: any,
  connection: Connection
) {
  const sql = `select * from obs where person_id="${patient}" and concept_id=1255 group by value_coded`;
  let results: Obs[] = await CM.query(sql, connection);
  return results;
}
export async function cleanRegimenEncountersObs(
  patient: any,
  connection: Connection
) {
  const sql = `delete from obs where person_id="${patient}" and concept_id=1255`;
  let results: Obs[] = await CM.query(sql, connection);
  return results;
}
export async function getPreviousRegimenEncounter(
  params: number,
  date: any,
  connection: Connection
) {
  const sql = `select encounter_id,encounter_datetime from encounter where patient_id="${params}" and encounter_type=29 and encounter_datetime < "${date}" order by encounter_datetime asc limit 1`;
  let results: Encounter[] = await CM.query(sql, connection);
  console.log("oold enc", sql);
  return results[0];
}
export async function LoadCurrentHivSummary(
  patientId: any,
  connection: Connection
) {
  const sql = `SELECT * FROM etl.flat_hiv_summary_v15b a WHERE a.person_id = ${patientId} AND a.encounter_type IN (1,2,4,3,105,106) and a.prev_arv_meds != a.cur_arv_meds and a.prev_arv_start_date is not null ORDER BY a.visit_num DESC limit 1;`;
  let results: any = await CM.query(sql, connection);
  console.log("Hiv summary", results);
  return results[0];
}
export async function LoadSingleHivSummary(
  patientId: any,
  connection: Connection
) {
  const sql = `SELECT * FROM etl.flat_hiv_summary_v15b a WHERE a.person_id = ${patientId} AND a.encounter_type IN (1,2,4,3,105,106) and a.enrollment_date is not null ORDER BY a.visit_num DESC limit 1;`;
  let results: any = await CM.query(sql, connection);
  //console.log("Single Hiv summary", results);
  return results[0];
}
