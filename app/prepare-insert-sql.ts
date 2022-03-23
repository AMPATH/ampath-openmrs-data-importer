import mysql from "mysql";

export default function toInsertSql(
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
    if (replaceColumns[o] !== undefined) {
      set[o] = replaceColumns[o];
    } else {
      set[o] = obj[o];
    }
  }
  const sql = mysql.format(`insert INTO ${table} SET ?`, [set]);
  console.log("SQL::: ", sql);
  return sql;
}

export function toUpdateSql(
  obj: any,
  excludeColumns: string[],
  table: string,
  primaryKeyColumnName: string,
  replaceColumns?: any
) {
  let set: any = {};
  for (let o in obj) {
    if (excludeColumns.includes(o)) {
      continue;
    }
    if (replaceColumns[o] !== undefined) {
      set[o] = replaceColumns[o];
    } else {
      set[o] = obj[o];
    }
  }
  const sql = mysql.format(
    `Update ${table} SET ? where ${primaryKeyColumnName} = ${replaceColumns[primaryKeyColumnName]}`,
    [set]
  );
  console.log("SQL::: ", sql);
  return sql;
}
