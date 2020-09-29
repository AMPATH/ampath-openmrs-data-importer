import ConnectionManager from "../connection-manager";
import { Connection } from "mysql";
import { Obs, Order } from "../tables.types";

const CM = ConnectionManager.getInstance();

export default async function loadPatientOrders(
  personId: number,
  connection: Connection
) {
  const sql = `select * from orders where patient_id = ${personId}`;
  let results: Order[] = await CM.query(sql, connection);
  return results;
}
