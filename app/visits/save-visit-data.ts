import mysql, { Connection } from "mysql";
import { Visit, VisitAttribute } from "../tables.types";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import { InsertedMap } from "../inserted-map";
import { PatientData } from "../patients/patient-data";
const CM = ConnectionManager.getInstance();

export default async function saveVisitData(
  patient: PatientData,
  insertMap: InsertedMap,
  kemrCon: Connection,
  amrsCon: Connection,
  locationId: any
) {
  await UserMapper.instance.initialize();
  for (const visit of patient.visits) {
    await saveVisit(
      visit,
      insertMap.patient,
      insertMap,
      kemrCon,
      locationId,
      UserMapper.instance.userMap
    );
  }
}

export async function saveVisit(
  visit: Visit,
  patientId: number,
  insertMap: InsertedMap,
  connection: Connection,
  locationId: any,
  userMap?: any
) {
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      patient_id: patientId,
      location_id: locationId,
      creator: userMap[visit.creator],
      changed_by: visit.changed_by ? userMap[visit.changed_by] : null,
      voided_by: visit.voided_by ? userMap[visit.voided_by] : null,
    };
  }

  const results = await CM.query(
    toVisitInsertStatement(visit, replaceColumns),
    connection
  );
  insertMap.visits[visit.visit_id] = results.insertId;
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
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      creator: userMap.find(
        (user: { kemrUserId: number }) =>
          user.kemrUserId === visitAttribute.creator
      )?.amrsUserID,
      changed_by: userMap.find(
        (user: { kemrUserId: number }) =>
          user.kemrUserId === visitAttribute.changed_by
      )?.amrsUserID,
      voided_by: userMap.find(
        (user: { kemrUserId: number }) =>
          user.kemrUserId === visitAttribute.voided_by
      )?.amrsUserID,
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
  const sql = mysql.format(`INSERT INTO ${table} SET ?`, [set]);
  return sql;
}
