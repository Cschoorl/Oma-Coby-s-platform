import type { ChangeEntry, DashboardState, RouteInfo, Volunteer } from "../../types/dashboard";
import { routeChangedAfter } from "../../lib/orderChanges";
import { effectiveCourier } from "../../utils/orderUtils";
import type { Order } from "../../types/order";
import { OPTION_TIMES, PLANNING } from "../../config";

/** One route per courier, day and dagdeel ("rit"); the dagdeel is left out when it is unknown. */
export function routeKey(date: string, courier: string, part = ""): string {
  return part ? `${date}|${courier}|${part}` : `${date}|${courier}`;
}

export const PARTS = ["ochtend", "middag", "avond"] as const;

/** Bike when the courier only signed up as fietskoerier (or the old remarks say so); otherwise car. */
export function guessMode(orders: Order[], volunteer?: Volunteer, isoDate?: string): "driving" | "bicycling" {
  if (volunteer && isoDate) {
    const on = transportOn(volunteer, isoDate);
    if (on.length === 1) return on[0] === "fiets" ? "bicycling" : "driving";
  }
  if (volunteer) return volunteer.roles.fietskoerier.wants && !volunteer.roles.autokoerier.wants ? "bicycling" : "driving";
  return orders.some((o) => /fietskoerier:\s*ja/i.test(o.extras ?? "")) ? "bicycling" : "driving";
}

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** "2026-12-18" → "18 december", the way dates appear in the volunteer form. */
export function formDay(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return m && d ? `${d} ${MONTHS[m - 1]}` : isoDate;
}

export function mentionsDay(option: string, day: string): boolean {
  const match = option.toLowerCase().match(/(\d{1,2})\s+([a-z]+)/);
  return match ? `${Number(match[1])} ${match[2]}` === day : false;
}

/** "ochtend", "middag" or "avond" from the order's time slot ("tussen 9:00 en 12:30") or planned time; "" when unknown. */
export function orderPart(order: Order): string {
  const named = (order.deliveryMoment ?? "").toLowerCase().match(/ochtend|middag|avond/)?.[0];
  if (named) return named;
  const time = (order.deliveryMoment ?? "").match(/(\d{1,2})[:.](\d{2})/) ?? order.plannedTime.match(/^(\d{1,2}):(\d{2})/);
  if (!time) return "";
  const hour = Number(time[1]);
  return hour < 12 ? "ochtend" : hour < 17 ? "middag" : "avond";
}

export function optionPart(option: string): string {
  return option.toLowerCase().match(/:\s*(ochtend|middag|avond)/)?.[1] ?? "";
}

export type Transport = "fiets" | "auto";

/** What a volunteer signed up with on this day (and dagdeel, when known). */
export function transportOn(v: Volunteer, isoDate: string, part = ""): Transport[] {
  const day = formDay(isoDate);
  const fits = (o: string) => mentionsDay(o, day) && (!part || !optionPart(o) || optionPart(o) === part);
  const out: Transport[] = [];
  if (v.roles.fietskoerier.wants && v.roles.fietskoerier.days.some(fits)) out.push("fiets");
  if (v.roles.autokoerier.wants && v.roles.autokoerier.days.some(fits)) out.push("auto");
  return out;
}

/**
 * Courier volunteers for a delivery: first who signed up for that day and dagdeel (when the order
 * has one), then the other couriers.
 */
export function courierCandidates(volunteers: Volunteer[], isoDate: string, part = ""): { available: Volunteer[]; others: Volunteer[] } {
  const couriers = volunteers.filter((v) => v.roles.fietskoerier.wants || v.roles.autokoerier.wants);
  const isAvailable = (v: Volunteer) => transportOn(v, isoDate, part).length > 0;
  const byName = (a: Volunteer, b: Volunteer) => a.name.localeCompare(b.name);
  return { available: couriers.filter(isAvailable).sort(byName), others: couriers.filter((v) => !isAvailable(v)).sort(byName) };
}

export function findVolunteer(volunteers: Volunteer[], name: string): Volunteer | undefined {
  const key = name.trim().toLowerCase();
  return volunteers.find((v) => v.name.trim().toLowerCase() === key);
}

/** Orders that go out for delivery on a day (pickups and pop-up stock excluded). */
export function deliveryOrders(state: DashboardState, date: string): Order[] {
  return state.orders.filter((o) => o.deliveryDate === date && o.fulfilment === "bezorgen" && o.category !== "popup");
}

/** Stops in the optimised order when a route was computed, otherwise by planned time. */
export function orderedStops(orders: Order[], route?: RouteInfo): Order[] {
  const byTime = [...orders].sort((a, b) => a.plannedTime.localeCompare(b.plannedTime));
  if (!route) return byTime;
  const rank = new Map(route.orderIds.map((id, i) => [id, i]));
  return byTime.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
}

/**
 * A route is stale when its stops no longer match the orders, or (with the change log) when an
 * address, date or delivery choice of one of its stops was edited after it was calculated.
 */
export function isRouteStale(orders: Order[], route?: RouteInfo, changes?: ChangeEntry[]): boolean {
  if (!route) return false;
  const ids = new Set(orders.map((o) => o.id));
  if (route.orderIds.length !== ids.size || route.orderIds.some((id) => !ids.has(id))) return true;
  return changes ? routeChangedAfter({ changes }, route) : false;
}

export function courierOrders(state: DashboardState, date: string, courier: string): Order[] {
  return deliveryOrders(state, date).filter((o) => effectiveCourier(o, state.meta[o.id]) === courier);
}

export function couriersOn(state: DashboardState, date: string): string[] {
  return Array.from(new Set(deliveryOrders(state, date).map((o) => effectiveCourier(o, state.meta[o.id])).filter(Boolean))).sort();
}

export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("06")) return `31${digits.slice(1)}`;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

export interface Run {
  /** "ochtend", "middag", "avond" or "" (no dagdeel known). */
  part: string;
  orders: Order[];
}

/**
 * A courier's trips on a day: one per dagdeel. An order belongs to the trip whose computed route
 * has it (the planner may put an order without time slot in the afternoon), otherwise to the
 * dagdeel of its time slot; orders without either ride along with the first trip.
 */
export function courierRuns(state: DashboardState, date: string, courier: string): Run[] {
  const orders = courierOrders(state, date, courier);
  const routes = Object.values(state.routes).filter((r) => r.date === date && r.courier === courier);
  const partOf = (o: Order) => routes.find((r) => r.orderIds.includes(o.id))?.part || orderPart(o);
  const parts = PARTS.filter((p) => orders.some((o) => partOf(o) === p));
  if (parts.length === 0) return orders.length ? [{ part: "", orders }] : [];
  return parts.map((part, i) => ({ part, orders: orders.filter((o) => partOf(o) === part || (i === 0 && !PARTS.includes(partOf(o) as (typeof PARTS)[number]))) }));
}

/** The computed route of a trip: by its key, else the route that has its stops (also routes saved before trips had a dagdeel). */
export function runRoute(state: DashboardState, date: string, courier: string, run: Run, single: boolean): RouteInfo | undefined {
  const direct = state.routes[routeKey(date, courier, run.part)] ?? (single ? state.routes[routeKey(date, courier)] : undefined);
  if (direct) return direct;
  const ids = new Set(run.orders.map((o) => o.id));
  return Object.values(state.routes).find((r) => r.date === date && r.courier === courier && r.orderIds.some((id) => ids.has(id)));
}

/** Home address for routing ("Dorpsstraat 1, Aalsmeer"); "" when the volunteer gave none. */
export function homeAddress(v?: Volunteer): string {
  if (!v) return "";
  return [v.address.trim(), v.city.trim()].filter(Boolean).join(", ");
}

export interface Availability {
  part: string;
  transport: Transport[];
  /** Working window in minutes after midnight. */
  start: number;
  end: number;
}

export function toMinutes(hhmm: string): number {
  const m = hhmm.match(/^(\d{1,2})[:.](\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

export function toHhmm(minutes: number): string {
  const t = Math.round(minutes);
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Window of a signup option: the Agenda time ("09:00–12:00") when set, else the default for the dagdeel. */
function optionWindow(option: string, part: string): [number, number] {
  const time = OPTION_TIMES[option.trim().toLowerCase()] ?? "";
  const m = time.match(/(\d{1,2}[:.]\d{2})\s*[–-]\s*(\d{1,2}[:.]\d{2})/);
  if (m) return [toMinutes(m[1]), toMinutes(m[2])];
  const [a, b] = PLANNING.partWindows[part] ?? PLANNING.partWindows[""];
  return [toMinutes(time) || toMinutes(a), toMinutes(b)];
}

/** Dagdelen a courier signed up for on a day, with bike and/or car and the working window. */
export function courierAvailability(v: Volunteer, isoDate: string): Availability[] {
  const day = formDay(isoDate);
  const byPart = new Map<string, Availability>();
  const add = (option: string, kind: Transport) => {
    if (!mentionsDay(option, day)) return;
    const part = optionPart(option);
    const [start, end] = optionWindow(option, part);
    const slot = byPart.get(part) ?? { part, transport: [], start, end };
    if (!slot.transport.includes(kind)) slot.transport.push(kind);
    slot.start = Math.min(slot.start, start);
    slot.end = Math.max(slot.end, end);
    byPart.set(part, slot);
  };
  if (v.roles.fietskoerier.wants) v.roles.fietskoerier.days.forEach((o) => add(o, "fiets"));
  if (v.roles.autokoerier.wants) v.roles.autokoerier.days.forEach((o) => add(o, "auto"));
  return Array.from(byPart.values()).sort((a, b) => a.start - b.start);
}

/** Time window of an order from "tussen 9:00 en 12:30", "vóór 10:00", "na 14:00" or the planned time. */
export function orderWindow(order: Order): [number, number] {
  const text = (order.deliveryMoment ?? "").toLowerCase();
  const times = Array.from(text.matchAll(/(\d{1,2})[:.](\d{2})/g)).map((m) => Number(m[1]) * 60 + Number(m[2]));
  if (/v[oó]{2}r/.test(text) && times.length) return [0, times[0]];
  if (/\bna\b|vanaf/.test(text) && times.length) return [times[0], 24 * 60];
  if (times.length >= 2) return [times[0], times[1]];
  const planned = toMinutes(order.plannedTime);
  if (!Number.isNaN(planned)) return [planned - 30, planned + 30];
  return [0, 24 * 60];
}
