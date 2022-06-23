import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import ConceptMapper, { AmrsConceptMap, ConceptMap } from "../concept-map";
import { Connection } from "mysql";
import { Obs } from "../tables.types";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";
import { OrderMap } from "./save-orders";
import * as skipObs from "../../metadata/skip-obs.json";
import * as DM from "../../metadata/data-type-map.json";
import transferLocationToEmr from "../location/location";
const dataTypeMapping: DataTypeTransformMap = DM as DataTypeTransformMap;
const CM = ConnectionManager.getInstance();

export default async function savePatientObs(
  obsToInsert: Obs[],
  insertMap: InsertedMap,
  connection: Connection,
  encounter: any
) {
  await ConceptMapper.instance.initialize();
  await UserMapper.instance.initialize();
  let obs = prepareObs(obsToInsert, ConceptMapper.instance);
  let map = await saveObs(
    obs,
    obsToInsert,
    insertMap.patient,
    encounter,
    insertMap.orders,
    connection
  );
  insertMap.obs = map;
  //await updateObsGroupIds(obsToInsert, insertMap, connection);
  //connection.destroy()
}

export type ObsMap = {
  [kenyaEmrObsId: number]: number;
};

export async function updateObsGroupIds(
  sourceObs: Obs[],
  _insertMap: InsertedMap,
  connection: Connection
) {
  sourceObs.forEach(async (obs) => {
    if (obs.obs_group_id) {
      await CM.query(
        toObsGroupIdUpdateStatement(obs.obs_id, obs.obs_group_id),
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
  connection: Connection
) {
  let obsMap: ObsMap = {};
  let skippedObsCount = 0;
  let concept_id: any = [];
  let value_coded: any = [];
  for (var i = 0; i < mappedObs.length; i++) {
    //Check if the concept id or value_coded exist
    if (
      mappedObs[i].value_coded != null ||
      mappedObs[i].value_coded != undefined
    ) {
      value_coded = await CM.query(
        `Select concept_id from concept where concept_id=${mappedObs[i].value_coded}`,
        connection
      );
      if (!value_coded[0]?.concept_id) {
        mappedObs[i].value_coded = 1067;
      }
    }
    concept_id = await CM.query(
      `Select concept_id from concept where concept_id=${mappedObs[i].concept_id}`,
      connection
    );
    console.log("checking", concept_id, mappedObs[i]);
    if (concept_id[0]?.concept_id < 0) {
      console.log(
        "Concept id",
        concept_id[0].concept_id,
        mappedObs[i].concept_id
      );
      mappedObs[i].concept_id = 1067;
    }
    mappedObs[i].value_drug = null;

    if (
      mappedObs[i].comments === "invalid" ||
      mappedObs[i].concept_id == 1067 ||
      mappedObs[i].value_coded == 1067
    ) {
      // skip it
      console.warn("skipping obs for concept: ", sourceObs[i].concept_id);
      skippedObsCount++;
      continue;
    }
    const sql = await toObsInsertStatement(
      mappedObs[i],
      sourceObs[i],
      newPatientId,
      UserMapper.instance.userMap,
      encounterMap,
      orderMap
    );
    // console.log('sql', sql);
    const results = await CM.query(sql, connection); // TODO save once encounters are ready
    obsMap[sourceObs[i].obs_id] = results.insertId;
    sourceObs[i].amrs_obs_id = results.insertId;
  }
  console.log("Skipped obs count " + skippedObsCount + "/" + sourceObs.length);
  return obsMap;
}

export async function toObsInsertStatement(
  obs: Obs,
  sourceObs: Obs,
  newPatientId: number,
  userMap: any,
  encounterMap: any,
  orderMap: OrderMap
) {
  if (sourceObs.order_id && !orderMap[sourceObs.order_id]) {
    console.warn(
      ` Order ID ${sourceObs.order_id} not found. Required by obs id ${sourceObs.obs_id}`
    );
  }
  let replaceColumns = {
    creator: userMap[sourceObs.creator],
    voided_by: userMap[sourceObs.voided_by],
    person_id: newPatientId,
    encounter_id: encounterMap || null,
    location_id: await transferLocationToEmr(sourceObs.location_id), //TODO replace with kapenguria location id,
    order_id: orderMap[sourceObs.order_id] || null,
    //status: "FINAL",
    obs_group_id: null,
    value_coded_name_id: null, //TODO replace with value_coded_name_id
    previous_version: null, //TODO replace with previous_version
    uuid: uuidv4(), //Remove this uuid
  };
  return toInsertSql(
    obs,
    ["amrs_obs_id", "value_boolean", "status", "interpretation", "obs_id"],
    "obs",
    replaceColumns
  );
}

export function toObsGroupIdUpdateStatement(obsId: number, obsGroupId: number) {
  let sql = `UPDATE obs SET obs_group_id = ${obsGroupId} where obs_id = ${obsId}`;
  console.log("SQL:::", sql);
  return sql;
}

export function prepareObs(
  obsToInsert: Obs[],
  conceptMap: ConceptMapper
): Obs[] {
  // replace concept ids with maps and convert to destination concept values
  // if a missing concept map or unknown data type concept is detected, then throw error
  let obs: Obs[] = obsToInsert.reduce<Obs[]>((filtered, o): Obs[] => {
    let obsId = o.obs_id?.toString();
    if ((skipObs as any)[obsId]) {
      console.log("Skipping obs", (skipObs as any)[obsId]);
      return filtered;
    }
    let newObs: Obs = Object.assign({}, o);
    // try {
    // TODO, to remove this before moving running in production
    //assertObsConceptsAreMapped(o, conceptMap.conceptMap);
    if (dataTypeMapping[o.concept_id]) {
      // a map is provided to handle concept and type transformations
      transformObsConcept(dataTypeMapping[o.concept_id], newObs, o);
    } else {
      mapObsConcept(newObs, o, conceptMap.amrsConceptMap);
      mapObsValue(newObs, o, conceptMap.amrsConceptMap);
    }
    // } catch (err) {
    //   // console.warn('Error:', err);
    //   newObs.comments = "invalid";
    // }
    if (newObs.concept_id) {
      filtered.push(newObs);
    }
    return filtered;
  }, []);

  return obs;
}

export function assertObsConceptsAreMapped(obs: Obs, conceptMap: ConceptMap) {
  if (dataTypeMapping[obs.concept_id]) {
    // explicit map provided
    return;
  }
  if (!conceptMap[obs.concept_id]) {
    console.log("Unmapped concept detected. Concept ID: " + obs.concept_id);
  }

  if (obs.value_coded && !conceptMap[obs.value_coded]) {
    // throw new Error(
    //   "Unmapped value_coded concept detected. Concept ID: " + obs.value_coded
    // );
    console.log(
      "Unmapped value coded concept detected. Concept ID: " + obs.concept_id
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

export function mapObsConcept(
  newObs: Obs,
  sourceObs: Obs,
  conceptMap: AmrsConceptMap
) {
  //console.log("Mapping", sourceObs,conceptMap[sourceObs.concept_id])
  if (conceptMap[sourceObs.concept_id] !== undefined) {
    newObs.concept_id = parseInt(
      conceptMap[sourceObs.concept_id]?.toString(),
      0
    );
  }
}

export function mapObsValue(
  newObs: Obs,
  sourceObs: Obs,
  conceptMap: AmrsConceptMap
) {
  let foundConcept: any = conceptMap[sourceObs.concept_id];
  console.log("Before", foundConcept);
  if (foundConcept && areDatatypeEquivalent(foundConcept[0])) {
    mapMatchingTypeObsValue(newObs, sourceObs, conceptMap);
  } else {
    //throw new Error("Unresolved conflicting data types detected. Details: ");
  }
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
      if (
        sourceObs.value_coded.toString() !== "-" &&
        transformInfo.values[sourceObs.value_coded] === undefined
      ) {
        console.log(transformInfo.values);
        throw new Error(
          `Unresolved transformation for value coded ${sourceObs.value_coded}. Details ${transformInfo.values}`
        );
      }
      newObs.value_coded = parseInt(
        transformInfo.values[sourceObs.value_coded]
      );
      break;
    case "numeric-coded":
      if (
        sourceObs.value_coded.toString() !== "-" &&
        transformInfo.values[sourceObs.value_numeric || ""] === undefined
      ) {
        throw new Error(
          `Unresolved transformation for value numeric ${sourceObs.value_numeric}. Details ${transformInfo}`
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

export function areDatatypeEquivalent(foundConcept: any): boolean {
  if (foundConcept?.datatype === foundConcept?.amrs_datatype) {
    return true;
  }

  if (
    foundConcept?.datatype === "Datetime" &&
    foundConcept?.amrs_datatype === "Date"
  ) {
    return true;
  }

  if (
    foundConcept?.datatype === "Date" &&
    foundConcept?.amrs_datatype === "Datetime"
  ) {
    return true;
  }

  return false;
}

function mapMatchingTypeObsValue(
  newObs: Obs,
  sourceObs: Obs,
  conceptMap: AmrsConceptMap
) {
  if (sourceObs.value_coded) {
    let a: any = conceptMap[sourceObs.value_coded];
    if (a && Number.isInteger(a[0])) {
      newObs.value_coded = parseInt(a[0]?.toString());
    }
  }
}
export function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
