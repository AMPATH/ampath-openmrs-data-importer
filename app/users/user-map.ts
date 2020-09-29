// sets up the user map between kenyaemr and amrs

import ConnectionManager from "../connection-manager";
import { fetchUsers } from "./load-user-data";

export default class UserMapper {
  private static _instance: UserMapper;
  private _userArray: any;
  private _userMap?: UserMap;
  private constructor() {}
  static get instance(): UserMapper {
    if (!UserMapper._instance) {
      UserMapper._instance = new UserMapper();
    }
    return UserMapper._instance;
  }

  async initialize() {
    if (this._userMap) {
      return;
    }
    this._userMap = {};

    const CM = ConnectionManager.getInstance();
    let kenyaEmrCon = await CM.getConnectionKenyaemr();
    let amrsCon = await CM.getConnectionAmrs();
    // load user mapping here
    this._userArray = [];
    const loadKemrUsers = await fetchUsers(kenyaEmrCon);
    const loadAmrsUsers = await fetchUsers(amrsCon);
    for (const kusers of loadKemrUsers) {
      let amrsUserID = loadAmrsUsers.find((user) => user.uuid === kusers.uuid)
        ?.user_id;
      let kemrUserId = kusers.user_id;
      this._userArray.push({ kemrUserId, amrsUserID });
      if (amrsUserID) {
        this._userMap[kemrUserId] = amrsUserID;
      }
    }
    console.log("User Array", this._userArray);
  }

  get userArray(): any {
    return this._userArray;
  }

  get userMap(): UserMap {
    return this._userMap || {};
  }
}

export type UserMap = {
  [kenyaEmrUserId: number]: number;
};
