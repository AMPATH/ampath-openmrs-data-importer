import { Connection } from "mysql";
import ConceptMapper from "../concept-map";
import { Obs } from "../tables.types";
import loadPatientObs from "./load-patient-obs";
let path = require("path");

export default class EncounterObsMapper {
  public constructor() {}

  async retrieveobs(patientId: number, connection: Connection) {
    await ConceptMapper.instance.initialize();
    let obss = await loadPatientObs(patientId, connection);
    let mappedObs: any = [];
    for (let i = 0; i < obss.length; i++) {
      const element = obss[i];
      let mapper = await this.mapencounter(element, ConceptMapper.instance);
      if (mapper.encounterTypeUuid) {
        mappedObs.push(mapper);
      }
    }
    const groups = mappedObs.reduce(
      (
        groups: { [x: string]: any },
        item: { obs: { encounter_id: string | number } }
      ) => ({
        ...groups,
        [item.obs.encounter_id]: [
          ...(groups[item.obs.encounter_id] || []),
          item,
        ],
      }),
      {}
    );
    return groups;
  }
  async mapencounter(ob: Obs, d: ConceptMapper) {
    // prepare dictionaries
    let encounterObs: EncounterObs = {};
    // map amrs to kenya emr
    let mappedEmrConcept = d.amrsConceptMap[ob.concept_id];

    if (mappedEmrConcept) {
      let map = d.conceptMap[parseInt(mappedEmrConcept.toString(), 0)];
      if (map) {
        if (ob.encounter_id === null) {
          ob.encounter_id = 0;
          encounterObs.obs = ob;
          encounterObs.encounterTypeUuid = "unknown";
          return encounterObs;
        }
        // allocate the obs to the right kenyaemr encounter
        ob.concept_id = parseInt(map[0]);
        encounterObs.encounterTypeUuid = map[1];
        encounterObs.encounterTypId = map[3];
        encounterObs.formId = map[2];
        ob.concept_id = parseInt(d.amrsConceptMap[ob.concept_id].toString(), 0);
        if (ob.value_coded) {
          ob.value_coded = parseInt(
            d.amrsConceptMap[ob.value_coded].toString(),
            0
          );
        }

        encounterObs.obs = ob;
      } else {
        //doesn't exist in kenya emr forms
        //console.log("Unknown",ob);
      }
    } else {
      // unmapped concepts
      //console.log("Unmapped",ob);
    }
    return encounterObs;
  }
}
export type EncounterObs = {
  encounterTypeUuid?: string;
  encounterTypId?: string;
  formId?: string;
  visitId?: string;
  creator?: string;
  changed_by?: string;
  voided_by?: string;
  obs?: {};
};
