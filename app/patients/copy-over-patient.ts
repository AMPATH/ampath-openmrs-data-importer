import ConnectionManager from "../connection-manager";
import savePatientData, {
  savePatient,
  savePatientContacts,
  savePersonAddress,
  savePersonName,
  savePersonRelationship,
} from "./save-new-patient";
import loadPatientData, { loadPatientDataByUuid } from "./load-patient-data";
import saveVisitData from "../visits/save-visit-data";
import { InsertedMap } from "../inserted-map";
import saveEncounterData from "../encounters/save-encounters";

import { saveProgramEnrolments } from "./save-program-enrolment";
import { savePatientIdentifiers } from "./save-identifiers";
import { savePersonAttributes } from "./save-person-attribute";
import savePatientOrders from "../encounters/save-orders";
import savePatientObs from "../encounters/save-obs";
import saveProviderData from "../providers/save-provider-data";
const CM = ConnectionManager.getInstance();

export default async function transferPatientToAmrs(
  personId: number,
  destinationLocation: any
) {
  const amrsEmrCon = await CM.getConnectionAmrs();
  const patient = await loadPatientData(personId, amrsEmrCon);
  await CM.commitTransaction(amrsEmrCon);
  let emrcon = await CM.getConnectionKenyaemr();
  emrcon = await CM.startTransaction(emrcon);
  if (patient.person.dead == 0) {
    try {
      let saved = { person: patient.person };
      await savePatientData(patient, emrcon);
      saved = await loadPatientDataByUuid(patient.person.uuid, emrcon);
      if (patient.patient) {
        await savePatient(patient, saved.person.person_id, emrcon);
      }
      let insertMap: InsertedMap = {
        patient: saved.person.person_id,
        visits: {},
        encounters: {},
        patientPrograms: {},
        patientIdentifier: {},
        obs: {},
        orders: {},
        regimen: [],
      };

      await savePersonAddress(patient, insertMap, emrcon);
      //Remove special characters from names;
      await savePersonName(patient, insertMap, emrcon);
      await savePatientIdentifiers(
        patient.identifiers,
        patient,
        insertMap,
        emrcon,
        destinationLocation
      );
      await savePersonAttributes(
        patient,
        insertMap,
        amrsEmrCon,
        emrcon,
        destinationLocation
      );
      // TODO Create visits for all encounters and backdate to 3 hrs.
      await saveVisitData(
        patient,
        insertMap,
        emrcon,
        amrsEmrCon,
        destinationLocation
      );
      //Saves other encounters
      await saveEncounterData(
        patient.encounter,
        insertMap,
        amrsEmrCon,
        emrcon,
        personId,
        2,
        destinationLocation
      );
      await savePatientOrders(
        patient.orders,
        patient,
        insertMap,
        emrcon,
        amrsEmrCon
      );
      await savePatientObs(
        patient.obs,
        patient,
        insertMap,
        emrcon,
        destinationLocation
      );
      await saveProgramEnrolments(
        patient.patientPrograms,
        patient,
        insertMap,
        emrcon,
        destinationLocation
      );
      await saveProviderData(
        patient.provider,
        patient,
        insertMap,
        emrcon,
        amrsEmrCon,
        destinationLocation
      );
      await savePatientContacts(patient, emrcon, insertMap, amrsEmrCon);
      await savePersonRelationship(patient, emrcon, insertMap, amrsEmrCon);
      //await CM.commitTransaction(emrcon);
      await CM.rollbackTransaction(emrcon);
      await CM.releaseConnections(emrcon, amrsEmrCon);
      return { synced: true, message: null };
    } catch (er) {
      console.error("Error saving patient: " + patient.person.person_id, er);
      await CM.rollbackTransaction(emrcon);
      await CM.releaseConnections(emrcon, amrsEmrCon);
      return { synced: false, message: er };
    }
  }
  return { synced: false, message: "Patient dead" };
}
