import ConnectionManager from "../connection-manager";
import { Connection } from "mysql";
import { User } from "../tables.types";
const con = ConnectionManager.getInstance();

export type UserData = {
  user: User;
};

export default async function loadUserData(
  userId: number,
  connection: Connection
) {
  let user = await fetchUser(userId, connection);
  let results: UserData = {
    user: user,
  };
  return results;
}

export async function fetchUser(userId: number, connection: any) {
  const sql = `select * from users where user_id= ${userId}`;
  let results: User[] = await con.query(sql, connection);
  return results[0];
}
export async function fetchUsers(connection: any) {
  const sql = `select * from users`;
  let results: User[] = await con.query(sql, connection);
  return results;
}
export async function loadUserDataByUuid(
  userUuid: string,
  connection: Connection
) {
  const userId = await fetchUserByUuid(userUuid, connection);
  return await loadUserData(userId, connection);
}
export async function fetchUserByUuid(
  personUuid: string,
  connection: Connection
) {
  const sql = `select user_id from users where uuid= '${personUuid}'`;
  let results: any[] = await con.query(sql, connection);
  console.log("user with uuid", results);
  return results.length > 0 ? (results[0]["user_id"] as number) : -1;
}
