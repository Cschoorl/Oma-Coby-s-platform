import type { DeliveryStatus, Order } from "../types/order";

// Placeholder schema: this matches how rows could arrive from Google Sheets.
export interface GoogleSheetOrderRow {
  order_id: string;
  leverdatum: string;
  leverancier_naam: string;
  locatie_naam: string;
  contactpersoon: string;
  telefoon: string;
  adres: string;
  postcode: string;
  plaats: string;
  geplande_tijd: string;
  status: DeliveryStatus;
  oliebollen_met_krenten: number;
  oliebollen_zonder_krenten: number;
  extra_notities?: string;
}

export function mapSheetRowToOrder(row: GoogleSheetOrderRow): Order {
  return {
    id: row.order_id,
    deliveryDate: row.leverdatum,
    supplierName: row.leverancier_naam,
    locationName: row.locatie_naam,
    contactPerson: row.contactpersoon,
    phone: row.telefoon,
    address: row.adres,
    postalCode: row.postcode,
    city: row.plaats,
    plannedTime: row.geplande_tijd,
    status: row.status,
    withRaisins: row.oliebollen_met_krenten,
    withoutRaisins: row.oliebollen_zonder_krenten,
    extras: row.extra_notities
  };
}

export function mapSheetRowsToOrders(rows: GoogleSheetOrderRow[]): Order[] {
  return rows.map(mapSheetRowToOrder);
}
