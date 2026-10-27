import type { ChangeEntry, DashboardState, PackNoteDone } from "../types/dashboard";
import type { Order } from "../types/order";
import { effectiveNote } from "../utils/orderUtils";

/*
 * Inpakken › Opmerkingen: what the packers need to know, one item per
 * - change: one save on one order (all fields changed at that moment), from the change log;
 * - remark: the current remark of an order (with the last change to it, if any).
 * An item is ticked off as processed by its id. A new change has a new time and so a new id:
 * it shows up as a new open item. A changed remark gets a new id too.
 */

/** Fields that matter when packing; confirmations, couriers and amounts do not. */
export const PACKING_FIELDS = [
  "created",
  "type",
  "locationName",
  "withRaisins",
  "withoutRaisins",
  "deliveryDate",
  "fulfilment",
  "deliveryMoment",
  "pickupLocation",
  "address",
  "postalCode",
  "city",
  "packing"
];

export interface PackNoteItem {
  id: string;
  kind: "wijziging" | "opmerking";
  orderId: string;
  order: Order;
  /** When it happened ("2026-12-16 10:12:00"); for a remark the time of its last change, if known. */
  at: string;
  by: string;
  /** Changed fields (kind "wijziging"); for a remark the change that made it, if any. */
  changes: ChangeEntry[];
  /** The remark (kind "opmerking"). */
  text: string;
  done: PackNoteDone | null;
}

/** Short, stable code for a text, so a changed remark becomes a new item. */
export function textCode(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function packNoteItems(state: DashboardState): PackNoteItem[] {
  const orders = new Map(state.orders.map((o) => [o.id, o]));
  const done = state.packNotes ?? {};
  const items: PackNoteItem[] = [];

  // Changes: one item per order and moment (state.changes is newest first).
  const groups = new Map<string, ChangeEntry[]>();
  for (const c of state.changes ?? []) {
    if (!PACKING_FIELDS.includes(c.field) || !orders.has(c.orderId)) continue;
    const id = `wijziging|${c.orderId}|${c.at}`;
    groups.set(id, [...(groups.get(id) ?? []), c]);
  }
  for (const [id, changes] of groups) {
    const first = changes[0];
    items.push({ id, kind: "wijziging", orderId: first.orderId, order: orders.get(first.orderId)!, at: first.at, by: first.by, changes: [...changes].reverse(), text: "", done: done[id] ?? null });
  }

  // Remarks: the version the packers see on the order.
  for (const order of state.orders) {
    const text = effectiveNote(order, state.meta[order.id]);
    if (!text) continue;
    const id = `opmerking|${order.id}|${textCode(text)}`;
    const change = (state.changes ?? []).find((c) => c.orderId === order.id && c.field === "note" && (c.to.trim() || order.extras?.trim()) === text);
    items.push({ id, kind: "opmerking", orderId: order.id, order, at: change?.at ?? "", by: change?.by ?? "", changes: change ? [change] : [], text, done: done[id] ?? null });
  }

  // Newest first; remarks without a known time after the changes, by delivery day.
  return items.sort((a, b) => b.at.localeCompare(a.at) || a.order.deliveryDate.localeCompare(b.order.deliveryDate) || a.orderId.localeCompare(b.orderId));
}

export function openPackNotes(state: DashboardState): number {
  return packNoteItems(state).filter((i) => !i.done).length;
}
