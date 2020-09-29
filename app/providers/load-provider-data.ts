import ConnectionManager from "../connection-manager";
import { Connection } from "mysql";
import { Provider, User } from "../tables.types";
const con = ConnectionManager.getInstance();

export default async function loadProviderData(
  personId: number,
  connection: Connection
) {
  let providers = await fetchProvider(personId, connection);
  return providers;
}
export async function fetchProvider(personId: number, connection: any) {
  const sql = `select * from provider where person_id =${personId}`;
  let results: Provider = await con.query(sql, connection);
  return results;
}
export async function fetchProviders(connection: any) {
  const sql = `select * from provider`;
  let results: Provider[] = await con.query(sql, connection);
  return results;
}
export async function fetchKemrPersonProviderIds(connection: Connection) {
  const sql = `select person_id from provider`;
  let results: any = await con.query(sql, connection);
  return results;
}
