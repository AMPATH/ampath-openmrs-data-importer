import { Connection } from "mysql";
import ConnectionManager from "../connection-manager";
import { InsertedMap } from "../inserted-map";
import toInsertSql, { toUpdateSql } from "../prepare-insert-sql";
import { PersonAttribute } from "../tables.types";
import UserMapper from "../users/user-map";
import { fetchorCreatePersonAttributeTypes } from "./load-patient-data";
import { PatientData } from "./patient-data";

const CM = ConnectionManager.getInstance();
export async function savePersonAttributes(
  patient: PatientData,
  insertMap: InsertedMap,
  AmrsConnection: Connection,
  EmrConnection: Connection
) {
  await UserMapper.instance.initialize();
  for (const attribute of patient.attributes) {
    // let replaceColumns = {};
    // //Create attribute type if missing
    // let attributeID = await fetchorCreatePersonAttributeTypes(
    //   AmrsConnection,
    //   EmrConnection,
    //   attribute.person_attribute_type_id
    // );
    // console.log(
    //   "Attribute ID",
    //   attributeID,
    //   attribute.person_attribute_type_id
    // );
    // let userMap=UserMapper.instance.userMap;
    let replaceColumns = {
      person_id: insertMap.patient,
    };
    await CM.query(
      toPatientAttributeInsertStatement(attribute, replaceColumns),
      EmrConnection
    );
  }
}

export function toPatientAttributeInsertStatement(
  attribute: PersonAttribute,
  replaceColumns?: any
) {
  return toInsertSql(
    attribute,
    ["person_attribute_id"],
    "person_attribute",
    replaceColumns
  );
}

export function toPatientAttributeUpdateStatement(
  attribute: PersonAttribute,
  replaceColumns?: any
) {
  return toInsertSql(
    attribute,
    ["person_attribute_id"],
    "person_attribute",
    replaceColumns
  );
}
