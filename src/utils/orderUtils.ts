import type { DeliveryStatus, Order } from "../types/order";

const KITCHEN_START_ADDRESS = "Aalsmeerderweg 85, Aalsmeer";

export const statusOrder: DeliveryStatus[] = ["open", "onderweg", "bezorgd"];

export const statusLabel: Record<DeliveryStatus, string> = {
  open: "Open",
  onderweg: "Onderweg",
  bezorgd: "Bezorgd"
};

export const statusClasses: Record<DeliveryStatus, string> = {
  open: "bg-sky-100 text-sky-800 border border-sky-300",
  onderweg: "bg-amber-100 text-amber-900 border border-amber-300",
  bezorgd: "bg-emerald-100 text-emerald-800 border border-emerald-300"
};

export function orderTotal(order: Order): number {
  return order.withRaisins + order.withoutRaisins;
}

export function mapsUrl(order: Order): string {
  const query = encodeURIComponent(orderAddressForMapsQuery(order));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function orderAddress(order: Order): string {
  // When address/postcode are not filled yet, fall back to something geographisch bruikbaars.
  const fallback = `${order.locationName}, ${order.city}`.trim();
  const full = `${order.address}, ${order.postalCode} ${order.city}`.replace(/\s+/g, " ").trim();
  return full.length > 0 && !/^,? ?$/.test(full) && full !== ","
    ? full
    : fallback;
}

function orderAddressForMapsQuery(order: Order): string {
  return orderAddress(order);
}

export function mapsRouteUrlForOrders(orders: Order[]): string | null {
  if (orders.length < 1) return null;

  const sorted = [...orders].sort((a, b) => a.plannedTime.localeCompare(b.plannedTime));
  const origin = encodeURIComponent(KITCHEN_START_ADDRESS);
  const destination = encodeURIComponent(orderAddress(sorted[sorted.length - 1]));
  const waypoints = sorted
    .slice(0, -1)
    .map((order) => encodeURIComponent(orderAddress(order)))
    .join("|");

  const waypointPart = waypoints.length > 0 ? `&waypoints=${waypoints}` : "";
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointPart}&travelmode=driving`;
}
