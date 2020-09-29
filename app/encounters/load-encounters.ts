import { Connection } from "mysql";
import ConnectionManager from "../connection-manager";
import { Encounter, EncounterProvider } from "../tables.types";
const CM = ConnectionManager.getInstance();
export default async function loadencounters(
  patientId: number,
  connection: Connection
) {
  const encounter = await fetchEncounter(patientId, connection);
  return encounter;
}
export async function fetchEncounterTypeByUuid(
  uuid: string,
  connection: Connection
) {
  const sql = `select encounter_type_id from encounter_type where uuid= '${uuid}'`;
  let results: string = await CM.query(sql, connection);
  // console.log('encounters type with uuid', results);
  return results;
}
export async function fetchEncounter(
  patientId: number,
  connection: Connection
) {
  const sql = `select * from encounter where patient_id= '${patientId}'`;
  let results: Encounter[] = await CM.query(sql, connection);
  // console.log('encounters with uuid', results);
  return results;
}
export async function fetchEncounterType(
  encounterTypeId: number,
  connection: Connection
) {
  const sql = `select uuid from encounter_type where encounter_type_id= '${encounterTypeId}'`;
  let results: any = await CM.query(sql, connection);
  //console.log('encounter Type with id', results);
  return results[0];
}
export async function fetchAmrsEncounterType(
  encounterTypeUuid: string,
  connection: Connection
) {
  const sql = `select encounter_type_id from encounter_type where uuid= '${encounterTypeUuid}'`;
  let results: any = await CM.query(sql, connection);
  //console.log('encounter Type with id', results);
  return results[0];
}

export async function fetchEncounterProviders(
  encounterId: number,
  connection: Connection
) {
  const sql = `select * from encounter_provider where encounter_id= '${encounterId}'`;
  let results: EncounterProvider[] = await CM.query(sql, connection);
  // console.log('encounter provider with id', results);
  return results;
}

export async function fetchKemrEncounterById(
  encounterId: number,
  connection: Connection
) {
  const sql = `select * from encounter where encounter_id= '${encounterId}'`;
  let results: any = await CM.query(sql, connection);
  // console.log('encounter with id', results.encounter_id);
  return results;
}

export async function loadFormMap() {
  return {
    // 12:"d7e908a5-3adb-4794-9c27-ab27ee5aa818"
    1: "797e3d6c-2ac2-4a3c-aeb4-eb624be729d8",
    3: "32483128-5bc2-4852-9023-f719ec232b8b",
    4: "85b903f7-5f29-40be-b6c0-d32134d8f9e7",
    5: "3fbc8512-b37b-4bc2-a0f4-8d0ac7955127",
    6: "ad27338b-c861-4e5a-978f-b48d06ac8878",
    7: "60714a4d-2ccd-4963-ac54-c97bdd633197",
    8: "0dbabf5f-c54b-4080-bcdd-83ae3ffd3539",
    9: "891fdc79-b9ac-4deb-8e7a-dc91fc36f17a",
    10: "e0ad30a5-8ccb-4fa1-9477-da42934c7def",
    11: "6e44eebc-be8d-4fb9-8047-bedb6e9d9c49",
    12: "beae4508-894e-466c-872a-efa0311b7af1",
    13: "b0b1841a-0509-41a8-a8d8-9cfb09fb7d79",
    14: "27ed783d-5cc1-463d-964a-eaaa66d7e835",
    16: "4040b106-fa52-498b-9f77-18ef314f2f62",
    17: "84554d1e-1b4b-4f1d-a97f-85b27153055f",
    18: "ac88e158-6264-40e4-9c20-8f73e0c8cde0",
    19: "ddc5aa73-deba-4c61-96cf-14693c50ed51",
    21: "fc62280d-f80b-4b88-994e-a712d8cf147b",
    22: "1c9a539-ad3d-469c-8d47-f2ad0d6eb5fc",
    23: "c6972f74-e8ef-4858-b501-ace8f1b470d2",
    25: "04576eba-d7bd-4067-bb5d-9a9a7a33a875",
    26: "ac88e158-6264-40e4-9c20-8f73e0c8cde0",
    27: "6050da3d-e0c0-4e8d-a31d-890df7c1fc8a",
    30: "d2ec5a73-28fb-486c-b586-3e73c56bb855",
    31: "d26d4978-692e-4a20-a137-cd29bbef04cb",
    32: "b73969a5-653d-4002-9e68-b5bda30ebd0c",
    36: "b73969a5-653d-4002-9e68-b5bda30ebd0c",
    37: "aa2d014a-3a29-4abc-882a-53d89d5fc0b6",
    51: "7756aa93-a353-4aff-8320-c06fb62369f5",
    52: "0fe3de0b-ae29-4ada-ae89-24f4b023b675",
    53: "1d91ca55-dccf-4c59-b080-bc5e22542fc7",
    50: "1d91ca55-dccf-4c59-b080-bc5e22542fc7", // Todo add form metadata for drug regimen editor
    45: "1d91ca55-dccf-4c59-b080-bc5e22542fc7", // Todo add form metadata for drug order
  };
}
export async function loadEncounterFormsByUuid(
  formUuid: string,
  connection: Connection
) {
  const sql = `select form_id from form where uuid='${formUuid}'`;
  let results: any = await CM.query(sql, connection);
  console.log("encounter with id", results);
  return results.length > 0 ? results[0] : null;
}
