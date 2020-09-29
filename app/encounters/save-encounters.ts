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
} from "./load-encounters";
import ProviderMapper from "../providers/provider-map";
import FormMapper from "./form-map";

const CM = ConnectionManager.getInstance();

export default async function saveEncounterData(
  encounters: Encounter[],
  insertMap: InsertedMap,
  amrsconnection: Connection,
  kemrConnection: Connection
) {
  //Todo add form mapper
  await UserMapper.instance.initialize();
  await FormMapper.instance.initialize();
  return saveEncounter(
    encounters,
    kemrConnection,
    amrsconnection,
    insertMap,
    UserMapper.instance.userMap
  );
}
export async function saveEncounter(
  encounter: Encounter[],
  kemrsConnection: Connection,
  amrsConnection: Connection,
  insertMap: InsertedMap,
  userMap?: any
) {
  let replaceColumns = {};
  for (const enc of encounter) {
    const kemrEncounterTypeId = await fetchEncounterType(
      enc.encounter_type,
      kemrsConnection
    );
    const amrsEncounterTypeId = await fetchAmrsEncounterType(
      kemrEncounterTypeId.uuid,
      amrsConnection
    );
    if (userMap) {
      replaceColumns = {
        creator: userMap[enc.creator],
        changed_by: userMap[enc.changed_by],
        voided_by: userMap[enc.voided_by],
        encounter_type: amrsEncounterTypeId.encounter_type_id,
        form_id: FormMapper.instance.formMap[enc.form_id],
        visit_id: insertMap.visits[enc.visit_id],
        location_id: 214,
        patient_id: insertMap.patient,
      };
    }
    const savedEncounter = await CM.query(
      toEncounterInsertStatement(enc, replaceColumns),
      amrsConnection
    );
    insertMap.encounters[enc.encounter_id] = savedEncounter.insertId;
    await saveEncounterProviderData(
      enc,
      savedEncounter.encounter_id,
      amrsConnection,
      userMap
    );
  }
}
export async function saveEncounterProviderData(
  enc: Encounter,
  encounterId: number,
  connection: Connection,
  userMap?: any
) {
  const EncounterProviders = await fetchEncounterProviders(
    enc.encounter_id,
    connection
  );
  await ProviderMapper.instance.initialize();
  // console.log("Inserting encounter providers", EncounterProviders);
  let replaceColumns = {};
  for (const enc_provider of EncounterProviders) {
    const providerId =
      ProviderMapper.instance.providerMap[enc_provider.provider_id];
    if (userMap) {
      replaceColumns = {
        creator: userMap[enc_provider.creator],
        changed_by: userMap[enc_provider.changed_by],
        voided_by: userMap[enc_provider.voided_by],
        encounter_id: encounterId,
        provider_id: providerId,
      };
    }
    await CM.query(
      toEncounterProviderInsertStatement(enc_provider, replaceColumns),
      connection
    );
  }
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
