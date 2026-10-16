import type { DashboardState, RouteInfo } from "../../types/dashboard";
import type { Order } from "../../types/order";

export function routeKey(date: string, courier: string): string {
  return `${date}|${courier}`;
}

/** Bike couriers are marked as "Fietskoerier: Ja" in the remarks; everyone else drives. */
export function guessMode(orders: Order[]): "driving" | "bicycling" {
  return orders.some((o) => /fietskoerier:\s*ja/i.test(o.extras ?? "")) ? "bicycling" : "driving";
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
  return state.orders.filter((o) => o.deliveryDate === date && o.supplierName === courier);
}

export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("06")) return `31${digits.slice(1)}`;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}
