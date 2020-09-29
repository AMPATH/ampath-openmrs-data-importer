import ConnectionManager from "../connection-manager";
import loadUserData, { loadUserDataByUuid } from "./load-user-data";
import saveUserData from "./save-user-data";
import loadPatientData, {
  fetchPerson,
  loadPatientDataByUuid,
} from "../patients/load-patient-data";
import { savePerson } from "../patients/save-new-patient";
import UserMapper from "./user-map";

const CM = ConnectionManager.getInstance();

export default async function transferUserToAmrs(userId: number) {
  const kenyaEmrCon = await CM.getConnectionKenyaemr();
  let amrsCon = await CM.getConnectionAmrs();
  const userData = await loadUserData(userId, kenyaEmrCon);
  console.log("user", userData);
  //check user existence on AMRS
  const AmrsuserData = await loadUserDataByUuid(userData.user.uuid, amrsCon);
  console.warn("AMRS User", AmrsuserData);
  if (AmrsuserData.user === undefined) {
    await UserMapper.instance.initialize();
    console.log("User doesn't exit, creating");
    const patient = await loadPatientData(userData.user.person_id, kenyaEmrCon);
    amrsCon = await CM.startTransaction(amrsCon);

    try {
      await savePerson(patient, amrsCon, {});
      const savedPerson = await loadPatientDataByUuid(
        patient.person.uuid,
        amrsCon
      );
      console.log("saved person", savedPerson);
      //prepare payload for userdata with new id
      userData.user.person_id = savedPerson.person.person_id;
      await saveUserData(userData, amrsCon);
      const saved = await loadUserDataByUuid(userData.user.uuid, amrsCon);
      console.log("saved user", saved);
      await CM.commitTransaction(amrsCon);
      const commitedUser = await loadUserDataByUuid(
        userData.user.uuid,
        amrsCon
      );
      console.log("commited user", commitedUser);
      CM.releaseConnections(kenyaEmrCon, amrsCon);
      return saved.user.user_id;
    } catch (err) {
      console.error("Unable to save user. Details:", err);
      await CM.rollbackTransaction(amrsCon);
      CM.releaseConnections(kenyaEmrCon, amrsCon);
      return "";
    }
  } else {
    CM.releaseConnections(kenyaEmrCon, amrsCon);
    return "";
  }
}
