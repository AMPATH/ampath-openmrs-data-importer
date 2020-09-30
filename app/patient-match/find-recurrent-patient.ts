import moment from "moment";
import chalk from "chalk";
import ora from "ora";

import ConnectionManager from "../connection-manager";
import patientSearch from "./patient-search";
import { fetchKenyaEMRPatientIds, loadData } from "./load-patient-data";
import fetchAmrsPatientEncounterLocations from "./patient-encounter-location";
import exportRecurrentPatients from "./export-recurrent-patients";
import { PatientComparator } from "../types/patient.types";


const NANOSECS_PER_SEC = 1e9;
const connection = ConnectionManager.getInstance();

init();

async function init() {
  const startTime = startTimer();
  const data = await checkForPossiblePatientMatch(5);
  console.log("Number of possible already existing patients: ", data.length);
  await exportRecurrentPatients(data);
  const elapsedTime = startTimer(startTime);
  console.log(
    chalk.bold.gray(`\nCompleted all operations in ${formatTime(elapsedTime)}s`)
  );
  connection.closeAllConnections();
}

async function checkForPossiblePatientMatch(
  limit: number
): Promise<Array<PatientComparator>> {
  const patients = await fetchKenyaEMRPatientIds(limit);
  const patientIds = patients.map((patient) => patient.patient_id);

  console.log("Number of patient IDs Loaded: ", patientIds.length);
  console.log("");

  let patientList: Array<PatientComparator> = [];
  for (const [index, id] of patientIds.entries()) {
    const startTime = startTimer();
    let spinner: ora.Ora = ora(
      `Searching for possible duplicates using patient ID ${chalk.bold.green(
        id
      )} ` + chalk`({yellow ${index + 1} of ${patientIds.length}}) \n`
    ).start();

    let list = await checkForAlreadyExistingPatientInAmrs(id);
    const elapsedTime = startTimer(startTime);
    spinner.succeed(
      `Check completed for ID ${chalk.green(id)} ` +
        chalk`({cyan Time: ${formatTime(elapsedTime)}s})`
    );
    spinner.info(
      `${
        list.length
          ? chalk.bold.red(list.length)
          : chalk.bold.green(list.length)
      } possible ${list.length === 1 ? "duplicate" : "duplicates"} found\n`
    );
    if (list.length) {
      console.log(chalk.bold.red(`${JSON.stringify(list, undefined, 2)}\n`));
    }
    patientList.push(...list);
  }
  return patientList;
}

async function checkForAlreadyExistingPatientInAmrs(patientId: number) {
  const patientData = await loadData(patientId);
  let dupsFreePatientList: Array<PatientComparator> = [];

  if (patientData && Object.keys(patientData).length) {
    const {
      person: { birthdate, gender },
      identifiers,
      names,
    } = patientData;
    const age = calculateAge(birthdate);

    const patientsByIdentifiers = await fetchPatientByIdentifier(identifiers);
    let patientList =
      patientsByIdentifiers.length === 0
        ? [...(await fetchPatientByNames(names))]
        : [...patientsByIdentifiers];

    patientList = filterByAgeAndGender(patientList, gender, age);
    patientList = filterByNames(patientList, names);
    patientList = await filterByEncounterLocation(patientList);

    let combinedPatientList: Array<PatientComparator> = patientList.map(
      (patient) => {
        return {
          amrsNames: patient.person?.display,
          amrsPersonUuid: patient.person?.uuid,
          amrsIdentifiers: getCommaSeparatedIdentifiers(
            getIdentifiers(patient.identifiers)
          ),
          kenyaEMRPersonId: patientId,
          kenyaEMRIdentifiers: getCommaSeparatedIdentifiers(
            getIdentifiers(identifiers)
          ),
          kenyaEMRNames: flattenName(getNames(names)),
        };
      }
    );

    dupsFreePatientList.push(
      ...combinedPatientList.filter(
        (patient, index, patientList) =>
          getIndexOfPatient(patientList, patient) === index
      )
    );
  }

  return dupsFreePatientList;
}

async function fetchPatientByIdentifier(identifiers: Array<any>) {
  let patientIdentifierSearchResults: Array<any> = [];
  for (const identif of identifiers) {
    const identifier = constructCCCIdentifierIfPresent(identif);
    patientIdentifierSearchResults.push(...(await fetchPatientBy(identifier)));
  }
  return patientIdentifierSearchResults;
}

async function fetchPatientByNames(names: Array<any>) {
  let patientSearchResults: Array<any> = [];
  for (const name of names) {
    const { given_name, middle_name, family_name } = name;
    patientSearchResults.push(
      ...(await fetchPatientBy(given_name)),
      ...(await fetchPatientBy(middle_name)),
      ...(await fetchPatientBy(family_name))
    );
  }
  return patientSearchResults;
}

async function fetchPatientBy(query: string): Promise<Array<any>> {
  return new Promise((resolve, reject) => {
    patientSearch(query)
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

function filterByAgeAndGender(
  patientList: Array<any>,
  gender: any,
  age: number
) {
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

function getCommaSeparatedIdentifiers(identifiers: Array<string>): string {
  return identifiers.join();
}

function startTimer(diff?: [number, number]) {
  if (diff) {
    return process.hrtime(diff);
  }
  return process.hrtime();
}

const formatTime = (diff: [number, number]): string => {
  const nanosecondsElapsed =
    (diff[0] * NANOSECS_PER_SEC + diff[1]) / NANOSECS_PER_SEC;
  return nanosecondsElapsed.toFixed(2);
};

const flattenName = (names: Array<string>): string =>
  names.join().replace(",", " ");

const calculateAge = (birthdate: any): number =>
  moment().diff(birthdate, "years");
