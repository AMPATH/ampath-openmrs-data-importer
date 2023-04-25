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
  EmrConnection: Connection,
  locationId: any
) {
  await UserMapper.instance.initialize();
  for (const attribute of patient.attributes) {
    let userMap = UserMapper.instance.userMap;
    let replaceColumns = {
      person_id: insertMap.patient,
      location_id: locationId,
      creator: userMap[attribute.creator],
      changed_by: attribute.changed_by ? userMap[attribute.changed_by] : null,
      voided_by: attribute.voided_by ? userMap[attribute.voided_by] : null,
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
