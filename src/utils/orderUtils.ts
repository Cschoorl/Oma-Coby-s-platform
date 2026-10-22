import type { OrderMeta } from "../types/dashboard";
import type { DeliveryStatus, Order } from "../types/order";

const KITCHEN_START_ADDRESS = "Aalsmeerderweg 85, Aalsmeer";

export const statusOrder: DeliveryStatus[] = ["open", "onderweg", "bezorgd"];

export const statusLabel: Record<DeliveryStatus, string> = {
  open: "Open",
  onderweg: "Onderweg",
  bezorgd: "Bezorgd"
};

export const statusClasses: Record<DeliveryStatus, string> = {
  open: "bg-oliebol-50 text-oliebol",
  onderweg: "bg-gouwe-100 text-gouwe-ink",
  bezorgd: "bg-kerst-50 text-kerst-ink"
};

export function orderTotal(order: Order): number {
  return order.withRaisins + order.withoutRaisins;
}

export function mapsUrl(order: Order): string {
  const query = encodeURIComponent(orderAddressForMapsQuery(order));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function orderAddress(order: Order): string {
  // The sheet may hold the full address in one cell ("KommaGo, Savannahweg 25, 3542 AW, Utrecht").
  const full = [order.address, `${order.postalCode} ${order.city}`.trim()].map((p) => p.trim()).filter(Boolean).join(", ");
  return full || [order.locationName, order.city].filter(Boolean).join(", ");
}

function orderAddressForMapsQuery(order: Order): string {
  return orderAddress(order);
}

/** Google Maps route from the bakery past the stops, in the order given. */
export function mapsRouteUrlForOrders(orders: Order[]): string | null {
  if (orders.length < 1) return null;

  const sorted = orders;
  const origin = encodeURIComponent(KITCHEN_START_ADDRESS);
  const destination = encodeURIComponent(orderAddress(sorted[sorted.length - 1]));
  const waypoints = sorted
    .slice(0, -1)
    .map((order) => encodeURIComponent(orderAddress(order)))
    .join("|");

  const waypointPart = waypoints.length > 0 ? `&waypoints=${waypoints}` : "";
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointPart}&travelmode=driving`;
}

/** The reviewed remark when beheer edited it, otherwise the remark from the sheet. */
export function effectiveNote(order: Order, meta?: OrderMeta): string {
  return (meta?.noteOverride || order.extras || "").trim();
}

export function stopAddress(order: Order): string {
  return orderAddress(order);
}

/** Courier assigned in the dashboard, else the courier column of the sheet; "" when not assigned yet. */
export function effectiveCourier(order: Order, meta?: OrderMeta): string {
  return (meta?.courier || order.supplierName || "").trim();
}
