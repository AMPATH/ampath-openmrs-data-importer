import mysql, { Connection } from "mysql";
import { Visit, VisitAttribute } from "../tables.types";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import { InsertedMap } from "../inserted-map";
import { PatientData } from "../patients/patient-data";
import {
  fetchVisitAttribute,
  fetchVisitAttributeByUuid,
} from "./load-visits-data";
import transferLocationToEmr from "../location/location";
import loadencounters, {
  updateEncounterVisit,
} from "../encounters/load-encounters";
import moment from "moment";
import { uuidv4 } from "../encounters/save-obs";
const CM = ConnectionManager.getInstance();

export default async function saveVisitData(
  kemrCon: Connection,

  patient_id: number
) {
  // Retrieve all patient encounters and group by date.
  let encounters = await loadencounters(patient_id, kemrCon);

  const groups = encounters.reduce(
    (groups: any, item) => ({
      ...groups,
      [item.encounter_datetime.toLocaleDateString()]: [
        ...(groups[item.encounter_datetime.toLocaleDateString()] || []),
        item.encounter_id,
      ],
    }),
    {}
  );
  console.log("HERE", groups);
  let groupedEncounters = Object.keys(groups);
  for (let index = 0; index < groupedEncounters.length; index++) {
    const element: any = groupedEncounters[index];

    var encounterObject = encounters.filter(function (item) {
      if (item.encounter_id == groups[element][0]) {
        return item;
      }
    });
    //
    //Create visit
    var time = moment.duration("00:03:15");
    var date = moment(encounterObject[0].encounter_datetime);
    let dateStarted = date.subtract(time).toDate();
    let visit: Visit = {
      patient_id: encounterObject[0].patient_id,
      visit_type_id: 1,
      date_started: dateStarted,
      location_id: await transferLocationToEmr(encounterObject[0].location_id),
      creator: encounterObject[0].creator,
      date_created: encounterObject[0].date_created as Date,
      voided: 0,
      uuid: uuidv4(),
    };

    const results = await CM.query(toVisitInsertStatement(visit, {}), kemrCon);
    console.log("Insert ID", results.insertId, groups[element]);
    let visitID = results.insertId;

    // Update encounter visits
    for (let index = 0; index <= groups[element].length; index++) {
      const encounter = groups[element][index];
      if (encounter) {
        console.log("Oya", visitID, groups[element]);
        let a = await updateEncounterVisit(visitID, encounter, kemrCon);

        console.log("Oya answet", a);
      }
    }
  }
}

export async function saveVisit(
  visit: Visit,
  patientId: number,
  insertMap: InsertedMap,
  connection: Connection,
  userMap?: any
) {
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      creator: userMap[visit.creator],
      changed_by: userMap[visit.creator],
      voided_by: userMap[visit.creator],
      patient_id: patientId,
      location_id: await transferLocationToEmr(visit.location_id),
      visit_type_id: 1,
    };
  }

  const results = await CM.query(
    toVisitInsertStatement(visit, replaceColumns),
    connection
  );
}

export function toVisitInsertStatement(visit: Visit, replaceColumns?: any) {
  return toInsertSql(visit, ["visit_id"], "visit", replaceColumns);
}
export async function saveVisitAttribute(
  visitAttribute: VisitAttribute,
  visitId: number,
  connection: Connection
) {
  const userMap = UserMapper.instance.userArray;
  // console.log("User Map", userMap);
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      creator: userMap[visitAttribute.creator],
      changed_by: userMap[visitAttribute.changed_by],
      voided_by: userMap[visitAttribute.voided_by],
      visit_id: visitId,
    };
  }

  await CM.query(
    toVisitAttributeInsertStatement(visitAttribute, replaceColumns),
    connection
  );
}
export function toVisitAttributeInsertStatement(
  visitAttribute: VisitAttribute,
  replaceColumns?: any
) {
  return toInsertSql(
    visitAttribute,
    ["visit_attribute_id"],
    "visit_attribute",
    replaceColumns
  );
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
