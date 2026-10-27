export type DeliveryStatus = "open" | "onderweg" | "bezorgd";

/** Kolom Type in de Sheet. "popup" is extra pop-upvoorraad: meegenomen naar een pop-up, zonder vaste koper. */
export type CustomerType = "particulier" | "zakelijk" | "barter" | "popup" | "onbekend";

/**
 * Soort bestelling, voor filters en tellingen:
 * - regulier: zakelijk en barter (en zonder type), met een vaste koper;
 * - particulier: een particulier met een vaste bestelling;
 * - popup: extra pop-upvoorraad; telt mee voor het bakken, in de omzet alleen wat verkocht is.
 */
export type OrderCategory = "regulier" | "particulier" | "popup";

export type Fulfilment = "bezorgen" | "afhalen";

export interface Order {
  id: string;
  deliveryDate: string;
  supplierName: string;
  locationName: string;
  contactPerson: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  plannedTime: string;
  status: DeliveryStatus;
  withRaisins: number;
  withoutRaisins: number;
  extras?: string;
  /** Optional columns; empty when the sheet does not have them. */
  email?: string;
  customerType: CustomerType;
  /** Follows from customerType (see OrderCategory). */
  category: OrderCategory;
  /** Order amount in euros, when the sheet has it. */
  amount?: number;
  /** Date the order was placed (YYYY-MM-DD); falls back to deliveryDate for the tussenstand. */
  orderDate?: string;
  fulfilment: Fulfilment;
  pickupLocation?: string;
  /** "Ja, doe mij een aantal flyers" etc. */
  flyers?: string;
  /** E.g. "3 dozen" or "2 zakjes". */
  packaging?: string;
  /** E.g. "Amsterdam/Aalsmeer (€10 bezorgkosten)". */
  deliveryArea?: string;
  /** E.g. "tussen 9:00 en 12:30 uur". */
  deliveryMoment?: string;
}
