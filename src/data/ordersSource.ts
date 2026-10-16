import { mockOrders } from "./mockOrders";
import { mapSheetRowsToOrders, type GoogleSheetOrderRow } from "./googleSheetAdapter";
import type { Order } from "../types/order";

interface N8nPayloadObject {
  rows?: GoogleSheetOrderRow[];
  orders?: GoogleSheetOrderRow[];
  data?: GoogleSheetOrderRow[];
}

type N8nPayload = GoogleSheetOrderRow[] | N8nPayloadObject;

export type OrdersSource = "live" | "demo" | "demo-fallback";

export interface OrdersResult {
  /** Rows used for the delivery (leveranciers) view. */
  orders: Order[];
  /** All rows, so the agenda also shows inpakken/oliebollenbar shifts. */
  agendaOrders: Order[];
  source: OrdersSource;
  error?: string;
}

function isDeliveryPerson(order: Order): boolean {
  const notes = (order.extras ?? "").toLowerCase();
  return /fietskoerier:\s*ja/.test(notes) || /autokoerier:\s*ja/.test(notes);
}

function extractRows(payload: unknown): GoogleSheetOrderRow[] {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload)) {
    // n8n "Respond to Webhook" with all items often wraps each row as { json: {...} }.
    return payload.map((item) => (item && typeof item === "object" && "json" in item ? item.json : item));
  }
  const obj = payload as N8nPayloadObject;
  if (Array.isArray(obj.rows)) return obj.rows;
  if (Array.isArray(obj.orders)) return obj.orders;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

function fallback(error: string): OrdersResult {
  return { orders: mockOrders, agendaOrders: mockOrders, source: "demo-fallback", error };
}

export async function loadOrders(): Promise<OrdersResult> {
  const webhookUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined)?.trim();
  if (!webhookUrl) return { orders: mockOrders, agendaOrders: mockOrders, source: "demo" };

  try {
    const response = await fetch(webhookUrl, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) return fallback(`Webhook gaf status ${response.status}.`);

    const payload = (await response.json()) as N8nPayload;
    const rows = extractRows(payload);
    if (rows.length === 0) return fallback("Webhook gaf geen rijen terug.");

    const mappedOrders = mapSheetRowsToOrders(rows).filter((order) => order.deliveryDate);
    // Only keep couriers when the sheet marks them; otherwise show every row instead of an empty app.
    const deliveryOnly = mappedOrders.filter(isDeliveryPerson);
    return {
      orders: deliveryOnly.length > 0 ? deliveryOnly : mappedOrders,
      agendaOrders: mappedOrders,
      source: "live"
    };
  } catch (err) {
    return fallback(err instanceof Error ? err.message : "Webhook niet bereikbaar.");
  }
}
