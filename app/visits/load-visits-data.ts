import ConnectionManager from "../connection-manager";
import { Connection } from "mysql";
import { Visit, VisitAttribute } from "../tables.types";
const con = ConnectionManager.getInstance();

export type VisitData = {
  visit: Visit[];
};

export default async function loadVisitData(
  patientId: number,
  connection: Connection
) {
  let visits = await fetchVisit(patientId, connection);
  return visits;
}

export async function fetchVisit(patientId: number, connection: any) {
  const sql = `select * from visit where patient_id= ${patientId}`;
  let results: Visit[] = await con.query(sql, connection);
  return results;
}
export async function fetchVisitAttribute(visitId: number, connection: any) {
  const sql = `select * from visit_attribute where visit_id= ${visitId}`;
  let results: VisitAttribute[] = await con.query(sql, connection);
  return results[0];
}
export async function fetchVisitAttributeByUuid(
  attributeUuid: string,
  connection: any
) {
  const sql = `select * from visit_attribute where uuid = '${attributeUuid}'`;
  let results: VisitAttribute[] = await con.query(sql, connection);
  return results[0];
}
