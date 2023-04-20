import { Connection } from "mysql";
import ConnectionManager from "../connection-manager";
import { fetchPersonIdByUuid } from "../patients/load-patient-data";

const ConnectionInstance = ConnectionManager.getInstance();

export default async function fetchAmrsPatientEncounterLocations(
  patientUuid: string
) {
  const amrsConnection = await ConnectionInstance.getConnectionAmrs();
  const patientId = await fetchPersonIdByUuid(patientUuid, amrsConnection);
  const sql = `SELECT distinct location_id FROM kenya_emr1.encounter where patient_id= '${patientId}'`;
  let results: any[] = await ConnectionInstance.query(sql, amrsConnection);
  //await amrsConnection.destroy();
  return results;
}

export async function fetchDestinationLocationId(
  sourceLocation: string,
  connection: Connection
) {
  // const amrsConnection = await ConnectionInstance.getConnectionAmrs();
  const sql = `SELECT location_id FROM location where uuid= '${sourceLocation}'`;
  let results: any[] = await ConnectionInstance.query(sql, connection);
  console.log("Source Location", sql);
  return results[0].location_id;
}
