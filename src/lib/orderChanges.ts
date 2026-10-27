import type { ChangeEntry, DashboardState, RouteInfo } from "../types/dashboard";
import type { Order } from "../types/order";
import { categoryOf, typeLabel } from "./categories";

/*
 * Order edits and the change log, shared by every page that needs them: the order editor on
 * Bestellingen today, and later e.g. "gewijzigd na inpakken" on Inpakken or warnings in Bakkerij.
 */

/** Fields beheer can edit; the same names the script uses (ORDER_EDIT_FIELDS in Code.gs). */
export type OrderField = "withRaisins" | "withoutRaisins" | "deliveryDate" | "fulfilment" | "deliveryMoment" | "pickupLocation" | "address" | "postalCode" | "city" | "amount" | "type" | "locationName";

export interface OrderFieldChange {
  field: OrderField;
  /** What the editor saw; the script refuses the edit when the order changed in the meantime. */
  from: string;
  to: string;
}

/** The value of a field as text, the way it is compared and logged. */
export function orderFieldValue(order: Order, field: OrderField): string {
  switch (field) {
    case "withRaisins":
      return String(order.withRaisins);
    case "withoutRaisins":
      return String(order.withoutRaisins);
    case "deliveryDate":
      return order.deliveryDate;
    case "fulfilment":
      return order.fulfilment;
    case "deliveryMoment":
      return order.deliveryMoment ?? "";
    case "pickupLocation":
      return order.pickupLocation ?? "";
    case "address":
      return order.address;
    case "postalCode":
      return order.postalCode;
    case "city":
      return order.city;
    case "amount":
      return order.amount === undefined ? "" : String(order.amount);
    case "type":
      return typeLabel[order.customerType];
    case "locationName":
      return order.locationName;
  }
}

/** Dutch names for every field that can appear in the log. */
export const fieldLabel: Record<string, string> = {
  withRaisins: "MET krenten",
  withoutRaisins: "ZONDER krenten",
  deliveryDate: "Leverdatum",
  fulfilment: "Bezorgen of afhalen",
  deliveryMoment: "Bezorgmoment",
  pickupLocation: "Afhaallocatie",
  address: "Adres",
  postalCode: "Postcode",
  city: "Plaats",
  amount: "Bedrag",
  note: "Opmerking",
  packing: "Inpakken",
  courier: "Bezorger",
  type: "Soort",
  locationName: "Naam",
  created: "Aangemaakt",
  soldWithRaisins: "Verkocht MET",
  soldWithoutRaisins: "Verkocht ZONDER",
  soldAmount: "Opbrengst pop-up"
};

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** A logged value for people: dates as "wo 16 dec", money as "€ 160,00", empty as "–". */
export function formatChangeValue(field: string, value: string): string {
  if (!value) return "–";
  if (field === "deliveryDate" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T12:00:00`);
    return `${["zo", "ma", "di", "wo", "do", "vr", "za"][d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  if (field === "fulfilment") return value === "afhalen" ? "Afhalen" : "Bezorgen";
  if ((field === "amount" || field === "soldAmount") && Number.isFinite(Number(value))) return `€ ${Number(value).toFixed(2).replace(".", ",")}`;
  if (field === "type" && value === "Pop-up") return "Pop-upvoorraad";
  return value;
}

/** "2026-12-16 10:12:00" → "16 dec 10:12". */
export function formatChangeTime(at: string): string {
  const m = at.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[4]}:${m[5]}` : at;
}

/** All changes of one order, newest first (the state is already newest first). */
export function changesFor(state: Pick<DashboardState, "changes">, orderId: string): ChangeEntry[] {
  return (state.changes ?? []).filter((c) => c.orderId === orderId);
}

/** Changes after a moment ("2026-12-16 10:00:00"), optionally only some fields. For "changed after packing" and similar. */
export function changesSince(state: Pick<DashboardState, "changes">, since: string, fields?: string[]): ChangeEntry[] {
  return (state.changes ?? []).filter((c) => c.at > since && (!fields || fields.includes(c.field)));
}

/** Fields that change where a route has to go. */
export const ROUTE_FIELDS = ["address", "postalCode", "city", "deliveryDate", "fulfilment", "deliveryMoment"];

/** True when an address, date or delivery choice of a stop changed after the route was calculated. */
export function routeChangedAfter(state: Pick<DashboardState, "changes">, route: RouteInfo | undefined): boolean {
  if (!route?.computedAt) return false;
  const ids = new Set(route.orderIds);
  return (state.changes ?? []).some((c) => ids.has(c.orderId) && ROUTE_FIELDS.includes(c.field) && c.at > route.computedAt);
}

/** Applies edits to an order (demo mode keeps edits separately from the example orders). */
export function applyOrderEdits(order: Order, edits: Partial<Record<OrderField, string>> | undefined): Order {
  if (!edits) return order;
  const next: Order = { ...order };
  for (const [field, value] of Object.entries(edits) as Array<[OrderField, string]>) {
    if (field === "withRaisins") next.withRaisins = Number(value);
    else if (field === "withoutRaisins") next.withoutRaisins = Number(value);
    else if (field === "deliveryDate") next.deliveryDate = value;
    else if (field === "fulfilment") next.fulfilment = value === "afhalen" ? "afhalen" : "bezorgen";
    else if (field === "deliveryMoment") next.deliveryMoment = value || undefined;
    else if (field === "pickupLocation") next.pickupLocation = value || undefined;
    else if (field === "address") next.address = value;
    else if (field === "postalCode") next.postalCode = value;
    else if (field === "city") next.city = value;
    else if (field === "amount") next.amount = value === "" ? undefined : Number(value);
    else if (field === "locationName") next.locationName = value;
    else if (field === "type") {
      next.customerType = /pop.?up/i.test(value) ? "popup" : /barter/i.test(value) ? "barter" : /zakelijk/i.test(value) ? "zakelijk" : value ? "particulier" : "onbekend";
      next.category = categoryOf(next.customerType);
    }
    // Demo only: the Bezorger column cleared when the date moved.
    else if ((field as string) === "supplierName") next.supplierName = value;
  }
  return next;
}
