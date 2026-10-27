import type { CustomerType, Order, OrderCategory } from "../types/order";
import type { DashboardState } from "../types/dashboard";

/*
 * Soorten bestellingen: regulier, particulier en extra pop-upvoorraad. One place for the rules, so
 * every page (Bestellingen, Inpakken, Tussenstand, Routes) counts them the same way.
 */

export function categoryOf(type: CustomerType): OrderCategory {
  if (type === "popup") return "popup";
  if (type === "particulier") return "particulier";
  return "regulier";
}

export const categoryLabel: Record<OrderCategory, string> = { regulier: "Regulier", particulier: "Particulier", popup: "Pop-upvoorraad" };

/** The value in the column Type of the Sheet, per type. */
export const typeLabel: Record<CustomerType, string> = { zakelijk: "Zakelijk", barter: "Barter", particulier: "Particulier", popup: "Pop-up", onbekend: "" };

/** The types beheer can choose when adding or editing (column Type). */
export const TYPE_CHOICES: Array<{ value: string; label: string }> = [
  { value: "Zakelijk", label: "Zakelijk (regulier)" },
  { value: "Barter", label: "Barter (regulier)" },
  { value: "Particulier", label: "Particulier" },
  { value: "Pop-up", label: "Extra pop-upvoorraad" }
];

/**
 * What an order counts for in the tussenstand and the revenue. Regular and private orders count in
 * full; pop-up stock only for what was sold (and the money taken, if filled in).
 */
export function salesOf(order: Order, state: Pick<DashboardState, "popupSales">, pricePerPiece: number | null): { orders: number; oliebollen: number; revenue: number | null } {
  const pieces = order.withRaisins + order.withoutRaisins;
  if (order.category !== "popup") return { orders: 1, oliebollen: pieces, revenue: order.amount ?? (pricePerPiece ? pieces * pricePerPiece : null) };
  const sold = state.popupSales?.[order.id];
  const soldPieces = sold ? sold.withRaisins + sold.withoutRaisins : 0;
  return { orders: 0, oliebollen: soldPieces, revenue: sold?.amount ?? (pricePerPiece ? soldPieces * pricePerPiece : null) };
}

/** Left of the pop-up stock (not sold yet). */
export function popupLeft(order: Order, state: Pick<DashboardState, "popupSales">): { withRaisins: number; withoutRaisins: number } {
  const sold = state.popupSales?.[order.id];
  return { withRaisins: Math.max(0, order.withRaisins - (sold?.withRaisins ?? 0)), withoutRaisins: Math.max(0, order.withoutRaisins - (sold?.withoutRaisins ?? 0)) };
}
