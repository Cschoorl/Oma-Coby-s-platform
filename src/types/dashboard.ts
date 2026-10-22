import type { Order } from "./order";

export type Role = "beheer" | "inpakker" | "bezorger";

export type NoteStatus = "nieuw" | "beoordeeld";
export type ConfirmationStatus = "geen" | "concept" | "verzonden";

/** Dashboard-only data per order, stored in its own tab so the order sheet stays untouched. */
export interface OrderMeta {
  noteStatus: NoteStatus;
  /** Reviewed/edited remark; when empty the original sheet remark is used. */
  noteOverride: string;
  confirmationText: string;
  confirmationStatus: ConfirmationStatus;
  confirmationSentAt: string;
  /** Courier assigned in the dashboard; overrides a courier column in the sheet. */
  courier: string;
  updatedBy: string;
  updatedAt: string;
}

export type PackingPart = "met" | "zonder" | "totaal";

export interface PackingState {
  claimedBy: string;
  claimedAt: string;
  met: boolean;
  zonder: boolean;
  totaal: boolean;
  packedBy: string;
  packedAt: string;
}

export interface BakedCount {
  withRaisins: number;
  withoutRaisins: number;
}

/** The four roles from the volunteer form, in form order. */
export type VolunteerRole = "inpakken" | "fietskoerier" | "autokoerier" | "oliebollenbar";

export const VOLUNTEER_ROLES: VolunteerRole[] = ["inpakken", "fietskoerier", "autokoerier", "oliebollenbar"];

export const volunteerRoleLabel: Record<VolunteerRole, string> = {
  inpakken: "Inpakken",
  fietskoerier: "Fietskoerier",
  autokoerier: "Autokoerier",
  oliebollenbar: "Oliebollenbar"
};

export interface RoleAvailability {
  wants: boolean;
  /** Options exactly as in the form, e.g. "Vrijdag 19 december: middag". */
  days: string[];
}

/** One row of the volunteer form (tab "Formulierreacties 1"). */
export interface Volunteer {
  id: string;
  createdAt: string;
  name: string;
  city: string;
  /** Contact details (address, phone, e-mail) are only sent to beheer. */
  address: string;
  phone: string;
  email: string;
  roles: Record<VolunteerRole, RoleAvailability>;
  /** Answer to "Kan je een bakfiets lenen van iemand?". */
  cargoBike: boolean;
  remark: string;
}

export type CostStatus = "ingediend" | "goedgekeurd" | "afgekeurd" | "uitbetaald";

export const costStatusLabel: Record<CostStatus, string> = {
  ingediend: "Ingediend",
  goedgekeurd: "Goedgekeurd",
  afgekeurd: "Afgekeurd",
  uitbetaald: "Uitbetaald"
};

export interface CostEntry {
  id: string;
  createdAt: string;
  createdBy: string;
  date: string;
  amount: number;
  supplier: string;
  description: string;
  photoUrl: string;
  /** Account number for the refund; only beheer sees it in full. */
  iban: string;
  status: CostStatus;
  /** Why beheer rejected it. */
  reason: string;
  reviewedBy: string;
  reviewedAt: string;
  paidAt: string;
}

/** A stop marked as delivered by the courier (tab "Bezorgstatus"). */
export interface DeliveryState {
  deliveredBy: string;
  deliveredAt: string;
}

/**
 * One moment volunteers can sign up for (tab "Agenda"): a day, a task and optionally a dagdeel,
 * time and location. The signup options are built from these rows.
 */
export interface AgendaSlot {
  /** YYYY-MM-DD */
  date: string;
  role: VolunteerRole;
  /** "ochtend", "middag", "avond" or "" for the whole day. */
  part: string;
  /** E.g. "7:30–12:00". */
  time: string;
  /** E.g. "Pick-up Schaatsbaan" for the Oliebollenbar. */
  location: string;
  /** People needed; null = the default for the task. */
  needed: number | null;
}

export interface ReceiptFields {
  date: string;
  amount: number | null;
  supplier: string;
  description: string;
}

export interface HistoryRow {
  year: number;
  /** YYYY-MM-DD */
  date: string;
  orders: number;
  oliebollen: number;
  revenue: number | null;
}

export interface RouteInfo {
  key: string;
  date: string;
  courier: string;
  mode: "driving" | "bicycling";
  km: number;
  minutes: number;
  /** Order ids in the optimised driving order. */
  orderIds: string[];
  /** Departure from the bakery (HH:mm) and the expected arrival per stop, same order as orderIds. */
  startTime: string;
  stopTimes: string[];
  mapsUrl: string;
  computedAt: string;
  /** Dagdeel of this trip ("ochtend", "middag", "avond"); "" when the courier has one trip that day. */
  part?: string;
  /** Where the trip ends when not back at the loods (the courier's home after the last trip). */
  endAddress?: string;
}

export interface DashboardState {
  /** Increases on every change; clients poll it to stay in sync. */
  version: number;
  orders: Order[];
  meta: Record<string, OrderMeta>;
  packing: Record<string, PackingState>;
  /** Per leverdag (YYYY-MM-DD). */
  baked: Record<string, BakedCount>;
  routes: Record<string, RouteInfo>;
  /** Everyone gets names and availability; phone, e-mail and remarks only for beheer. */
  volunteers: Volunteer[];
  /** Beheer gets all costs; others only their own (IBAN masked). */
  costs: CostEntry[];
  history: HistoryRow[];
  pricePerPiece: number | null;
  /** Euro per kilometre for the mileage allowance (tab Instellingen, km_vergoeding); null when not set. */
  kmRate: number | null;
  delivery: Record<string, DeliveryState>;
  agenda: AgendaSlot[];
}

export const emptyMeta: OrderMeta = {
  noteStatus: "nieuw",
  noteOverride: "",
  confirmationText: "",
  confirmationStatus: "geen",
  confirmationSentAt: "",
  courier: "",
  updatedBy: "",
  updatedAt: ""
};

export const emptyPacking: PackingState = {
  claimedBy: "",
  claimedAt: "",
  met: false,
  zonder: false,
  totaal: false,
  packedBy: "",
  packedAt: ""
};
