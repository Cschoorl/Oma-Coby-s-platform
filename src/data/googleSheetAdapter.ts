import type { CustomerType, DeliveryStatus, Order } from "../types/order";

// Schema of the rows as they arrive from Google Sheets via n8n. Sheets often sends
// numbers as strings and leaves cells empty, so every field is treated as loose input.
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
  // Optional columns used by the newer dashboard pages.
  email?: string;
  type_klant?: string;
  bedrag?: number | string;
  besteldatum?: string;
}

type LooseRow = Partial<Record<keyof GoogleSheetOrderRow, unknown>>;

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toCount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStatus(value: unknown): DeliveryStatus {
  const lower = text(value).toLowerCase();
  if (lower === "onderweg") return "onderweg";
  if (lower === "bezorgd" || lower === "geleverd") return "bezorgd";
  return "open";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toCustomerType(value: unknown): CustomerType {
  const lower = text(value).toLowerCase();
  if (!lower) return "onbekend";
  if (/zakelijk|b2b|bedrijf/.test(lower)) return "zakelijk";
  return "particulier";
}

function toAmount(value: unknown): number | undefined {
  const raw = text(value).replace(/[€\s]/g, "");
  if (!raw) return undefined;
  // "1.234,50" (Dutch) and "1234.50" both become 1234.5.
  const normalised = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Accepts YYYY-MM-DD, ISO timestamps and Dutch D-M-YYYY / D/M/YYYY; returns YYYY-MM-DD. */
export function toIsoDate(value: unknown): string {
  const raw = text(value);
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
  const nl = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (nl) return `${nl[3]}-${pad(Number(nl[2]))}-${pad(Number(nl[1]))}`;
  return raw;
}

/** Normalises "9:30", "09.30" and "930" to "HH:MM" so times sort correctly. */
function toTime(value: unknown): string {
  const raw = text(value);
  const match = raw.match(/^(\d{1,2})[:.]?(\d{2})/);
  if (!match) return raw;
  return `${pad(Number(match[1]))}:${match[2]}`;
}

export function mapSheetRowToOrder(row: LooseRow, index = 0): Order {
  const extras = text(row.extra_notities);
  return {
    id: text(row.order_id) || `row-${index + 1}`,
    deliveryDate: toIsoDate(row.leverdatum),
    supplierName: text(row.leverancier_naam) || "Onbekend",
    locationName: text(row.locatie_naam),
    contactPerson: text(row.contactpersoon),
    phone: text(row.telefoon),
    address: text(row.adres),
    postalCode: text(row.postcode),
    city: text(row.plaats),
    plannedTime: toTime(row.geplande_tijd),
    status: toStatus(row.status),
    withRaisins: toCount(row.oliebollen_met_krenten),
    withoutRaisins: toCount(row.oliebollen_zonder_krenten),
    extras: extras || undefined,
    email: text(row.email) || undefined,
    customerType: toCustomerType(row.type_klant),
    amount: toAmount(row.bedrag),
    orderDate: row.besteldatum ? toIsoDate(row.besteldatum) : undefined
  };
}

export function mapSheetRowsToOrders(rows: LooseRow[]): Order[] {
  return rows.map((row, index) => mapSheetRowToOrder(row, index));
}
