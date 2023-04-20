import ConnectionManager from "../connection-manager";
import loadUserData, { loadUserDataByUuid } from "./load-user-data";
import saveUserData from "./save-user-data";
import loadPatientData, {
  fetchPerson,
  loadPatientDataByUuid,
} from "../patients/load-patient-data";
import { savePerson, savePersonName } from "../patients/save-new-patient";
import UserMapper from "./user-map";

const CM = ConnectionManager.getInstance();

export default async function transferUserToEmr(userId: number) {
  let kenyaEmrCon = await CM.getConnectionKenyaemr();
  let amrsCon = await CM.getConnectionAmrs();
  const userData = await loadUserData(userId, amrsCon);
  console.log("user", userData);
  //check user existence on AMRS
  const AmrsuserData = await loadUserDataByUuid(
    userData.user.uuid,
    kenyaEmrCon
  );
  console.warn("AMRS User", AmrsuserData);
  if (AmrsuserData.user === undefined) {
    await UserMapper.instance.initialize();
    console.log("User doesn't exit, creating");
    const patient = await loadPatientData(userData.user.person_id, amrsCon);
    kenyaEmrCon = await CM.startTransaction(kenyaEmrCon);

    try {
      await savePerson(patient, kenyaEmrCon, {});
      const savedPerson = await loadPatientDataByUuid(
        patient.person.uuid,
        kenyaEmrCon
      );
      let insertMap: any = {};
      insertMap.patient = savedPerson.person.person_id;
      console.log("saved person", patient);
      await savePersonName(patient, insertMap, kenyaEmrCon);
      //prepare payload for userdata with new id
      userData.user.person_id = savedPerson.person.person_id;
      await saveUserData(userData, kenyaEmrCon);
      const saved = await loadUserDataByUuid(userData.user.uuid, kenyaEmrCon);
      console.log("saved user", saved);

      const commitedUser = await loadUserDataByUuid(
        userData.user.uuid,
        kenyaEmrCon
      );

      console.log("commited user", commitedUser);
      await CM.commitTransaction(kenyaEmrCon);
      CM.releaseConnections(kenyaEmrCon, amrsCon);
      return saved.user.user_id;
    } catch (err) {
      console.error("Unable to save user. Details:", err);
      await CM.rollbackTransaction(kenyaEmrCon);
      CM.releaseConnections(kenyaEmrCon, amrsCon);
      return "";
    }
  } else {
    CM.releaseConnections(kenyaEmrCon, amrsCon);
    return "";
  }
}
