import mysql, { Connection } from "mysql";
import { Provider } from "../tables.types";
import ConnectionManager from "../connection-manager";
import { fetchKemrPersonProviderIds } from "./load-provider-data";
import { InsertedMap } from "../inserted-map";
import UserMap from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";

const CM = ConnectionManager.getInstance();

export default async function saveProviderData(
  provider: Provider,
  insertMap: InsertedMap,
  kemrCon: Connection,
  amrsCon: Connection
) {
  const providers = await fetchKemrPersonProviderIds(kemrCon);
  if (providers.find((prov: number) => prov === insertMap.patient)?.person_id) {
    console.log("Person is a provider");
    provider.person_id = insertMap.patient;
    return saveProvider(provider, amrsCon, insertMap);
  }
}

export async function saveProvider(
  provider: Provider,
  connection: Connection,
  insertMap: InsertedMap
) {
  const userMap = UserMap.instance.userMap;
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      creator: userMap[provider.creator],
      changed_by: userMap[provider.changed_by],
      voided_by: userMap[provider.retired_by],
      person_id: insertMap.patient,
    };
  }
  await CM.query(
    toProviderInsertStatement(provider, replaceColumns),
    connection
  );
}

export function toProviderInsertStatement(
  provider: Provider,
  replaceColumns?: any
) {
  return toInsertSql(provider, ["provider_id"], "provider", replaceColumns);
}
