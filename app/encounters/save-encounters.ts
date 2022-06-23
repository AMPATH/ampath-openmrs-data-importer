import { Connection } from "mysql";
import { Encounter, EncounterProvider, Obs } from "../tables.types";
import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";
import {
  fetchAmrsEncounterType,
  fetchEncounter,
  fetchEncounterProviders,
  fetchEncounterType,
  fetchKemrEncounterById,
} from "./load-encounters";
import ProviderMapper from "../providers/provider-map";
import FormMapper from "./form-map";
import EncounterObsMapper from "./amrs-emr-encounter-map";
import savePatientObs, { saveObs, uuidv4 } from "./save-obs";
import transferLocationToEmr from "../location/location";
import { loadPatientARVPlan } from "./load-patient-obs";
import { fetchPatientPrograms } from "../patients/load-patient-data";

const CM = ConnectionManager.getInstance();

export default async function saveEncounterData(
  encounters: Encounter[],
  insertMap: InsertedMap,
  amrsconnection: Connection,
  kemrConnection: Connection,
  personId: number,
  encounterType: number
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
    UserMapper.instance.userMap
  );
}
export async function saveEncounter(
  _encounter: Encounter[],
  kemrsConnection: Connection,
  amrsConnection: Connection,
  insertMap: InsertedMap,
  personId: number,
  encounterType: number,
  userMap?: any
) {
  let replaceColumns = {};
  // Map encounter to respective kenyaemr encounters and forms
  let encounterObsMapper = new EncounterObsMapper();
  let encounter: any = await encounterObsMapper.retrieveobs(
    personId,
    amrsConnection,
    kemrsConnection,
    insertMap,
    encounterType
  );
  //console.log("ALL", encounter);

  //Perform enrollment with just one encounter once
  let encCount = 0;
  for (const enc of Object.keys(encounter)) {
    encCount++;
    let visitId = null;
    if (encounter[enc][0].visitId) {
      visitId = encounter[enc][0].visitId;
    }
    if (enc !== "0") {
      let enc2 = await fetchKemrEncounterById(parseInt(enc, 0), amrsConnection);
      if (userMap) {
        let metadata: any = findDominantEncType(encounter[parseInt(enc, 0)]);
        replaceColumns = {
          creator: userMap[encounter[parseInt(enc, 0)][0].obs.creator],
          changed_by: userMap[encounter[parseInt(enc, 0)][0].obs.changed_by]
            ? userMap[encounter[parseInt(enc, 0)][0].obs.changed_by]
            : null,
          voided_by: userMap[encounter[parseInt(enc, 0)][0].obs.voided_by],
          encounter_type: metadata[0],
          form_id: metadata[1],
          visit_id: null,
          location_id: await transferLocationToEmr(
            encounter[parseInt(enc, 0)][0].locationId
          ),
          patient_id: insertMap.patient,
        };
        console.log(replaceColumns, enc2[0]);
      }
      const savedEncounter = await CM.query(
        toEncounterInsertStatement(enc2[0], replaceColumns),
        kemrsConnection
      );

      let obsToInsert: Obs[] = [];
      encounter[parseInt(enc, 0)].map((a: any) => {
        obsToInsert.push(a.obs);
      });
      insertMap.encounters[encounter[parseInt(enc, 0)][0].obs.encounter_id] =
        savedEncounter.insertId;
      if (encCount == Object.keys(encounter).length) {
        let dcProgramEnrolment = await fetchPatientPrograms(
          personId,
          amrsConnection
        );
        let stability = 2;
        let a = dcProgramEnrolment.filter((x) => {
          if (x.program_id === 9) {
            stability = 1;
          }
        });
        console.log("Stability", a, dcProgramEnrolment, stability);
        let stabilityPayload = toInsertSql(
          {
            person_id: insertMap.patient,
            concept_id: 1855,
            encounter_id: savedEncounter.insertId,
            order_id: 0,
            obs_datetime: encounter[parseInt(enc, 0)][0].obs.obs_datetime,
            location_id: 1604,
            accession_number: "",
            value_group_id: 0,
            value_boolean: 0,
            value_coded: stability,
            value_coded_name_id: 0,
            value_drug: undefined,
            value_datetime: null,
            value_numeric: null,
            value_modifier: "",
            value_text: "",
            value_complex: "",
            comments: "",
            creator: 1,
            date_created: encounter[parseInt(enc, 0)][0].obs.date_created,
            voided: 0,
            voided_by: null,
            void_reason: "",
            uuid: uuidv4(),
            form_namespace_and_path: 0,
            previous_version: "",
            status: "",
            interpretation: 0,
            obs_id: 0,
            amrs_obs_id: 0,
          },
          [
            "amrs_obs_id",
            "value_boolean",
            "status",
            "interpretation",
            "obs_id",
            "order_id",
            "obs_group_id",
            "previous_version",
            "value_coded_name_id",
          ],
          "obs",
          {}
        );
        await CM.query(stabilityPayload, kemrsConnection);
      }
      const savedObs = await savePatientObs(
        obsToInsert,
        insertMap,
        kemrsConnection,
        savedEncounter.insertId
      );

      await saveEncounterProviderData(
        enc2,
        savedEncounter.insertId,
        amrsConnection,
        userMap
      );
    } else {
      //save obs without encounters
      let obsToInsert: Obs[] = [];
      encounter[parseInt(enc, 0)].map((a: any) => {
        obsToInsert.push(a.obs);
      });

      const savedObsWithoutEncounter = await savePatientObs(
        obsToInsert,
        insertMap,
        kemrsConnection,
        null
      );
    }
  }
  //CM.releaseConnections(kemrsConnection,amrsConnection)
}
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
        provider_id: providerId + "-Migrated",
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
