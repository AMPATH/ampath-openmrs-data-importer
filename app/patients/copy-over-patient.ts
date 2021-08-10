import ConnectionManager from "../connection-manager";
import savePatientData, {
  savePatient,
  savePersonAddress,
  savePersonName,
} from "./save-new-patient";
import loadPatientData, { loadPatientDataByUuid } from "./load-patient-data";
import saveVisitData from "../visits/save-visit-data";
import { InsertedMap } from "../inserted-map";
//import savePatientObs from "../encounters/save-obs";
import saveProviderData from "../providers/save-provider-data";
import saveEncounterData from "../encounters/save-encounters";
//import savePatientOrders from "../encounters/save-orders";
import { saveProgramEnrolments } from "./save-program-enrolment";
import { savePatientIdentifiers } from "./save-identifiers";
import { savePersonAttributes } from "./save-person-attribute";
import savePatientOrders from "../encounters/save-orders";
import savePatientObs from "../encounters/save-obs";
const CM = ConnectionManager.getInstance();

export default async function transferPatientToAmrs(personId: number) {
  console.log("patient-id", personId);
  const amrsEmrCon = await CM.getConnectionAmrs();
  const patient = await loadPatientData(personId, amrsEmrCon);
  await CM.commitTransaction(amrsEmrCon);
  //console.log("patient", patient);
  let emrcon = await CM.getConnectionKenyaemr();
  emrcon = await CM.startTransaction(emrcon);
  try {
    let saved = { person: patient.person };

    await savePatientData(patient, emrcon);
    saved = await loadPatientDataByUuid(patient.person.uuid, emrcon);

    await savePatient(patient, saved.person.person_id, emrcon);

    let insertMap: InsertedMap = {
      patient: saved.person.person_id,
      visits: {},
      encounters: {},
      patientPrograms: {},
      patientIdentifier: {},
      obs: {},
      orders: {},
    };

    await savePersonAddress(patient, insertMap, emrcon);
    await savePersonName(patient, insertMap, emrcon);
    await savePatientIdentifiers(
      patient.identifiers,
      patient,
      insertMap,
      emrcon
    );
    await savePersonAttributes(patient, insertMap, emrcon);
    await saveProgramEnrolments(
      patient.patientPrograms,
      patient,
      insertMap,
      emrcon
    );
    await saveVisitData(patient, insertMap, emrcon, amrsEmrCon);
    await saveEncounterData(
      patient.encounter,
      insertMap,
      amrsEmrCon,
      emrcon,
      personId
    );
    await saveProviderData(
      patient.provider,
      patient,
      insertMap,
      emrcon,
      amrsEmrCon
    );
    await savePatientOrders(patient.orders, patient, insertMap, emrcon);
    // console.log('saved patient',patient, saved, insertMap);
    //await savePatientObs(patient.obs, patient, insertMap, emrcon);
    saved = await loadPatientDataByUuid(patient.person.uuid, emrcon);

    // console.log('saved patient', saved.obs.find((obs)=> obs.obs_id === insertMap.obs[649729]));
    await CM.rollbackTransaction(emrcon);
    await CM.releaseConnections(emrcon, amrsEmrCon);
    return { synced: true, message: null };
  } catch (er) {
    console.error("Error saving patient: " + patient.person.person_id, er);
    await CM.rollbackTransaction(emrcon);
    await CM.releaseConnections(emrcon, amrsEmrCon);
    return { synced: false, message: er.message };
  }
}
