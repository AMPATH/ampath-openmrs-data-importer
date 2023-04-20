import { Connection } from "mysql";
import { Provider } from "../tables.types";
import ConnectionManager from "../connection-manager";
import { fetchKemrPersonProviderIds } from "./load-provider-data";
import { InsertedMap } from "../inserted-map";
import UserMap from "../users/user-map";
import toInsertSql from "../prepare-insert-sql";
import { PatientData } from "../patients/patient-data";

const CM = ConnectionManager.getInstance();

export default async function saveProviderData(
  provider: any,
  patient: PatientData,
  insertMap: InsertedMap,
  kemrCon: Connection,
  amrsCon: Connection,
  locationId: any
) {
  const providers = await fetchKemrPersonProviderIds(amrsCon);
  if (
    providers.find((prov: any) => prov.person_id === patient.person.person_id)
  ) {
    console.log("Person is a provider");
    provider.person_id = insertMap.patient;
    return saveProvider(provider[0], amrsCon, insertMap, locationId);
  }
}

export async function saveProvider(
  provider: Provider,
  connection: Connection,
  insertMap: InsertedMap,
  locationId: any
) {
  const userMap = UserMap.instance.userMap;
  let replaceColumns = {};
  if (userMap) {
    replaceColumns = {
      person_id: insertMap.patient,
      location_id: locationId,
      creator: userMap[provider.creator],
      changed_by: provider.changed_by ? userMap[provider.changed_by] : null,
      voided_by: provider.retired ? userMap[provider.retired_by] : null,
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
