import ConnectionManager from "../connection-manager";
import UserMapper from "../users/user-map";
import ConceptMapper, { ConceptMap, FoundConcept } from "../concept-map";
import { Connection } from "mysql";
import { Order } from "../tables.types";
import { PatientData } from "../patients/patient-data";
import toInsertSql from "../prepare-insert-sql";
import { InsertedMap } from "../inserted-map";
import ProviderMapper from "../providers/provider-map";

const CM = ConnectionManager.getInstance();

export default async function savePatientOrders(
  ordersToInsert: Order[],
  patient: PatientData,
  insertMap: InsertedMap,
  connection: Connection
) {
  await ConceptMapper.instance.initialize();
  await UserMapper.instance.initialize();
  await ProviderMapper.instance.initialize();
  let orders = prepareOrders(ordersToInsert, ConceptMapper.instance);
  // console.log(insertMap);
  let map = await saveOrder(
    orders,
    ordersToInsert,
    insertMap.patient,
    insertMap.encounters,
    ProviderMapper.instance.providerMap,
    connection
  );
  insertMap.orders = map;
}

export type OrderMap = {
  [kenyaEmrOrderId: number]: number;
};

export async function saveOrder(
  mappedOrders: Order[],
  sourceOrders: Order[],
  newPatientId: number,
  encounterMap: any,
  providerMap: any,
  connection: Connection
) {
  let orderMap: OrderMap = {};
  let skippedOrderCount = 0;
  for (var i = 0; i < mappedOrders.length; i++) {
    if (mappedOrders[i].comment_to_fulfiller === "invalid") {
      // skip it
      console.warn(
        "skipping order for concept: ",
        sourceOrders[i].concept_id,
        sourceOrders[i].order_reason
      );
      skippedOrderCount++;
      continue;
    }
    const sql = toOrdersInsertStatement(
      mappedOrders[i],
      sourceOrders[i],
      newPatientId,
      UserMapper.instance.userMap,
      encounterMap,
      providerMap
    );
    // console.log('sql', sql);
    const results = await CM.query(sql, connection); // TODO save once encounters are ready
    orderMap[sourceOrders[i].order_id] = results.insertId;
    sourceOrders[i].amrs_order_id = results.insertId;
  }
  console.log(
    "Skipped orders count " + skippedOrderCount + "/" + sourceOrders.length
  );
  return orderMap;
}

export function toOrdersInsertStatement(
  order: Order,
  sourceOrder: Order,
  newPatientId: number,
  userMap: any,
  encounterMap: any,
  providerMap: any
) {
  let replaceColumns = {
    creator: userMap[sourceOrder.creator],
    voided_by: userMap[sourceOrder.voided_by],
    orderer: providerMap[sourceOrder.orderer],
    order_reason: providerMap[sourceOrder.orderer],
    patient_id: newPatientId,
    encounter_id: encounterMap[sourceOrder.encounter_id] || null,
    previous_order_id: null, //TODO replace with previous_version
  };
  return toInsertSql(order, ["order_id"], "orders", replaceColumns);
}

export function prepareOrders(
  ordersToInsert: Order[],
  conceptMap: ConceptMapper
): Order[] {
  // replace concept ids with maps and convert to destination concept values
  // if a missing concept map or unknown data type concept is detected, then throw error
  let orders: Order[] = ordersToInsert.map<Order>(
    (o, i, A): Order => {
      let newOrder: Order = Object.assign({}, o);
      try {
        // TODO, to remove this before moving running in production
        assertOrderConceptsAreMapped(o, conceptMap.conceptMap);
        mapOrderConcept(newOrder, o, conceptMap.conceptMap);
        mapOrderReasonConcept(newOrder, o, conceptMap.conceptMap);
      } catch (err) {
        newOrder.comment_to_fulfiller = "invalid";
      }
      return newOrder;
    }
  );

  return orders;
}

export function assertOrderConceptsAreMapped(
  order: Order,
  conceptMap: ConceptMap
) {
  if (!conceptMap[order.concept_id]) {
    throw new Error(
      "Unmapped concept detected. Concept ID: " + order.concept_id
    );
  }

  if (order.order_reason && !conceptMap[order.order_reason]) {
    throw new Error(
      "Unmapped concept detected. Concept ID: " + order.order_reason
    );
  }
}

export function mapOrderConcept(
  newOrder: Order,
  sourceOrder: Order,
  conceptMap: ConceptMap
) {
  newOrder.concept_id = parseInt(conceptMap[sourceOrder.concept_id].amrs_id);
}

export function mapOrderReasonConcept(
  newOrder: Order,
  sourceOrder: Order,
  conceptMap: ConceptMap
) {
  newOrder.concept_id = parseInt(conceptMap[sourceOrder.concept_id].amrs_id);
}
