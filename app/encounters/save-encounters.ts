import { Connection } from "mysql";
import { Encounter, EncounterProvider } from "../tables.types";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";
import {
  fetchAmrsEncounterType,
  fetchEncounterProviders,
  fetchEncounterType,
  loadEncounterFormsById,
  loadEncounterFormsByUuid,
} from "./load-encounters";
import ProviderMapper from "../providers/provider-map";
import FormMapper from "./form-map";

const CM = ConnectionManager.getInstance();

export default async function saveEncounterData(
  encounters: Encounter[],
  insertMap: InsertedMap,
  amrsconnection: Connection,
  kemrConnection: Connection,
  personId: number,
  encounterType: number,
  locationId: any
) {
  //Todo add form mapper
  await UserMapper.instance.initialize();
  await FormMapper.instance.initialize();
  return saveEncounter(
    encounters,
    kemrConnection,
    amrsconnection,
    insertMap,
    personId,
    encounterType,
    locationId,
    UserMapper.instance.userMap,
    FormMapper.instance.formMap
  );
}
export async function saveEncounter(
  _encounter: Encounter[],
  kemrsConnection: Connection,
  amrsConnection: Connection,
  insertMap: InsertedMap,
  personId: number,
  encounterType: number,
  locationId: any,
  userMap?: any,
  formMap?: any
) {
  // Map encounter to respective kenyaemr encounters and forms

  //console.log("ALL", encounter);

  //Perform enrollment with just one encounter once
  let encCount = 0;
  for (const enc of _encounter) {
    //resolve encountertype
    let sourceEncounterType = await fetchEncounterType(
      enc.encounter_type,
      amrsConnection
    );
    let destinationEncounterTypeID = await fetchAmrsEncounterType(
      sourceEncounterType.uuid,
      kemrsConnection
    );
    let sourceFormId = await loadEncounterFormsById(
      enc.form_id,
      amrsConnection
    );
    let destinationFormId = await loadEncounterFormsByUuid(
      sourceFormId?.uuid,
      kemrsConnection
    );

    console.log(
      "Resolving encountertyoe",
      enc.form_id,
      sourceFormId,
      destinationFormId
    );
    let replaceColumns = {
      patient_id: insertMap.patient,
      location_id: locationId,
      encounter_type: destinationEncounterTypeID.encounter_type_id,
      form_id: destinationFormId ? destinationFormId.form_id : null,
      creator: userMap[enc.creator],
      changed_by: enc.changed_by ? userMap[enc.changed_by] : null,
      voided_by: enc.voided_by ? userMap[enc.voided_by] : null,
      visit_id: insertMap.visits[enc.visit_id],
    };

    let result = await CM.query(
      toEncounterInsertStatement(enc, replaceColumns),
      kemrsConnection
    );
    insertMap.encounters[enc.encounter_id] = result.insertId;
  }
}
//CM.releaseConnections(kemrsConnection,amrsConnection)
export async function saveEncounterProviderData(
  enc: Encounter,
  encounterId: number,
  connection: Connection,
  emrCON: Connection,
  userMap?: any
) {
  const EncounterProviders = await fetchEncounterProviders(
    connection,
    enc.encounter_id
  );
  await ProviderMapper.instance.initialize();
  // console.log("Inserting encounter providers", EncounterProviders);
  let replaceColumns = {};
  for (const enc_provider of EncounterProviders) {
    const providerId = 1;
    //ProviderMapper.instance.providerMap[enc_provider.provider_id];
    if (enc_provider) {
      replaceColumns = {
        encounter_id: encounterId,
        provider_id: 1,
        creator: 2,
        changed_by: enc.changed_by ? 2 : null,
      };
    }
    let encounterProviderExist = await fetchEncounterProviders(
      connection,
      enc_provider.encounter_id
    );
    if (encounterProviderExist.length === 0) {
      await CM.query(
        toEncounterProviderInsertStatement(enc_provider, replaceColumns),
        emrCON
      );
    }
  }
}
export function findDominantEncType(encounter: any) {
  var result = encounter.reduce(
    (acc: { [x: string]: any }, o: { encounterTypId: string | number }) => (
      (acc[o.encounterTypId] = (acc[o.encounterTypId] || 0) + 1), acc
    ),
    {}
  );
  var result2 = encounter.reduce(
    (acc: { [x: string]: any }, o: { formId: string | number }) => (
      (acc[o.formId] = (acc[o.formId] || 0) + 1), acc
    ),
    {}
  );
  let arr: Array<number> = Object.values(result);
  let max = Math.max(...arr);

  let encounterTypeID = Object.keys(result).find((key) => result[key] === max);

  let arr2: Array<number> = Object.values(result2);
  let max2 = Math.max(...arr2);

  let formID = Object.keys(result2).find((key) => result2[key] === max2);

  return [encounterTypeID, formID];
}
export function toEncounterInsertStatement(
  encounter: Encounter,
  replaceColumns?: any
) {
  return toInsertSql(encounter, ["encounter_id"], "encounter", replaceColumns);
}
export function toEncounterProviderInsertStatement(
  encounterProvider: EncounterProvider,
  replaceColumns?: any
) {
  return toInsertSql(
    encounterProvider,
    ["encounter_provider_id"],
    "encounter_provider",
    replaceColumns
  );
}
