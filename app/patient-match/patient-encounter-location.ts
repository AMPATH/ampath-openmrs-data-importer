import ConnectionManager from "../connection-manager";
import { fetchPersonIdByUuid } from "../patients/load-patient-data";

const ConnectionInstance = ConnectionManager.getInstance();

export default async function fetchAmrsPatientEncounterLocations(
  patientUuid: string
) {
  const amrsConnection = await ConnectionInstance.getConnectionAmrs();
  const patientId = await fetchPersonIdByUuid(patientUuid, amrsConnection);
  const sql = `SELECT distinct location_id FROM amrs.encounter where patient_id= '${patientId}'`;
  let results: any[] = await ConnectionInstance.query(sql, amrsConnection);
  await amrsConnection.destroy();
  return results;
}
