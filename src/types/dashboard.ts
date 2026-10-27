import type { BusinessOrder } from "./business";
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

/**
 * Tasks people can sign up for this season. Fietskoerier no longer takes part; the type keeps it
 * because signups from earlier years (and the sheet columns) still have it.
 */
export const ACTIVE_ROLES: VolunteerRole[] = ["inpakken", "autokoerier", "oliebollenbar"];

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
  /** From the step-by-step signup; empty for rows from the old Google Form. */
  planning?: SignupPlanning;
}

/** How someone signed up: with a task in mind, a day in mind, or "put me where you need me". */
export type SignupMode = "taak" | "dag" | "flexibel";
export type ReminderChannel = "whatsapp" | "mail" | "geen";
/** Bezorgen takes a licence and a car of their own; "rijbewijs" (no car) only appears in older signups. */
export type Driving = "auto" | "rijbewijs";

/** The planning answers of the step-by-step signup, written to their own columns in the sheet. */
export interface SignupPlanning {
  mode: SignupMode;
  /** True: we may also put them on another task or moment where it is busier. */
  flexible: boolean;
  /** At most this many days this season (one shift a day); at most the number of days they chose. */
  maxShifts: number;
  /** Bezorgers only: a driving licence and a car, or a licence without a car of their own. */
  driving?: Driving;
  /** A message 24 hours before each shift. */
  reminder: ReminderChannel;
}

export const maxShiftsLabel = (n: number) => `${n} ${n === 1 ? "dag" : "dagen"}`;
export const drivingLabel: Record<Driving, string> = { auto: "Rijbewijs en auto", rijbewijs: "Rijbewijs, geen auto" };
export const reminderLabel: Record<ReminderChannel, string> = { whatsapp: "WhatsApp", mail: "Mail", geen: "Geen" };

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

/**
 * One line of the change log (tab Wijzigingslog), newest first in the state. Written by the script
 * on every edit of an order, a remark, or a reset of the packing; later features read it too.
 */
export interface ChangeEntry {
  /** "2026-12-16 10:12:00". */
  at: string;
  /** What kind of change: "bestelling", "opmerking", "inpakken", … */
  kind: string;
  orderId: string;
  /** Field on the platform: withRaisins, deliveryDate, address, note, packing, courier, amount, … */
  field: string;
  /** As text; empty for others than beheer when it is a contact detail. */
  from: string;
  to: string;
  by: string;
  /** Why, when the script made it on its own ("aantallen gewijzigd", "opnieuw berekend"). */
  note: string;
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
  /** Zakelijke aanvragen van het bestelformulier; alleen voor beheer. */
  business: BusinessOrder[];
  /** Wijzigingslog, newest first. */
  changes: ChangeEntry[];
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
