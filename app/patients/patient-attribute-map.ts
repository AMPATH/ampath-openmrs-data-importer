import ConnectionManager from "../connection-manager";
import { fetchPersonAttributeTypes } from "./load-patient-data";

export default class PatientAttributeTypeMapper {
  private static _instance: PatientAttributeTypeMapper;
  private _patientAttributeTypeArray: any;
  private _patientAttributeTypeMap?: PatientAttributeTypeMap;
  private constructor() {}
  static get instance(): PatientAttributeTypeMapper {
    if (!PatientAttributeTypeMapper._instance) {
      PatientAttributeTypeMapper._instance = new PatientAttributeTypeMapper();
    }
    return PatientAttributeTypeMapper._instance;
  }

  async initialize() {
    if (this._patientAttributeTypeArray) {
      return;
    }
    const CM = ConnectionManager.getInstance();
    let kenyaEmrCon = await CM.getConnectionKenyaemr();
    let amrsCon = await CM.getConnectionAmrs();
    // load patient attributes mapping here
    this._patientAttributeTypeArray = [];
    this._patientAttributeTypeMap = {};
    const loadKemrPatientAttributeTypes = await fetchPersonAttributeTypes(
      kenyaEmrCon
    );
    const loadAmrsPatientAttributeTypes = await fetchPersonAttributeTypes(
      amrsCon
    );
    for (const kenctype of loadKemrPatientAttributeTypes) {
      let amrsAttributeTypeID = loadAmrsPatientAttributeTypes.find(
        (enctype) => enctype.uuid === kenctype.uuid
      )?.person_attribute_type_id;
      let kemrAttributeTypeId = kenctype.person_attribute_type_id;
      this._patientAttributeTypeArray.push({
        kemrAttributeTypeId,
        amrsAttributeTypeID,
      });
      if (amrsAttributeTypeID) {
        this._patientAttributeTypeMap[
          kemrAttributeTypeId
        ] = amrsAttributeTypeID;
      }
    }
    console.log("Patient Attribute Type Map", this._patientAttributeTypeMap);
  }

  get encounterTypeMap(): PatientAttributeTypeMap {
    return this._patientAttributeTypeMap || {};
  }

  get encounterTypeArray(): any {
    return this._patientAttributeTypeArray;
  }
}
export type PatientAttributeTypeMap = {
  [kenyaEmrEncounterTypeId: number]: number;
};
