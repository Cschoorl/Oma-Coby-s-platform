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

export type Transport = "fiets" | "auto";

export interface Volunteer {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  /** Free list like "30 december ochtend, 31 december middag". */
  availability: string[];
  transport: Transport[];
  remark: string;
}

export interface CostEntry {
  id: string;
  createdAt: string;
  createdBy: string;
  date: string;
  amount: number;
  supplier: string;
  description: string;
  photoUrl: string;
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
  mapsUrl: string;
  computedAt: string;
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
  /** Only returned for the beheer role. */
  volunteers: Volunteer[];
  costs: CostEntry[];
  history: HistoryRow[];
  pricePerPiece: number | null;
}

export const emptyMeta: OrderMeta = {
  noteStatus: "nieuw",
  noteOverride: "",
  confirmationText: "",
  confirmationStatus: "geen",
  confirmationSentAt: "",
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
