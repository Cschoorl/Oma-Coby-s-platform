import type { DashboardState, RouteInfo, Volunteer } from "../../types/dashboard";
import { effectiveCourier } from "../../utils/orderUtils";
import type { Order } from "../../types/order";

export function routeKey(date: string, courier: string): string {
  return `${date}|${courier}`;
}

/** Bike when the courier only signed up as fietskoerier (or the old remarks say so); otherwise car. */
export function guessMode(orders: Order[], volunteer?: Volunteer): "driving" | "bicycling" {
  if (volunteer) return volunteer.roles.fietskoerier.wants && !volunteer.roles.autokoerier.wants ? "bicycling" : "driving";
  return orders.some((o) => /fietskoerier:\s*ja/i.test(o.extras ?? "")) ? "bicycling" : "driving";
}

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** "2026-12-18" → "18 december", the way dates appear in the volunteer form. */
export function formDay(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return m && d ? `${d} ${MONTHS[m - 1]}` : isoDate;
}

function mentionsDay(option: string, day: string): boolean {
  const match = option.toLowerCase().match(/(\d{1,2})\s+([a-z]+)/);
  return match ? `${Number(match[1])} ${match[2]}` === day : false;
}

/** Courier volunteers for a day: first who signed up for that day, then the other couriers. */
export function courierCandidates(volunteers: Volunteer[], isoDate: string): { available: Volunteer[]; others: Volunteer[] } {
  const day = formDay(isoDate);
  const couriers = volunteers.filter((v) => v.roles.fietskoerier.wants || v.roles.autokoerier.wants);
  const isAvailable = (v: Volunteer) => [...v.roles.fietskoerier.days, ...v.roles.autokoerier.days].some((o) => mentionsDay(o, day));
  const byName = (a: Volunteer, b: Volunteer) => a.name.localeCompare(b.name);
  return { available: couriers.filter(isAvailable).sort(byName), others: couriers.filter((v) => !isAvailable(v)).sort(byName) };
}

export function findVolunteer(volunteers: Volunteer[], name: string): Volunteer | undefined {
  const key = name.trim().toLowerCase();
  return volunteers.find((v) => v.name.trim().toLowerCase() === key);
}

/** Orders that go out for delivery on a day (pickups excluded). */
export function deliveryOrders(state: DashboardState, date: string): Order[] {
  return state.orders.filter((o) => o.deliveryDate === date && o.fulfilment === "bezorgen");
}

/** Stops in the optimised order when a route was computed, otherwise by planned time. */
export function orderedStops(orders: Order[], route?: RouteInfo): Order[] {
  const byTime = [...orders].sort((a, b) => a.plannedTime.localeCompare(b.plannedTime));
  if (!route) return byTime;
  const rank = new Map(route.orderIds.map((id, i) => [id, i]));
  return byTime.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
}

/** A route is stale when its stops no longer match the orders. */
export function isRouteStale(orders: Order[], route?: RouteInfo): boolean {
  if (!route) return false;
  const ids = new Set(orders.map((o) => o.id));
  return route.orderIds.length !== ids.size || route.orderIds.some((id) => !ids.has(id));
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
