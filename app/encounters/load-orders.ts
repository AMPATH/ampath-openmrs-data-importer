import ConnectionManager from "../connection-manager";
import { Connection } from "mysql";
import { Encounter, Obs, Order } from "../tables.types";

const CM = ConnectionManager.getInstance();

export default async function loadPatientOrders(
  personId: number,
  connection: Connection
) {
  const sql = `select * from orders where patient_id = ${personId}`;
  let results: Order[] = await CM.query(sql, connection);
  return results;
}

export async function getEncounterUUIDByID(
  encounter_id: any,
  connection: Connection
) {
  const sql = `select * from encounter where encounter_id = ${encounter_id}`;
  let results: Encounter[] = await CM.query(sql, connection);
  return results[0];
}

export async function getEncounterIDByUUID(uuid: any, connection: Connection) {
  const sql = `select * from encounter where uuid ="${uuid}"`;
  let results: Encounter[] = await CM.query(sql, connection);
  return results[0];
}
