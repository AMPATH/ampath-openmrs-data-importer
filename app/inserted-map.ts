import { ObsMap } from "./encounters/save-obs";
import { OrderMap } from "./encounters/save-orders";

export type InsertedMap = {
  patient: number;
  visits: {
    [kenyaEmrId: number]: number;
  };
  encounters: {
    [kenyaEmrId: number]: number;
  };
  patientPrograms: {
    [kenyaEmrId: number]: number;
  };
  patientIdentifier: {
    [kenyaEmrId: number]: number;
  };
  obs: ObsMap;
  orders: OrderMap;
};
