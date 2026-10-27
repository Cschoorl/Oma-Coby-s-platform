import type { OrderMeta } from "../types/dashboard";
import type { Order } from "../types/order";

/*
 * Contact on the delivery address. Default: the customer's contact from the order (columns
 * Contactpersoon and Contactpersoon telefoonnummer, or the business request). Beheer can set another
 * one per delivery, with a remark like "bel bij aankomst" (Dashboard_Orders, via the change log).
 */

export interface DeliveryContact {
  name: string;
  phone: string;
  note: string;
  /** Set for this delivery; false = the customer's own contact. */
  custom: boolean;
}

export function deliveryContact(order: Order, meta?: OrderMeta): DeliveryContact {
  const own = meta?.deliveryContact;
  if (own) return { ...own, custom: true };
  return { name: order.contactPerson.trim(), phone: order.phone.trim(), note: "", custom: false };
}

/** "06 12 34 56 78" → "tel:0612345678"; keeps a leading +. */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
}

/** One line for a WhatsApp or print text: "Anna de Vries, 06 12345678 (bel bij aankomst)". */
export function contactText(c: DeliveryContact): string {
  const main = [c.name, c.phone].filter(Boolean).join(", ");
  return main ? `${main}${c.note ? ` (${c.note})` : ""}` : c.note;
}
