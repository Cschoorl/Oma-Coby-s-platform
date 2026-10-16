export type DeliveryStatus = "open" | "onderweg" | "bezorgd";

export type CustomerType = "particulier" | "zakelijk" | "barter" | "onbekend";

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
