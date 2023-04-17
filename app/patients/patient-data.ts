import {
  Person,
  Patient,
  Address,
  PersonName,
  PersonAttribute,
  PatientIdentifier,
  Obs,
  Visit,
  Provider,
  Order,
  Encounter,
  PatientProgram,
} from "../tables.types";

export type PatientData = {
  person: Person;
  patient: Patient;
  address: Address;
  names: PersonName[];
  attributes: PersonAttribute[];
  identifiers: PatientIdentifier[];
  patientPrograms: PatientProgram[];
  obs: Obs[];
  orders: Order[];
  visits: Visit[];
  provider: Provider;
  encounter: Encounter[];
};
