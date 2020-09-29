// sets up the user map between kenyaemr and amrs

import ConnectionManager from "../connection-manager";
import { loadFormMap, loadEncounterFormsByUuid } from "./load-encounters";

export default class FormMapper {
  private static _instance: FormMapper;
  private _formArray: any;
  private _formMap?: ProviderMap;
  private constructor() {}
  static get instance(): FormMapper {
    if (!FormMapper._instance) {
      FormMapper._instance = new FormMapper();
    }
    return FormMapper._instance;
  }

  async initialize() {
    if (this._formMap) {
      return;
    }
    const CM = ConnectionManager.getInstance();
    let amrsCon = await CM.getConnectionAmrs();
    // load provider mapping here
    this._formArray = [];
    this._formMap = {};
    const loadKemrAmrsMapping = await loadFormMap();
    for (const [key, value] of Object.entries(loadKemrAmrsMapping)) {
      const loadAmrsFormsIdByUuid = await loadEncounterFormsByUuid(
        value,
        amrsCon
      );
      if (loadAmrsFormsIdByUuid?.form_id) {
        this._formMap[parseInt(key, 10)] = loadAmrsFormsIdByUuid?.form_id;
      }
    }

    console.log("Form Map", this._formMap);
  }

  get formMap(): ProviderMap {
    return this._formMap || {};
  }

  get formArray(): any {
    return this._formArray;
  }
}
export type ProviderMap = {
  [kenyaEmrUserId: number]: number;
};
