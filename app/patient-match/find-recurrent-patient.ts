import moment from "moment";
import { Connection } from "mysql";

import ConnectionManager from "../connection-manager";
import patientSearch from "./patient-search";
import fetchKenyaEmrPersonIDs from "./load-kenya-emr-personIds";
import fetchAmrsPatientEncounterLocations from "./patient-encounter-location";
import exportRecurrentPatients from "./export-recurrent-patients";
import { PatientComparator, PatientData } from "../types/patient.types";
import {
  fetchPerson,
  fetchPersonNames,
  fetchPersonIdentifiers,
} from "../patients/load-patient-data";

const connection = ConnectionManager.getInstance();

init();

async function init() {
  const data = await findPossiblePatientMatch(5);
  if (data.length >= 1) console.table(data);
  console.log("Number of possible already existing patients: ", data.length);
  exportRecurrentPatients(data);
}

async function findPossiblePatientMatch(limit: number) {
  const personIDs: Array<any> = await fetchKenyaEmrPersonIDs(limit);
  console.log("Patient Ids Loaded: ", personIDs.length);

  let possibleMatchPatientList: Array<any> = [];
  for (const id of personIDs) {
    const patientId = id.patient_id;
    console.log("Performing patient match for patient:", patientId);
    possibleMatchPatientList.push(
      ...(await checkForAlreadyExistingPatients(patientId))
    );
  }
  return possibleMatchPatientList;
}

async function checkForAlreadyExistingPatients(personId: number) {
  const kenyaEmrConnection = await connection.getConnectionKenyaemr();
  let patient: any = {};
  try {
    patient = await fetchPatientData(personId, kenyaEmrConnection);
    await kenyaEmrConnection.destroy();
  } catch (error) {
    console.log("Error loading patient data: ", error);
  }

  const gender = patient.person.gender;
  const birthdate = patient.person.birthdate;
  const identifiers: Array<any> = patient.identifiers;
  const names = patient.names;
  const age = calculateAge(birthdate);

  const patientListByIdentifiers = await fetchPatientByIdentifier(identifiers);
  let patientList =
    patientListByIdentifiers.length === 0
      ? [...(await fetchPatientByNames(names))]
      : [...patientListByIdentifiers];

  patientList = patientList.reduce((unique, patient) => {
    return unique.includes(patient) ? unique : [...unique, patient];
  }, []);

  patientList = filterByAge_Gender(patientList, gender, age);
  patientList = filterByNames(patientList, names);
  patientList = await filterByEncounterLocation(patientList);

  let combinedPatient: Array<PatientComparator> = [];
  for (const patient of patientList) {
    let results: PatientComparator = {
      Amrs_person_uuid: patient.person.uuid,
      Amrs_identifiers: getIdentifersCommaSeparated(
        getIdentifiers(patient.identifiers)
      ),
      Amrs_names: patient.person.display,
      Kenya_emr_personId: personId,
      Kenya_emr_identifiers: getIdentifersCommaSeparated(
        getIdentifiers(identifiers)
      ),
      Kenya_emr_names: flatenedName(getNames(names)),
    };
    combinedPatient.push(results);
  }

  const dupsFreeCombinedPatientList = combinedPatient.filter(
    (patient, index, patientList) =>
      getIndexOfPatient(patientList, patient) === index
  );
  if (dupsFreeCombinedPatientList.length >= 1)
    console.table(dupsFreeCombinedPatientList);
  return dupsFreeCombinedPatientList;
}

async function fetchPatientByIdentifier(identifiers: Array<any>) {
  let patientIdentifierSearchResults: Array<any> = [];
  for (const identif of identifiers) {
    const identifier = constructCCCIdentifierIfPresent(identif);
    patientIdentifierSearchResults.push(...(await fetchPatient(identifier)));
  }
  return patientIdentifierSearchResults;
}

async function fetchPatientByNames(names: Array<any>) {
  let patientSearchResults: Array<any> = [];
  for (const name of names) {
    const patientName = constructPatientName(
      name.family_name,
      name.given_name,
      name.middle_name
    );
    console.log("patient name: ", patientName);
    let f_arr = await fetchPatient(name.family_name);
    let m_arr = await fetchPatient(name.middle_name);
    let g_arr = await fetchPatient(name.given_name);
    patientSearchResults.push(...f_arr, ...m_arr, ...g_arr);
  }
  return patientSearchResults;
}

async function fetchPatient(name: string): Promise<Array<any>> {
  return new Promise((resolve, reject) => {
    patientSearch(name)
      .then((patients) => {
        resolve(patients?.results);
      })
      .catch((err) => {
        reject(err);
        console.log("Error fetching patient with name: " + name);
      });
  });
}

function filterByNames(patientList: Array<any>, names: Array<any>): Array<any> {
  const namesarray: Array<string> = getNames(names);
  return patientList.filter((patient) => {
    return (
      namesarray.filter((n) =>
        patient.person.display.toLowerCase().split(" ").includes(n)
      ).length >= 2
    );
  });
}

function filterByAge_Gender(patientList: Array<any>, gender: any, age: number) {
  return patientList.filter(
    (e) =>
      e.person.gender === gender && calculateAge(e.person.birthdate) === age
  );
}

async function filterByEncounterLocation(patientList: Array<any>) {
  let filteredPatientList: Array<any> = [];
  for (const patient of patientList) {
    const encounterLocations = await fetchAmrsPatientEncounterLocations(
      patient.uuid
    );
    const locationarr: Array<number> = [];
    encounterLocations.forEach((l) => locationarr.push(l.location_id));
    if (locationarr.includes(10) || locationarr.includes(214)) {
      filteredPatientList.push(patient);
    }
  }
  return filteredPatientList;
}

function getNames(names: Array<any>): Array<string> {
  let namesarray: Array<string> = [];
  names.forEach((name: any) => {
    namesarray.push(
      name?.family_name?.toLowerCase(),
      name?.middle_name?.toLowerCase(),
      name?.given_name?.toLowerCase()
    );
  });
  let uniqueNames: Array<string> = [];
  namesarray.forEach((name) => {
    if (!uniqueNames.includes(name)) {
      uniqueNames.push(name);
    }
  });
  return uniqueNames;
}

function constructCCCIdentifierIfPresent(identifier: any) {
  if (identifier.identifier_type === 5) {
    const ident = identifier.identifier;
    return ident.slice(0, 5) + "-" + ident.slice(ident.length - 5);
  } else {
    return identifier.identifier;
  }
}

function getIndexOfPatient(patientList: Array<any>, patient: any) {
  return patientList.findIndex(
    (p) => p.Amrs_person_uuid === patient.Amrs_person_uuid
  );
}

function getIdentifiers(identifiers: Array<any>): Array<string> {
  let identifierList: Array<string> = [];
  identifiers.forEach((identifier) => {
    identifierList.push(identifier.identifier);
  });
  return identifierList;
}

function getIdentifersCommaSeparated(identifiers: Array<string>): string {
  return identifiers.join();
}

function flatenedName(names: Array<string>): string {
  return names.join().replace(",", " ");
}

function constructPatientName(family: string, given: string, middle: string) {
  return given + " " + family + " " + middle;
}

function calculateAge(birthdate: any): number {
  return moment().diff(birthdate, "years");
}

async function fetchPatientData(patientId: number, connection: Connection) {
  let person = await fetchPerson(patientId, connection);
  let names = await fetchPersonNames(patientId, connection);
  let identifiers = await fetchPersonIdentifiers(patientId, connection);

  let results: PatientData = {
    person: person,
    names: names,
    identifiers: identifiers,
  };
  return results;
}
