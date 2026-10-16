export type DeliveryStatus = "open" | "onderweg" | "bezorgd";

export type CustomerType = "particulier" | "zakelijk" | "onbekend";

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
}
