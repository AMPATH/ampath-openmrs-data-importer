import moment from 'moment';

import ConnectionManager from '../connection-manager';
import loadPatientData from '../patients/load-patient-data';
import patientSearch from './patient-search';
import fetchKenyaEmrPersonIDs from './load-kenya-emr-personIds';
import exportRecurrentPatients from './export-recurrent-patients';
import { PatientComparator } from '../types/patient.types';

const connection = ConnectionManager.getInstance();

const findPossiblePatientMatch = async (limit: number) => {
  const personIDs: Array<any> = await fetchKenyaEmrPersonIDs(limit);
  //personIDs.splice(8, 1);
  //const personIDs: Array<any> = [34, 330, 345, 174, 175, 176, 177, 178, 185, 186, 160];
  console.log("PersonsIDs: ", personIDs.length);
  let list: Array<any> = [];

  for (let index = 0; index < personIDs.length; index++) {
    const id = personIDs[index].patient_id;
    console.log("Index: ", index);
    let arr_patientList = await checkForAlreadyExistingPatients(id);
    list.push(...arr_patientList);
  }
  return list;
};

const checkForAlreadyExistingPatients = async (personId: number) => {
  const kenyaEmrConnection = await connection.getConnectionKenyaemr();

  let patient: any = {};
  try {
    patient = await loadPatientData(personId, kenyaEmrConnection);
  } catch (error) {
    console.log("Error: ", error);
  }

  const gender = patient.person.gender;
  const birthdate = patient.person.birthdate;
  const identifiers: Array<any> = patient.identifiers;
  const names = patient.names;
  
  const age = calculateAge(birthdate);

  //let patientList: Array<any> = [];
  const patientListByNames = await fetchPatientByNames(names);
  //console.log("patientListByNames size: ", patientListByNames.length);
  const patientListByIdentifiers = await fetchPatientByIdentifier(identifiers);
  console.log("patientListByIdentifiers size: ", patientListByIdentifiers.length);
  let patientList = [...patientListByNames, ...patientListByIdentifiers]
  //console.log("patientList size: ", patientList.length);

  //Remove duplicates
  patientList = patientList.reduce((unique, patient) => {
      return unique.includes(patient) ? unique : [...unique, patient]
  }, []);

  // Filter by gender and age
  patientList = patientList.filter(e => e.person.gender === gender && calculateAge(e.person.birthdate) === age);
  //console.log("Filtered patientList size: ", patientList.length);

  //Filter by names
  patientList = filterByNames(patientList, names);
  //console.log("Filtered patientList size: ", patientList.length);

  let combinedPatient: Array<PatientComparator> = [];
  for (let index = 0; index < patientList.length; index++) {
    const patient = patientList[index];
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
    (patient, index, patientList) => getIndexOfPatient(patientList, patient) === index
  );
  console.table(dupsFreeCombinedPatientList);
  return dupsFreeCombinedPatientList;
};

const fetchPatientByIdentifier = async (identifiers: Array<any>): Promise<any> => {
  let patientIdentifierSearchResults: Array<any> = [];
  for (let index = 0; index < identifiers.length; index++) {
    const identifier = identifiers[index];
    const identif = constructCCCIdentifier(identifier);
    console.log("identifier: ", identif);
    let arr = await fetchPatient(identif);
    patientIdentifierSearchResults.push(...arr);
  }
  return patientIdentifierSearchResults;
  // return new Promise ((resolve, reject) => {
  //     identifiers.forEach( async (identifier) => {
  //     const identif = constructCCCIdentifier(identifier);
  //     console.log("identifier: ", identif);
  //      let arr = await fetchPatient(identif);
  //         patientIdentifierSearchResults.push(...arr);
  //         if (identifiers[identifiers.length - 1].identifier === identifier.identifier) {
  //             resolve(patientIdentifierSearchResults);
  //         }
  //     })
  // }).catch(err => {console.log("Error fetching patients by identifier", err)});
}

const fetchPatientByNames = async (names: Array<any>): Promise<any> => {
  //console.log("here");
  let patientSearchResults: Array<any> = [];
  for (let index = 0; index < names.length; index++) {
    const name = names[index];
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
  //let patientSearchResults: Array<any> = [];
  // return new Promise((resolve, reject) => {
  //   names.forEach(async (name: any) => {
  //     const patientName = constructPatientName(
  //       name.family_name,
  //       name.given_name,
  //       name.middle_name
  //     );
  //     console.log("patient name: ", patientName);
  //     let f_arr = await fetchPatient(name.family_name);
  //     let m_arr = await fetchPatient(name.middle_name);
  //     let g_arr = await fetchPatient(name.given_name);
  //     patientSearchResults.push(...f_arr, ...m_arr, ...g_arr);

  //     resolve(patientSearchResults);
  //     // const lastName = names[names.length - 1].family_name;
  //     // if (lastName == name.family_name) {
  //     //   resolve(patientSearchResults);
  //     // }
  //   });
  // }).catch((err) => console.log("Error fetching patients by names", err));
};

const fetchPatient = async (name: string): Promise<Array<any>> => {
    return new Promise((resolve, reject) =>  {
        patientSearch(name).then((patients) => {
            resolve(patients.results)
        }).catch((err) => {
            console.log("Error fetching patient with name: " + name, err)
            reject(err)
        });
    });
}

const filterByNames = (patientList: Array<any>, names: Array<any>): Array<any> => {
  const nameCollections: Array<string> = getNames(names);
  return patientList.filter((patient) => {
    return nameCollections.filter( n => patient.person.display.toLowerCase().split(' ').includes(n)).length >= 2;
  });
};

const getNames = (names: Array<any>): Array<string> => {
  let getNames: Array<string> = [];
  names.forEach((name: any) => {
    getNames.push(
      name.middle_name.toLowerCase(),
      name.family_name.toLowerCase(),
      name.given_name.toLowerCase()
    );
  });
  let uniqueNames: Array<string> = [];
  getNames.forEach((name) => {
    if(!uniqueNames.includes(name)){
      uniqueNames.push(name);
    }
  });
  return uniqueNames;
};

const constructCCCIdentifier = (identifier: any) => {
  if (identifier.identifier_type === 5) {
    let ident = identifier.identifier;
    return ident.slice(0, 5) + '-' + ident.slice(5);
  } else {
    return identifier.identifier;
  }
}

const getIndexOfPatient = (patientList:Array<any>, patient:any) => {
  return patientList.findIndex((p) => p.Amrs_person_uuid === patient.Amrs_person_uuid);
}

const getIdentifiers = (identifiers: Array<any>): Array<string> => {
  let identifierList: Array<string> = [];
  identifiers.forEach(identifier => {
      identifierList.push(identifier.identifier);
  });
  return identifierList;
}

const getIdentifersCommaSeparated = (identifiers: Array<string>): string => {
  return identifiers.join();
}

const flatenedName = (names: Array<string>): string => {
    return names.join().replace(',' , ' ');
}

const constructPatientName = (family: string, given: string, middle: string) => {
  return given + " " + family + " " + middle;
};

const calculateAge = (birthdate: any): number => {
    return moment().diff(birthdate, 'years');
}

const init = async () => {
  const data = await findPossiblePatientMatch(20);
  console.table(data);
  exportRecurrentPatients(data);
};

//Entry
init();