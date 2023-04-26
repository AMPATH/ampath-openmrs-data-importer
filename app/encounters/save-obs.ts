import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import ConceptMapper, { ConceptMap } from "../concept-map";
import { Connection } from "mysql";
import { Obs } from "../tables.types";
import { PatientData } from "../patients/patient-data";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";
import { OrderMap } from "./save-orders";
import * as DM from "../../metadata/data-type-map.json";
const dataTypeMapping: DataTypeTransformMap = DM as DataTypeTransformMap;
const CM = ConnectionManager.getInstance();

export default async function savePatientObs(
  obsToInsert: Obs[],
  patient: PatientData,
  insertMap: InsertedMap,
  connection: Connection,
  location_id: any
) {
  //await ConceptMapper.instance.initialize();
  await UserMapper.instance.initialize();
  //let obs = prepareObs(obsToInsert, ConceptMapper.instance);
  let map = await saveObs(
    obsToInsert,
    obsToInsert,
    insertMap.patient,
    insertMap.encounters,
    insertMap.orders,
    connection,
    location_id
  );
  insertMap.obs = map;
  // console.log(insertMap);
  await updateObsGroupIds(obsToInsert, insertMap, connection);
}

export type ObsMap = {
  [kenyaEmrObsId: number]: number;
};

export async function updateObsGroupIds(
  sourceObs: Obs[],
  insertMap: InsertedMap,
  connection: Connection
) {
  sourceObs.forEach(async (obs) => {
    if (obs.obs_group_id) {
      if (!insertMap.obs[obs.obs_group_id]) {
        console.warn(
          "Parent obs id is missing from the insert map. Skipping updating of obs_group_id.",
          obs.obs_group_id
        );
        // console.warn('Details:', obs);
        return; // TODO throw error instead of returning
      }

      if (!obs.amrs_obs_id) {
        console.warn(
          "Obs was not inserted in AMRS. Skipping updates. Details:",
          obs
        );
        return; // TODO throw error instead of returning
      }
      await CM.query(
        toObsGroupIdUpdateStatement(
          obs.obs_group_id,
          insertMap.obs[obs.obs_group_id]
        ),
        connection
      );
    }
  });
}

export async function saveObs(
  mappedObs: Obs[],
  sourceObs: Obs[],
  newPatientId: number,
  encounterMap: any,
  orderMap: OrderMap,
  connection: Connection,
  locationId: any
) {
  let obsMap: ObsMap = {};
  let skippedObsCount = 0;
  for (var i = 0; i < mappedObs.length; i++) {
    if (mappedObs[i].comments === "invalid") {
      // skip it
      console.warn("skipping obs for concept: ", sourceObs[i].concept_id);
      skippedObsCount++;
      continue;
    }
    const sql = toObsInsertStatement(
      mappedObs[i],
      sourceObs[i],
      newPatientId,
      UserMapper.instance.userMap,
      encounterMap,
      orderMap,
      locationId
    );
    // console.log('sql', sql);
    await CM.query("SET FOREIGN_KEY_CHECKS = 0", connection);
    const results = await CM.query(sql, connection); // TODO save once encounters are ready
    obsMap[sourceObs[i].obs_id] = results.insertId;
    sourceObs[i].amrs_obs_id = results.insertId;
  }
  console.log(
    "Skipped obs count " + skippedObsCount + "/" + sourceObs.length,
    obsMap
  );
  return obsMap;
}

export function toObsInsertStatement(
  obs: Obs,
  sourceObs: Obs,
  newPatientId: number,
  userMap: any,
  encounterMap: any,
  orderMap: OrderMap,
  locationId: any
) {
  if (sourceObs.order_id && !orderMap[sourceObs.order_id]) {
    console.warn(
      ` Order ID ${sourceObs.order_id} not found. Required by obs id ${sourceObs.obs_id}`
    );
  }
  //console.log("encounter map", sourceObs.encounter_id, encounterMap);
  let replaceColumns = {
    creator: userMap[sourceObs.creator],
    voided_by: sourceObs.voided_by ? userMap[sourceObs.voided_by] : null,
    person_id: newPatientId,
    encounter_id: encounterMap[sourceObs.encounter_id] || null,
    location_id: locationId, //TODO replace with kapenguria location id,
    order_id: orderMap[sourceObs.order_id] || null,
  };

  return toInsertSql(
    obs,
    ["obs_id", "amrs_obs_id", "value_boolean", "status", "interpretation"],
    "obs",
    replaceColumns
  );
}

export function toObsGroupIdUpdateStatement(obsId: number, obsGroupId: number) {
  let sql = `UPDATE obs SET obs_group_id = ${obsGroupId} where obs_group_id = ${obsId}`;
  console.log("SQL:::", sql);
  return sql;
}

export function assertObsConceptsAreMapped(obs: Obs, conceptMap: ConceptMap) {
  if (dataTypeMapping[obs.concept_id]) {
    // explicit map provided
    return;
  }
  if (!conceptMap[obs.concept_id]) {
    throw new Error("Unmapped concept detected. Concept ID: " + obs.concept_id);
  }

  if (obs.value_coded && !conceptMap[obs.value_coded]) {
    throw new Error(
      "Unmapped value_coded concept detected. Concept ID: " + obs.value_coded
    );
  }
}

export function transformObsConcept(
  transformInfo: DataTypeTransformInfo,
  newObs: Obs,
  sourceObs: Obs
) {
  newObs.concept_id = transformInfo.amrs_id;
  transformObsValue(transformInfo, newObs, sourceObs);
}

export type DataTypeTransformMap = {
  [conceptId: string]: DataTypeTransformInfo;
};

export type DataTypeTransformInfo = {
  amrs_id: number;
  type: string;
  values: {
    [source: string]: string;
  };
};

export function transformObsValue(
  transformInfo: DataTypeTransformInfo,
  newObs: Obs,
  sourceObs: Obs
) {
  switch (transformInfo.type) {
    case "coded-coded":
      if (transformInfo.values[sourceObs.value_coded] === undefined) {
        throw new Error(
          `Unresolved transformation for value ${sourceObs.value_coded}. Details ${transformInfo}`
        );
      }
      newObs.value_coded = parseInt(
        transformInfo.values[sourceObs.value_coded]
      );
      break;
    case "numeric-coded":
      if (transformInfo.values[sourceObs.value_numeric || ""] === undefined) {
        throw new Error(
          `Unresolved transformation for value ${sourceObs.value_numeric}. Details ${transformInfo}`
        );
      }
      newObs.value_coded = parseInt(
        transformInfo.values[sourceObs.value_numeric || ""]
      );
      newObs.value_numeric = null;
      break;
    default:
      throw new Error("Unknown conversion type. Details: " + transformInfo);
  }
}
