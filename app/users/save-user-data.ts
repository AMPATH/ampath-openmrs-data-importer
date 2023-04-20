import mysql, { Connection } from "mysql";
import { User } from "../tables.types";
import ConnectionManager from "../connection-manager";
import { UserData } from "./load-user-data";
// import toInsertSql from "../prepare-insert-sql";
const CM = ConnectionManager.getInstance();

export default async function saveUserData(
  user: UserData,
  connection: Connection
) {
  return saveUser(user, connection);
}

export async function saveUser(user: UserData, connection: Connection) {
  await CM.query(toUserInsertStatement(user.user), connection);
}

export function toUserInsertStatement(user: User) {
  user.creator = 2;
  user.retired_by = 2;
  return toInsertSql(user, ["user_id", "system_id", "changed_by"], "users");
}

export function toInsertSql(obj: any, excludeColumns: string[], table: string) {
  let set: any = {};
  for (let o in obj) {
    if (excludeColumns.includes(o)) {
      continue;
    }
    set[o] = obj[o];
  }
  const sql = mysql.format(`INSERT INTO ${table} SET ?`, [set]);
  console.log("SQL::: ", sql);
  return sql;
}
