import { mockOrders } from "./mockOrders";
import { mapSheetRowsToOrders, type GoogleSheetOrderRow } from "./googleSheetAdapter";
import type { Order } from "../types/order";

interface N8nPayloadObject {
  rows?: GoogleSheetOrderRow[];
  orders?: GoogleSheetOrderRow[];
  data?: GoogleSheetOrderRow[];
}

type N8nPayload = GoogleSheetOrderRow[] | N8nPayloadObject;

function isDeliveryPerson(order: Order): boolean {
  const notes = (order.extras ?? "").toLowerCase();
  return notes.includes("fietskoerier: ja") || notes.includes("autokoerier: ja");
}

function extractRows(payload: N8nPayload): GoogleSheetOrderRow[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.orders)) return payload.orders;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export async function loadOrders(): Promise<Order[]> {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;
  if (!webhookUrl) return mockOrders;

  try {
    const response = await fetch(webhookUrl, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) return mockOrders;

    const payload = (await response.json()) as N8nPayload;
    const rows = extractRows(payload);
    if (rows.length === 0) return mockOrders;

    const mappedOrders = mapSheetRowsToOrders(rows);
    const deliveryOnly = mappedOrders.filter(isDeliveryPerson);
    return deliveryOnly;
  } catch {
    return mockOrders;
  }
}
