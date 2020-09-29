// sets up the user map between kenyaemr and amrs

import ConnectionManager from "../connection-manager";
import { fetchProviders } from "./load-provider-data";

export default class ProviderMapper {
  private static _instance: ProviderMapper;
  private _providerArray: any;
  private _providerMap?: ProviderMap;
  private constructor() {}
  static get instance(): ProviderMapper {
    if (!ProviderMapper._instance) {
      ProviderMapper._instance = new ProviderMapper();
    }
    return ProviderMapper._instance;
  }

  async initialize() {
    if (this._providerArray) {
      return;
    }
    const CM = ConnectionManager.getInstance();
    let kenyaEmrCon = await CM.getConnectionKenyaemr();
    let amrsCon = await CM.getConnectionAmrs();
    // load provider mapping here
    this._providerArray = [];
    this._providerMap = {};
    const loadKemrProviders = await fetchProviders(kenyaEmrCon);
    const loadAmrsProviders = await fetchProviders(amrsCon);
    for (const kusers of loadKemrProviders) {
      let amrsUserID = loadAmrsProviders.find(
        (user) => user.uuid === kusers.uuid
      )?.provider_id;
      let kemrUserId = kusers.provider_id;
      this._providerArray.push({ kemrUserId, amrsUserID });
      if (amrsUserID) {
        this._providerMap[kemrUserId] = amrsUserID;
      }
    }
    console.log("Provider Map", this._providerMap);
  }

  get providerMap(): ProviderMap {
    return this._providerMap || {};
  }

  get providerArray(): any {
    return this._providerArray;
  }
}
export type ProviderMap = {
  [kenyaEmrUserId: number]: number;
};
