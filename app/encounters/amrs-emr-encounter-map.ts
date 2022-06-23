import { Connection } from "mysql";
import ConceptMapper from "../concept-map";
import transferDrugToEmr from "../drugs/drugs";
import { InsertedMap } from "../inserted-map";
import mysql from "mysql";
import { Encounter, Obs, PatientProgram } from "../tables.types";
import userMap from "../users/user-map";
import loadPatientObs, {
  checkConceptDrugsaved,
  cleanRegimenEncountersObs,
  fetchEncounterVisitFromObs,
  fetchRegimenEncountersObs,
  getPreviousRegimenEncounter,
  insertMissingConcepts,
  LoadCurrentHivSummary,
  loadEnrolementPatientObs,
  loadPatientARVPlan,
  LoadSingleHivSummary,
} from "./load-patient-obs";
import ConnectionManager from "../connection-manager";
import savePatientObs from "./save-obs";
import transferLocationToEmr from "../location/location";
import UserMapper from "../users/user-map";
import { saveEncounter } from "./save-encounters";
import { getEncounterUUIDByID } from "./load-orders";
import moment from "moment";
import {
  saveProgramEnrolment,
  toEnrolmentInsertStatement,
} from "../patients/save-program-enrolment";
import { fetchPatientPrograms } from "../patients/load-patient-data";
const CM = ConnectionManager.getInstance();
export default class EncounterObsMapper {
  public constructor() {}

  async retrieveobs(
    patientId: number,
    connection: Connection,
    emrConn: Connection,
    insertMap: InsertedMap,
    encounterType: number
  ) {
    await ConceptMapper.instance.initialize();
    let obss: Obs[] = [];
    if (encounterType == 1) {
      console.log("Processing Enrollment Obs");
      obss = await loadEnrolementPatientObs(patientId, connection);
    } else {
      console.log("Processing other Obs");
      obss = await loadPatientObs(patientId, connection);
    }

    let mappedObs: any = [];
    for (let i = 0; i < obss.length; i++) {
      const element = obss[i];
      await ConceptMapper.instance.initialize();
      let mapper = await this.mapencounter(
        element,
        ConceptMapper.instance,
        connection,
        emrConn,
        insertMap
      );
      if (mapper?.encounterTypeUuid && mapper.obs?.value_coded !== NaN) {
        mappedObs.push(mapper);
      }
    }
    const groups = mappedObs.reduce(
      (
        groups: { [x: string]: any },
        item: { obs: { encounter_id: string | number } }
      ) => ({
        ...groups,
        [item.obs.encounter_id]: [
          ...(groups[item.obs.encounter_id] || []),
          item,
        ],
      }),
      {}
    );
    return groups;
  }
  async mapencounter(
    ob: Obs,
    d: ConceptMapper,
    con: Connection,
    emrConn: Connection,
    insertmap: InsertedMap
  ) {
    // prepare dictionaries
    let encounterObs: EncounterObs = {};
    // map amrs to kenya emr

    let mappedEmrConcept: any = d.amrsConceptMap[ob.concept_id];
    //fetch visit for ob
    let encounter = await fetchEncounterVisitFromObs(ob.encounter_id, con);

    if (
      mappedEmrConcept &&
      mappedEmrConcept.length > 0 &&
      mappedEmrConcept[0] !== "" &&
      mappedEmrConcept[0] !== "-"
    ) {
      let map = d.conceptMap[parseInt(mappedEmrConcept[0], 0)];
      if (map) {
        if (ob.encounter_id === null) {
          ob.encounter_id = 0;
          encounterObs.obs = ob;
          encounterObs.encounterTypeUuid = "unknown";
          return encounterObs;
        }
        encounterObs.encounterTypeUuid = map[1];
        encounterObs.encounterTypId = map[3];
        encounterObs.formId = map[2];
        encounterObs.visitId = encounter.visit_id;
        encounterObs.locationId = encounter.location_id;
        ob.concept_id = mappedEmrConcept[0];
        //Enrollment  encounter types
        let enrollment: number[] = [1, 32, 3, 73, 105];
        let initial: number[] = [1, 32, 3, 73, 105];
        // if (enrollment.includes(encounter.encounter_type)) {
        //   encounterObs.encounterTypeUuid =
        //     "de78a6be-bfc5-4634-adc3-5f1a280455cc";
        //   encounterObs.encounterTypId = "7";
        //   encounterObs.formId = "8";
        // }
        if (ob.value_coded > 0) {
          let a: any = d.amrsConceptMap[ob.value_coded];

          if (a && a.length > 0) {
            if (a[0] > 0) {
              ob.value_coded = a[0];
            } else {
              ob.value_coded = ob.value_coded;
            }
          }
        }
        //If started on ART Create enrollment encounter
        encounterObs.obs = ob;
      }
      return encounterObs;
    }
  }
  async insertMissingConcepts(
    ob: number,
    conceptType: string,
    con: Connection
  ) {
    //(ob, conceptType, con);
  }
}
export async function exportDrugs(
  amrsPatientId: any,
  etlCon: Connection,
  emrPatientId: any,
  emrCon: Connection,
  insertmap: InsertedMap
) {
  let latestSummaries: any = await LoadCurrentHivSummary(amrsPatientId, etlCon);
  if (latestSummaries?.enrollment_date == null) {
    latestSummaries = await LoadSingleHivSummary(amrsPatientId, etlCon);
    console.log("here", latestSummaries);
  }
  if (!latestSummaries?.enrollment_date) {
    return;
  }
  let initialRegimenEnc: any = {};
  if (latestSummaries && latestSummaries.arv_first_regimen === "unknown") {
    //save current regimen only
    let initialRegimenEncPayload: Encounter = {
      encounter_datetime: latestSummaries.encounter_datetime,
      creator: 1,
      changed_by: 1,
      voided_by: 1,
      encounter_type: 29,
      form_id: 49,
      location_id: 1604,
      patient_id: emrPatientId,
      visit_id: null,
      uuid: uuidv4(),
      encounter_id: 0,
      date_created: latestSummaries.date_created,
      voided: 0,
      void_reason: "",
      date_changed: undefined,
    };

    let initialRegimenEnc = await createDrugRegimenEncounter(
      {},
      initialRegimenEncPayload,
      emrCon
    );
    console.log(initialRegimenEnc.insertId);
    let initialObs = await generateDrugObs(
      latestSummaries.cur_arv_meds,
      1256,
      latestSummaries.prev_arv_line,
      latestSummaries.date_created,
      latestSummaries.insertId,
      1604,
      "",
      "",
      emrPatientId,
      emrCon
    );

    await savePatientObs(
      initialObs,
      insertmap,
      emrCon,
      initialRegimenEnc.insertId
    );
  }
  //Create initial regimen payload
  console.log(latestSummaries);
  const userMap = UserMapper.instance.userMap;
  let initialDrugRegimenEncounter: Encounter = {
    encounter_datetime: latestSummaries.enrollment_date,
    creator: 1,
    changed_by: 1,
    voided_by: 1,
    encounter_type: 29,
    form_id: 49,
    location_id: 1604,
    patient_id: emrPatientId,
    visit_id: null,
    uuid: uuidv4(),
    encounter_id: 0,
    date_created: latestSummaries.date_created,
    voided: 0,
    void_reason: "",
    date_changed: undefined,
  };
  // console.log(initialDrugRegimenEncounter)
  if (
    latestSummaries &&
    latestSummaries.arv_first_regimen &&
    latestSummaries.arv_first_regimen !== "unknown"
  ) {
    initialRegimenEnc = await createDrugRegimenEncounter(
      {},
      initialDrugRegimenEncounter,
      emrCon
    );
    console.log(
      "initial, regimen encounter",
      initialRegimenEnc.insertId,
      latestSummaries.arv_first_regimen
    );
    let initialObs = await generateDrugObs(
      latestSummaries.arv_first_regimen,
      1256,
      latestSummaries.cur_arv_line
        ? latestSummaries.cur_arv_line
        : latestSummaries.cur_arv_line_reported,
      latestSummaries.date_created,
      initialRegimenEnc.insertId,
      1604,
      "",
      "",
      emrPatientId,
      emrCon
    );

    await savePatientObs(
      initialObs,
      insertmap,
      emrCon,
      initialRegimenEnc.insertId
    );
  }
  //Createe previous arv regimen payload
  if (
    latestSummaries &&
    latestSummaries.prev_arv_meds &&
    latestSummaries.prev_arv_meds !== latestSummaries.cur_arv_meds
  ) {
    let prevArvEncounter: Encounter = {
      encounter_datetime:
        latestSummaries?.prev_arv_start_date !== null
          ? latestSummaries.prev_arv_start_date
          : latestSummaries.arv_start_date,
      creator: 1,
      changed_by: 1,
      voided_by: 1,
      encounter_type: 29,
      form_id: 49,
      location_id: 1604,
      patient_id: emrPatientId,
      visit_id: null,
      uuid: uuidv4(),
      encounter_id: 0,
      date_created: latestSummaries.date_created,
      voided: 0,
      date_voided: undefined,
      void_reason: "",
      date_changed: undefined,
    };
    let prevRegimenEnc = await createDrugRegimenEncounter(
      {},
      prevArvEncounter,
      emrCon
    );

    let prevObs = await generateDrugObs(
      latestSummaries.prev_arv_meds
        ? latestSummaries.prev_arv_meds
        : latestSummaries.cur_arv_meds,
      1259,
      latestSummaries.prev_arv_line
        ? latestSummaries.prev_arv_line
        : latestSummaries.cur_arv_line_reported,
      latestSummaries.date_created,
      prevRegimenEnc.insertId,
      1604,
      latestSummaries.prev_arv_start_date !== null
        ? latestSummaries.prev_arv_start_date
        : latestSummaries.arv_start_date,
      initialRegimenEnc.insertId,
      emrPatientId,
      emrCon
    );
    await savePatientObs(prevObs, insertmap, emrCon, prevRegimenEnc.insertId);
    //Createe previous arv regimen payload
    let currArvEncounter: Encounter = {
      encounter_datetime: latestSummaries.arv_start_date,
      creator: 1,
      changed_by: 1,
      voided_by: 1,
      encounter_type: 29,
      form_id: 49,
      location_id: 1604,
      patient_id: emrPatientId,
      visit_id: null,
      uuid: uuidv4(),
      encounter_id: 0,
      date_created: latestSummaries.date_created,
      voided: 0,
      date_voided: undefined,
      void_reason: "",
      date_changed: undefined,
    };
    console.log("ipt start ", latestSummaries.ipt_start_date);
    if (latestSummaries.ipt_start_date) {
      let d = ConceptMapper.instance;
      let IPTinitiation: PatientProgram = {
        patient_id: emrPatientId,
        program_id: 5,
        date_enrolled: latestSummaries.ipt_start_date,
        date_completed: latestSummaries.ipt_completion_date,
        outcome_concept_id: d.amrsConceptMap[latestSummaries.tb_tx_stop_reason],
        location_id: 1604,
        creator: 1,
        date_created: latestSummaries.ipt_start_date,
        changed_by: undefined,
        voided: 0,
        voided_by: undefined,
        date_voided: undefined,
        void_reason: "",
        uuid: uuidv4(),
        patient_program_id: 0,
      };
      await CM.query(toEnrolmentInsertStatement(IPTinitiation, {}), emrCon);
    }

    let currRegimenEnc = await createDrugRegimenEncounter(
      {},
      currArvEncounter,
      emrCon
    );

    let currObs = await generateDrugObs(
      latestSummaries.cur_arv_meds,
      1259,
      latestSummaries.cur_arv_line,
      latestSummaries.date_created,
      currRegimenEnc.insertId,
      1604,
      latestSummaries.arv_start_date,
      prevRegimenEnc.insertId,
      emrPatientId,
      emrCon
    );
    await savePatientObs(currObs, insertmap, emrCon, currRegimenEnc.insertId);
  }
  //CM.releaseConnections(emrCon,etlCon)
}
export async function generateDrugObs(
  regimen: any,
  artPlan: any,
  line: any,
  date_created: any,
  encounterId: any,
  location_id: any,
  previousDate: any,
  previousEncounter: any,
  personId: any,
  emrCon: Connection
) {
  let obs: Obs[] = [];
  await ConceptMapper.instance.initialize();
  let d = ConceptMapper.instance;
  let plan: Obs = {
    person_id: personId,
    concept_id: 1255,
    encounter_id: encounterId,
    order_id: 0,
    obs_datetime: date_created,
    location_id: location_id,
    accession_number: "",
    value_group_id: 0,
    value_boolean: 0,
    value_coded: artPlan,
    value_coded_name_id: 0,
    value_drug: undefined,
    value_datetime: undefined,
    value_numeric: null,
    value_modifier: "",
    value_text: "",
    value_complex: "",
    comments: "",
    creator: 1,
    date_created: date_created,
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
  };
  obs.push(plan);
  // Create regimen
  let rawRegimenArray = regimen.split(" ## ");
  for (let index = 0; index < rawRegimenArray.length; index++) {
    const element = rawRegimenArray[index];
    const mapped = d.amrsConceptMap[element];
    console.log("mapped", mapped);
    obs.push({
      person_id: personId,
      concept_id: 1088,
      encounter_id: encounterId,
      order_id: 0,
      obs_datetime: date_created,
      location_id: location_id,
      accession_number: "",
      value_group_id: 0,
      value_boolean: 0,
      value_coded: element === "unknown" || !mapped ? element : mapped,
      value_coded_name_id: 0,
      value_drug: undefined,
      value_datetime: undefined,
      value_numeric: null,
      value_modifier: "",
      value_text: "",
      value_complex: "",
      comments: "",
      creator: 1,
      date_created: date_created,
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
    });
  }
  //Push line
  let artLine = "";

  switch (line) {
    case 3:
      artLine = "AT";
      break;
    case 2:
      artLine = "AS";
      break;
    case 1:
      artLine = "AF";
      break;

    default:
      break;
  }
  console.log("line", artLine, line);
  obs.push({
    person_id: personId,
    concept_id: 163104,
    encounter_id: encounterId,
    order_id: 0,
    obs_datetime: date_created,
    location_id: location_id,
    accession_number: "",
    value_group_id: 0,
    value_boolean: 0,
    value_coded: null,
    value_coded_name_id: 0,
    value_drug: undefined,
    value_datetime: undefined,
    value_numeric: null,
    value_modifier: "",
    value_text: artLine,
    value_complex: "",
    comments: "",
    creator: 1,
    date_created: date_created,
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
  });
  //push end dates for previous regimens only
  if (previousEncounter !== "") {
    let date = toInsertSql(
      {
        person_id: personId,
        concept_id: 1191,
        encounter_id: previousEncounter,
        order_id: 0,
        obs_datetime: date_created,
        location_id: location_id,
        accession_number: "",
        value_group_id: 0,
        value_boolean: 0,
        value_coded: null,
        value_coded_name_id: 0,
        value_drug: undefined,
        value_datetime: previousDate,
        value_numeric: null,
        value_modifier: "",
        value_text: "",
        value_complex: "",
        comments: "",
        creator: 1,
        date_created: date_created,
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
    await CM.query(date, emrCon);
    let changeReason = toInsertSql(
      {
        person_id: personId,
        concept_id: 1252,
        encounter_id: previousEncounter,
        order_id: 0,
        obs_datetime: date_created,
        location_id: location_id,
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
        date_created: date_created,
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
    await CM.query(changeReason, emrCon);
  }

  return obs;
}
//Creeate current arv regimen payload
export async function createDrugRegimenEncounter(
  replaceColumns: any,
  encounter: Encounter,
  con: Connection
) {
  // /await CM.query("SET FOREIGN_KEY_CHECKS = 0 ", con);
  const savedEncounter = await CM.query(
    toEncounterInsertStatement(encounter, replaceColumns),
    con
  );
  return savedEncounter;
}
export function toEncounterInsertStatement(
  encounter: Encounter,
  replaceColumns?: any
) {
  return toInsertSql(
    encounter,
    ["encounter_id", "visit_id"],
    "encounter",
    replaceColumns
  );
}
export async function cleanUpRegimenEditorEvents(
  patient: any,
  connection: Connection
) {
  console.log("cleanup", patient);
  let loadRegimenEditorEncounters = await fetchRegimenEncountersObs(
    patient,
    connection
  );
  await cleanRegimenEncountersObs(patient, connection);
  let obsRetaindelete: any = [];
  await loadRegimenEditorEncounters.forEach(async (element) => {
    let sql = toInsertSql(element, [], "obs", "");
    const results = await CM.query(sql, connection);
    console.log("regrouped obs", results);
    obsRetaindelete.push(element.obs_id);
  });
}
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
export function toInsertSql(
  obj: any,
  excludeColumns: string[],
  table: string,
  replaceColumns?: any
) {
  let set: any = {};
  for (let o in obj) {
    if (excludeColumns.includes(o)) {
      continue;
    }
    if (replaceColumns[o]) {
      set[o] = replaceColumns[o];
    } else {
      set[o] = obj[o];
    }
  }
  const sql = mysql.format(`insert INTO ${table} SET ?`, [set]);
  console.log("SQL::: ", sql);
  return sql;
}
export type EncounterObs = {
  encounterTypeUuid?: string;
  locationId?: any;
  encounterTypId?: string;
  formId?: string;
  encounterId?: number;
  visitId?: any;
  creator?: string;
  changed_by?: string;
  voided_by?: string;
  obs?: any;
};
