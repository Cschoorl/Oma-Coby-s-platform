import type {
  AgendaSlot,
  BakedCount,
  ChangeEntry,
  CostEntry,
  CostStatus,
  DeliveryState,
  DashboardState,
  OrderMeta,
  PackingPart,
  PackingState,
  ReceiptFields,
  Role,
  RoleAvailability,
  RouteInfo,
  SignupPlanning,
  Volunteer,
  VolunteerRole
} from "../types/dashboard";
import { emptyMeta, emptyPacking } from "../types/dashboard";
import type { Order } from "../types/order";
import type { BusinessInfo, BusinessOrder, BusinessOrderInput, BusinessStatus } from "../types/business";
import { BUSINESS_DEFAULTS } from "../config";
import { businessToOrder, businessTotals, momentLabel, validateBusiness } from "../features/business/business";
import { mapSheetRowsToOrders } from "./googleSheetAdapter";
import { loadOrders } from "./ordersSource";
import { applyOrderEdits, orderFieldValue, type OrderField, type OrderFieldChange } from "../lib/orderChanges";

export interface Session {
  code: string;
  role: Role;
  name: string;
}

export interface RouteRequest {
  date: string;
  courier: string;
  mode: "driving" | "bicycling";
  /** Departure from the bakery, HH:mm. */
  startTime: string;
  stops: Array<{ orderId: string; address: string }>;
  /** Dagdeel of the trip; part of the route key when set. */
  part?: string;
  /** End of the trip when not back at the loods (the courier's home). */
  endAddress?: string;
  /** Minutes per stop for the arrival times. */
  minutesPerStop?: number;
}

/** What the script answers after a change: the data version that includes it. */
export interface SavedVersion {
  version: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  /** The loods, where every trip starts. */
  start: { address: string; point: GeoPoint | null };
  points: Record<string, GeoPoint | null>;
}

export interface VolunteerSignup {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  roles: Record<VolunteerRole, RoleAvailability>;
  cargoBike: boolean;
  remark: string;
  consent: boolean;
  planning?: SignupPlanning;
}

export interface ReceiptResult {
  fields: ReceiptFields;
  photoUrl: string;
  warning: string;
}

/** Signups per role per form option (lowercased), without names. */
export type SignupCounts = Record<VolunteerRole, Record<string, number>>;

/** What the public signup page needs: counts per option (no names) and the agenda. */
export interface SignupInfo {
  counts: SignupCounts;
  agenda: AgendaSlot[];
}

export interface CostInput {
  date: string;
  amount: number;
  supplier: string;
  description: string;
  photoUrl: string;
  iban: string;
}

export interface AnonymizeResult {
  volunteers: number;
  orders: number;
  costs: number;
  receipts: number;
}

export interface Backend {
  kind: "apps-script" | "demo";
  /** Why demo data is shown, when relevant. */
  notice?: string;
  login(code: string): Promise<Role>;
  getVersion(session: Session): Promise<number>;
  /** With `since`: null when nothing changed after that version (one small request instead of two). */
  getState(session: Session, since?: number): Promise<DashboardState | null>;
  claim(session: Session, orderId: string): Promise<SavedVersion | void>;
  release(session: Session, orderId: string): Promise<SavedVersion | void>;
  checkPart(session: Session, orderId: string, part: PackingPart, done: boolean): Promise<SavedVersion | void>;
  complete(session: Session, orderId: string): Promise<SavedVersion | void>;
  reopen(session: Session, orderId: string): Promise<SavedVersion | void>;
  getSignupInfo(): Promise<SignupInfo>;
  setBaked(session: Session, date: string, counts: BakedCount): Promise<void>;
  updateNote(session: Session, orderId: string, note: string, reviewed: boolean): Promise<void>;
  saveConfirmation(session: Session, orderId: string, text: string): Promise<void>;
  sendConfirmation(session: Session, orderId: string, subject: string, text: string): Promise<void>;
  assignCourier(session: Session, orderId: string, courier: string): Promise<void>;
  /** Beheer edits an order: written in the Sheet and in the change log. */
  updateOrder(session: Session, orderId: string, changes: OrderFieldChange[]): Promise<SavedVersion | void>;
  /** Several assignments in one go (automatic planning). */
  assignCouriers(session: Session, assignments: Array<{ orderId: string; courier: string }>): Promise<void>;
  /** Coordinates of addresses (cached in the Sheet), for the automatic planning. */
  geocode(session: Session, addresses: string[]): Promise<GeocodeResult>;
  computeRoute(session: Session, request: RouteRequest): Promise<RouteInfo>;
  registerVolunteer(signup: VolunteerSignup): Promise<void>;
  extractReceipt(session: Session, imageBase64: string, mediaType: string): Promise<ReceiptResult>;
  saveCost(session: Session, cost: CostInput): Promise<void>;
  setDelivered(session: Session, orderId: string, delivered: boolean): Promise<SavedVersion | void>;
  reviewCost(session: Session, id: string, status: Exclude<CostStatus, "uitbetaald">, reason: string): Promise<void>;
  payCost(session: Session, id: string, paid: boolean, date: string): Promise<void>;
  /** After the action: removes names, contact details and IBANs. */
  anonymize(session: Session, confirm: string): Promise<AnonymizeResult>;
  /** Prices and days for the public order form (#/bestellen). */
  getBusinessInfo(): Promise<BusinessInfo>;
  /** Public: saves the request, mails a copy and returns the order number ("Z26-0001"). */
  submitBusinessOrder(input: BusinessOrderInput & { website?: string }): Promise<{ id: string; warning?: string }>;
  setBusinessStatus(session: Session, id: string, status: BusinessStatus, reason: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Apps Script backend

interface RawState extends Omit<DashboardState, "orders"> {
  rows: Record<string, unknown>[];
}

function createAppsScriptBackend(url: string): Backend {
  async function call<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    const json = JSON.stringify({ action, ...payload });
    // Small requests go as GET (?p=...): a GET survives Google's redirects, a POST may arrive as an
    // empty GET. Large ones (receipt photos, long confirmation texts) need POST.
    const getUrl = `${url}${url.includes("?") ? "&" : "?"}p=${encodeURIComponent(json)}`;
    let response: Response;
    try {
      response =
        getUrl.length <= 1800
          ? await fetch(getUrl)
          : // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight.
            await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: json });
    } catch {
      throw new Error("Geen verbinding met de Google Sheet. Controleer je internet en of de web-app op toegang \"Iedereen\" staat.");
    }
    if (!response.ok) throw new Error(`De Google Sheet gaf een fout (${response.status}).`);
    let body: { ok: boolean; data?: T; error?: string; message?: string };
    try {
      body = await response.json();
    } catch {
      throw new Error("De Google Sheet gaf geen geldig antwoord. Staat het script goed in Apps Script en is het opnieuw geïmplementeerd?");
    }
    if (!body.ok) throw new Error(body.error ?? "Onbekende fout.");
    if (body.data === undefined) {
      // Only the bare GET answer has no data: the request arrived without its content.
      throw new Error("Het script kreeg het verzoek niet goed binnen. Plak de nieuwste Code.gs in Apps Script en kies Implementeren → Implementaties beheren → Nieuwe versie.");
    }
    return body.data;
  }

  const withSession = (session: Session, extra: Record<string, unknown> = {}) => ({
    code: session.code,
    name: session.name,
    ...extra
  });

  return {
    kind: "apps-script",
    async login(code) {
      const data = await call<{ role: Role }>("login", { code });
      return data.role;
    },
    async getVersion(session) {
      const data = await call<{ version: number }>("version", withSession(session));
      return data.version;
    },
    async getState(session, since) {
      const raw = await call<RawState | { unchanged: true; version: number }>("state", withSession(session, since ? { since } : {}));
      if ("unchanged" in raw) return null;
      const { rows, ...rest } = raw;
      // Older scripts lack the newer fields; fill them so the pages never see undefined.
      return {
        ...rest,
        delivery: rest.delivery ?? {},
        agenda: rest.agenda ?? [],
        kmRate: rest.kmRate ?? null,
        costs: (rest.costs ?? []).map(withCostDefaults),
        routes: Object.fromEntries(Object.entries(rest.routes ?? {}).map(([k, r]) => [k, { ...r, startTime: r.startTime ?? "", stopTimes: r.stopTimes ?? [] }])),
        business: rest.business ?? [],
        changes: rest.changes ?? [],
        orders: mapSheetRowsToOrders(rows).filter((order) => order.deliveryDate)
      };
    },
    async claim(session, orderId) {
      return call<SavedVersion>("claim", withSession(session, { orderId }));
    },
    async release(session, orderId) {
      return call<SavedVersion>("release", withSession(session, { orderId }));
    },
    async checkPart(session, orderId, part, done) {
      return call<SavedVersion>("checkPart", withSession(session, { orderId, part, done }));
    },
    async complete(session, orderId) {
      return call<SavedVersion>("complete", withSession(session, { orderId }));
    },
    async reopen(session, orderId) {
      return call<SavedVersion>("reopen", withSession(session, { orderId }));
    },
    async getSignupInfo() {
      const data = await call<{ counts: SignupCounts; agenda?: AgendaSlot[] }>("signupStats", {});
      return { counts: data.counts, agenda: data.agenda ?? [] };
    },
    async setBaked(session, date, counts) {
      await call("setBaked", withSession(session, { date, ...counts }));
    },
    async updateNote(session, orderId, note, reviewed) {
      await call("updateNote", withSession(session, { orderId, note, reviewed }));
    },
    async saveConfirmation(session, orderId, text) {
      await call("saveConfirmation", withSession(session, { orderId, text }));
    },
    async sendConfirmation(session, orderId, subject, text) {
      await call("sendConfirmation", withSession(session, { orderId, subject, text }));
    },
    async assignCourier(session, orderId, courier) {
      await call("assignCourier", withSession(session, { orderId, courier }));
    },
    async assignCouriers(session, assignments) {
      await call("assignCouriers", withSession(session, { assignments }));
    },
    async updateOrder(session, orderId, changes) {
      return call<SavedVersion>("updateOrder", withSession(session, { orderId, changes }));
    },
    async geocode(session, addresses) {
      return call<GeocodeResult>("geocode", withSession(session, { addresses }));
    },
    async computeRoute(session, request) {
      return call<RouteInfo>("computeRoute", withSession(session, { ...request }));
    },
    async registerVolunteer(signup) {
      await call("registerVolunteer", { ...signup });
    },
    async extractReceipt(session, imageBase64, mediaType) {
      return call<ReceiptResult>("extractReceipt", withSession(session, { imageBase64, mediaType }));
    },
    async saveCost(session, cost) {
      await call("saveCost", withSession(session, { ...cost }));
    },
    async setDelivered(session, orderId, delivered) {
      return call<SavedVersion>("setDelivered", withSession(session, { orderId, delivered }));
    },
    async reviewCost(session, id, status, reason) {
      await call("reviewCost", withSession(session, { id, status, reason }));
    },
    async payCost(session, id, paid, date) {
      await call("payCost", withSession(session, { id, paid, date }));
    },
    async anonymize(session, confirm) {
      return call<AnonymizeResult>("anonymize", withSession(session, { confirm }));
    },
    async getBusinessInfo() {
      // An older script without businessInfo: the form still works with the defaults from config.ts.
      try {
        return { ...BUSINESS_DEFAULTS, ...(await call<Partial<BusinessInfo>>("businessInfo", {})) };
      } catch {
        return BUSINESS_DEFAULTS;
      }
    },
    async submitBusinessOrder(input) {
      return call<{ id: string; warning?: string }>("submitBusinessOrder", { ...input });
    },
    async setBusinessStatus(session, id, status, reason) {
      await call("setBusinessStatus", withSession(session, { id, status, reason }));
    }
  };
}

function withCostDefaults(c: Partial<CostEntry>): CostEntry {
  return {
    id: c.id ?? "",
    createdAt: c.createdAt ?? "",
    createdBy: c.createdBy ?? "",
    date: c.date ?? "",
    amount: c.amount ?? 0,
    supplier: c.supplier ?? "",
    description: c.description ?? "",
    photoUrl: c.photoUrl ?? "",
    iban: c.iban ?? "",
    status: c.status ?? "ingediend",
    reason: c.reason ?? "",
    reviewedBy: c.reviewedBy ?? "",
    reviewedAt: c.reviewedAt ?? "",
    paidAt: c.paidAt ?? ""
  };
}

/** Same check as the Apps Script: two letters, two digits, then 8-30 letters or digits. */
export function normaliseIban(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isValidIban(value: string): boolean {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(normaliseIban(value));
}

// ---------------------------------------------------------------------------
// Demo backend: same rules as the Apps Script, stored in this browser only.

export const DEMO_CODES: Record<Role, string> = { beheer: "beheer", inpakker: "inpak", bezorger: "bezorg" };

const DEMO_KEY = "omacoby-demo-v5";

interface DemoStore {
  version: number;
  meta: Record<string, OrderMeta>;
  packing: Record<string, PackingState>;
  baked: Record<string, BakedCount>;
  routes: Record<string, RouteInfo>;
  volunteers: Volunteer[];
  costs: CostEntry[];
  delivery: Record<string, DeliveryState>;
  business: BusinessOrder[];
  /** Edits of the example orders, per order and field. */
  orderEdits: Record<string, Partial<Record<OrderField, string>>>;
  changes: ChangeEntry[];
}

const none: RoleAvailability = { wants: false, days: [] };

/** Fictitious volunteers so the agenda and routes have something to show in demo mode. */
function demoVolunteers(): Volunteer[] {
  const base = { city: "Aalsmeer", address: "", cargoBike: false, remark: "", createdAt: "2026-10-01 10:00:00" };
  return [
    {
      ...base,
      id: "demo-1",
      name: "Bezorger Anna",
      address: "Dorpsstraat 5",
      city: "Aalsmeer",
      phone: "0600000001",
      email: "anna@example.nl",
      cargoBike: true,
      roles: { inpakken: none, fietskoerier: { wants: true, days: ["Woensdag 30 december: ochtend", "Donderdag 31 december: ochtend"] }, autokoerier: none, oliebollenbar: none }
    },
    {
      ...base,
      id: "demo-2",
      name: "Bezorger Bram",
      address: "Kostverlorenhof 3",
      city: "Amstelveen",
      phone: "0600000002",
      email: "",
      roles: { inpakken: { wants: true, days: ["Dinsdag 29 december"] }, fietskoerier: none, autokoerier: { wants: true, days: ["Woensdag 30 december: middag"] }, oliebollenbar: none }
    },
    {
      ...base,
      id: "demo-3",
      name: "Bezorger Chris",
      address: "Zijdstraat 20",
      city: "Aalsmeer",
      phone: "0600000003",
      email: "chris@example.nl",
      remark: "Liefst samen met Bram",
      roles: { inpakken: none, fietskoerier: none, autokoerier: { wants: true, days: ["Donderdag 31 december: middag"] }, oliebollenbar: { wants: true, days: ["Woensdag 30 december"] } }
    },
    ...DEMO_HELPERS.map(([name, inpakken, auto, bar, planning], i): Volunteer => ({
      ...base,
      id: `demo-${i + 4}`,
      name,
      phone: `06000000${String(i + 10).padStart(2, "0")}`,
      email: `${name.split(" ")[0].toLowerCase()}@example.nl`,
      remark: i === 2 ? "Op de 24e pas vanaf 9 uur." : "",
      roles: {
        inpakken: inpakken.length ? { wants: true, days: inpakken.map((d) => demoDay(d)) } : none,
        fietskoerier: none,
        autokoerier: auto.length ? { wants: true, days: auto.map((d) => `${demoDay(d)}: ochtend`) } : none,
        oliebollenbar: bar.length ? { wants: true, days: bar.map((d) => demoDay(d)) } : none
      },
      planning
    }))
  ];
}

/** "Dinsdag 15 december" for a December day of the demo season. */
function demoDay(day: number): string {
  const names = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
  return `${names[new Date(2026, 11, day, 12).getDay()]} ${day} december`;
}

/** Name, inpak days, bezorg days, bar days and planning answers, so the overviews have something to show. */
const DEMO_HELPERS: Array<[string, number[], number[], number[], Volunteer["planning"]]> = [
  ["Ria de Vries", [15, 16, 17, 22, 23], [], [], { mode: "taak", flexible: true, maxShifts: 4, reminder: "whatsapp" }],
  ["Henk de Boer", [], [18, 19, 21, 22, 23, 24], [], { mode: "taak", flexible: false, maxShifts: 3, driving: "auto", reminder: "whatsapp" }],
  ["Fatima El Amrani", [23, 24, 30, 31], [], [27, 28], { mode: "dag", flexible: true, maxShifts: 4, reminder: "mail" }],
  ["Truus Dekker", [15, 16, 17, 18, 19, 20, 21, 22, 23, 24], [], [], { mode: "flexibel", flexible: true, maxShifts: 6, reminder: "whatsapp" }],
  ["Ahmed Yilmaz", [], [22, 23, 24, 29, 30, 31], [], { mode: "taak", flexible: true, maxShifts: 4, driving: "auto", reminder: "whatsapp" }],
  ["Sanne Mulder", [19, 20], [], [19, 20, 27], { mode: "dag", flexible: true, maxShifts: 3, reminder: "geen" }],
  ["Kees Smit", [29, 30, 31], [29, 30, 31], [], { mode: "dag", flexible: true, maxShifts: 2, driving: "rijbewijs", reminder: "mail" }],
  ["Lotte Bos", [], [], [20, 21, 27, 28], { mode: "taak", flexible: false, maxShifts: 3, reminder: "whatsapp" }],
  ["Noor Kaya", [22, 23, 24], [], [], { mode: "taak", flexible: true, maxShifts: 3, reminder: "whatsapp" }],
  ["Wim Peters", [], [15, 16, 17, 18], [], { mode: "taak", flexible: false, maxShifts: 4, driving: "auto", reminder: "geen" }],
  ["Ineke Vos", [30, 31], [], [30], { mode: "dag", flexible: true, maxShifts: 2, reminder: "whatsapp" }],
  ["Jan Bakker", [15, 22, 29], [15, 22, 29], [], { mode: "flexibel", flexible: true, maxShifts: 3, driving: "auto", reminder: "mail" }]
];

function emptyStore(): DemoStore {
  return { version: 1, meta: {}, packing: {}, baked: {}, routes: {}, volunteers: demoVolunteers(), costs: [], delivery: {}, business: demoBusiness(), orderEdits: {}, changes: [] };
}

function readStore(): DemoStore {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? { ...emptyStore(), ...(JSON.parse(raw) as DemoStore) } : emptyStore();
  } catch {
    return emptyStore();
  }
}

function writeStore(store: DemoStore) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(store));
  } catch {
    // Private mode: changes only live until reload.
  }
}

/** Fictitious requests from the order form, so the Zakelijk page has something to show. */
function demoBusiness(): BusinessOrder[] {
  const base: BusinessOrderInput = {
    withRaisins: 0, withoutRaisins: 0, donation: 0, flyers: false, fulfilment: "bezorgen", area: "regio", moment: "regulier", date: "",
    pickupAgreed: false, street: "", postalCode: "", city: "", company: "", contact: "", phone: "", email: "", invoiceEmail: "",
    invoiceAddress: "", reference: "", remark: ""
  };
  const rows: Array<[string, string, BusinessOrder["status"], Partial<BusinessOrderInput>]> = [
    ["Z26-0001", "2026-10-19 09:12:00", "bevestigd", { company: "Bloemenveiling Noord", contact: "Petra Jansen", withRaisins: 150, withoutRaisins: 100, donation: 50, flyers: true, date: "2026-12-18", street: "Legmeerdijk 313", postalCode: "1431 GB", city: "Aalsmeer", moment: "voor10", reference: "PO-88412" }],
    ["Z26-0002", "2026-10-22 14:40:00", "nieuw", { company: "Studio Grachtengordel", contact: "Daan Visser", withRaisins: 40, withoutRaisins: 30, date: "2026-12-22", street: "Keizersgracht 210", postalCode: "1016 DZ", city: "Amsterdam", remark: "Graag bij de achteringang aanbellen, de voordeur is dicht in de ochtend." }],
    ["Z26-0003", "2026-10-24 11:05:00", "nieuw", { company: "Tuincentrum De Linde", contact: "Mieke de Graaf", withRaisins: 1000, withoutRaisins: 800, donation: 100, date: "2026-12-30", fulfilment: "afhalen", area: "", pickupAgreed: true, invoiceAddress: "Postbus 12, 2100 AA Heemstede" }],
    ["Z26-0004", "2026-10-25 16:30:00", "afgewezen", { company: "Sportschool Fit", contact: "Rick Bos", withRaisins: 0, withoutRaisins: 60, date: "2026-12-24", street: "Stationsweg 4", postalCode: "3811 MP", city: "Amersfoort", area: "buiten" }]
  ];
  return rows.map(([id, createdAt, status, extra]) => {
    const input = { ...base, ...extra };
    input.email ||= `${input.contact.split(" ")[0].toLowerCase()}@example.nl`;
    input.invoiceEmail ||= input.email;
    input.phone ||= "0612345678";
    return {
      ...input, id, createdAt, status, totals: businessTotals(input, BUSINESS_DEFAULTS),
      reason: status === "afgewezen" ? "24 december bezorgen we niet; dag voorgesteld per mail." : "",
      handledBy: status === "nieuw" ? "" : "Mark", handledAt: status === "nieuw" ? "" : "2026-10-25 17:02:00"
    };
  });
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function demoHistory() {
  // Two fictitious earlier seasons (orders from 1 October to 31 December) so the tussenstand has something to compare.
  const rows: DashboardState["history"] = [];
  [2024, 2025].forEach((year, yi) => {
    for (let day = new Date(year, 9, 1, 12); day <= new Date(year, 11, 31, 12); day.setDate(day.getDate() + 1)) {
      const progress = (day.getTime() - new Date(year, 9, 1, 12).getTime()) / (92 * 86400000);
      // Few orders early on, a steep rise in the last weeks of December.
      const orders = Math.round((0.05 + progress ** 3 * 0.9) * (yi === 0 ? 0.9 : 1.1) + (day.getDate() % 3 === 0 ? 0.4 : 0));
      if (orders === 0) continue;
      const iso = `${year}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      rows.push({ year, date: iso, orders, oliebollen: orders * 45, revenue: Math.round(orders * 45 * 0.95 * 100) / 100 });
    }
  });
  return rows;
}

const DEMO_LOODS = "Aalsmeerderweg 85, Aalsmeer";

/** Demo has no Maps: a fixed spot per town plus a small offset per address, so the planner has something to work with. */
const DEMO_TOWNS: Record<string, GeoPoint> = {
  aalsmeer: { lat: 52.263, lng: 4.762 },
  amstelveen: { lat: 52.303, lng: 4.862 },
  amsterdam: { lat: 52.372, lng: 4.894 },
  uithoorn: { lat: 52.237, lng: 4.826 },
  hoofddorp: { lat: 52.302, lng: 4.69 },
  haarlem: { lat: 52.381, lng: 4.636 },
  "den haag": { lat: 52.078, lng: 4.288 },
  kudelstaart: { lat: 52.235, lng: 4.749 },
  leiden: { lat: 52.16, lng: 4.497 },
  utrecht: { lat: 52.091, lng: 5.122 }
};

function demoPoint(address: string): GeoPoint | null {
  if (!address.trim()) return null;
  const lower = address.toLowerCase();
  const town = Object.keys(DEMO_TOWNS).find((t) => lower.includes(t)) ?? "amsterdam";
  let hash = 0;
  for (const ch of lower) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const spread = address === DEMO_LOODS ? 0 : 0.02;
  return { lat: DEMO_TOWNS[town].lat + (((hash & 0xff) / 255) - 0.5) * spread, lng: DEMO_TOWNS[town].lng + ((((hash >> 8) & 0xff) / 255) - 0.5) * spread * 1.6 };
}

function createDemoBackend(notice?: string): Backend {
  let ordersPromise: Promise<Order[]> | null = null;
  const getOrders = () => {
    ordersPromise ??= loadOrders().then((result) => result.agendaOrders);
    return ordersPromise;
  };

  function mutate(fn: (store: DemoStore) => void) {
    const store = readStore();
    fn(store);
    store.version += 1;
    writeStore(store);
  }

  function packingFor(store: DemoStore, orderId: string): PackingState {
    store.packing[orderId] ??= { ...emptyPacking };
    return store.packing[orderId];
  }

  function metaFor(store: DemoStore, orderId: string): OrderMeta {
    store.meta[orderId] ??= { ...emptyMeta };
    return store.meta[orderId];
  }

  return {
    kind: "demo",
    notice,
    async login(code) {
      await delay(150);
      const role = (Object.keys(DEMO_CODES) as Role[]).find((r) => DEMO_CODES[r] === code.trim());
      if (!role) throw new Error("Onbekende toegangscode.");
      return role;
    },
    async getVersion() {
      return readStore().version;
    },
    async getState(session, since) {
      const store = readStore();
      if (since && since === store.version) return null;
      // Confirmed business requests join the orders, unless the order list already has that number.
      const sheetOrders = await getOrders();
      const known = new Set(sheetOrders.map((o) => o.id));
      const orders = [...sheetOrders, ...store.business.filter((b) => b.status === "bevestigd" && !known.has(b.id)).map(businessToOrder)].map((o) => applyOrderEdits(o, store.orderEdits[o.id]));
      const admin = session.role === "beheer";
      return {
        version: store.version,
        orders,
        meta: store.meta,
        packing: store.packing,
        baked: store.baked,
        routes: store.routes,
        volunteers: admin ? store.volunteers : store.volunteers.map((v) => ({ ...v, phone: "", email: "", remark: "", address: "" })),
        costs: admin
          ? store.costs
          : store.costs
              .filter((c) => c.createdBy.toLowerCase() === session.name.toLowerCase())
              .map((c) => ({ ...c, iban: c.iban ? `•••• ${c.iban.slice(-4)}` : "" })),
        history: admin ? demoHistory() : [],
        pricePerPiece: 0.95,
        kmRate: 0.23,
        delivery: store.delivery,
        // Demo uses the default agenda from config.ts.
        agenda: [],
        business: admin ? store.business : [],
        // Like the script: everyone sees what changed, contact details only beheer.
        changes: admin ? store.changes : store.changes.map((c) => (["address", "postalCode", "city"].includes(c.field) ? { ...c, from: "", to: "" } : c))
      };
    },
    async claim(session, orderId) {
      await delay(200);
      mutate((store) => {
        const p = packingFor(store, orderId);
        if (p.packedBy) throw new Error(`Deze order is al ingepakt door ${p.packedBy}.`);
        if (p.claimedBy && p.claimedBy !== session.name) throw new Error(`Deze order is al geclaimd door ${p.claimedBy}.`);
        p.claimedBy = session.name;
        p.claimedAt = nowStamp();
      });
    },
    async release(session, orderId) {
      await delay(150);
      mutate((store) => {
        const p = packingFor(store, orderId);
        if (p.claimedBy && p.claimedBy !== session.name && session.role !== "beheer") {
          throw new Error(`Alleen ${p.claimedBy} of beheer kan deze claim vrijgeven.`);
        }
        store.packing[orderId] = { ...emptyPacking };
      });
    },
    async checkPart(session, orderId, part, done) {
      await delay(120);
      mutate((store) => {
        const p = packingFor(store, orderId);
        if (p.claimedBy !== session.name) throw new Error("Claim de order eerst voordat je afvinkt.");
        if (p.packedBy) throw new Error("Deze order is al afgerond.");
        if (part === "totaal" && done && !(p.met && p.zonder)) throw new Error("Vink eerst MET en ZONDER af.");
        p[part] = done;
        if (part !== "totaal" && !done) p.totaal = false;
      });
    },
    async complete(session, orderId) {
      await delay(150);
      mutate((store) => {
        const p = packingFor(store, orderId);
        if (p.claimedBy !== session.name) throw new Error("Alleen degene die de order claimde kan afronden.");
        if (!p.met || !p.zonder || !p.totaal) throw new Error("Vink eerst MET, ZONDER en TOTAAL af.");
        p.packedBy = session.name;
        p.packedAt = nowStamp();
      });
    },
    async reopen(session, orderId) {
      await delay(150);
      mutate((store) => {
        const p = packingFor(store, orderId);
        if (!p.packedBy) throw new Error("Deze order is nog niet afgerond.");
        p.packedBy = "";
        p.packedAt = "";
        p.claimedBy = session.name;
        p.claimedAt = nowStamp();
      });
    },
    async getSignupInfo() {
      const counts: SignupCounts = { inpakken: {}, fietskoerier: {}, autokoerier: {}, oliebollenbar: {} };
      for (const v of readStore().volunteers) {
        for (const role of Object.keys(counts) as VolunteerRole[]) {
          if (!v.roles[role].wants) continue;
          for (const option of v.roles[role].days) {
            const key = option.trim().toLowerCase();
            counts[role][key] = (counts[role][key] ?? 0) + 1;
          }
        }
      }
      return { counts, agenda: [] };
    },
    async setBaked(_session, date, counts) {
      mutate((store) => {
        store.baked[date] = {
          withRaisins: Math.max(0, Math.round(counts.withRaisins)),
          withoutRaisins: Math.max(0, Math.round(counts.withoutRaisins))
        };
      });
    },
    async updateNote(session, orderId, note, reviewed) {
      await delay(150);
      const original = ((await getOrders()).find((o) => o.id === orderId)?.extras ?? "").trim();
      mutate((store) => {
        const m = metaFor(store, orderId);
        const before = m.noteOverride.trim() || original;
        const after = note.trim() || original;
        if (before !== after) store.changes = [{ at: nowStamp(), kind: "opmerking", orderId, field: "note", from: before, to: after, by: session.name, note: "" }, ...store.changes];
        m.noteOverride = note;
        m.noteStatus = reviewed ? "beoordeeld" : "nieuw";
        m.updatedBy = session.name;
        m.updatedAt = nowStamp();
      });
    },
    async saveConfirmation(session, orderId, text) {
      await delay(150);
      mutate((store) => {
        const m = metaFor(store, orderId);
        if (m.confirmationStatus === "verzonden") throw new Error("Deze bevestiging is al verzonden.");
        m.confirmationText = text;
        m.confirmationStatus = "concept";
        m.updatedBy = session.name;
        m.updatedAt = nowStamp();
      });
    },
    async sendConfirmation(session, orderId, _subject, text) {
      await delay(400);
      const order = (await getOrders()).find((o) => o.id === orderId);
      if (!order?.email) throw new Error("Deze order heeft geen e-mailadres.");
      mutate((store) => {
        const m = metaFor(store, orderId);
        m.confirmationText = text;
        m.confirmationStatus = "verzonden";
        m.confirmationSentAt = nowStamp();
        m.updatedBy = session.name;
        m.updatedAt = nowStamp();
      });
    },
    async updateOrder(session, orderId, changes) {
      await delay(300);
      const order = (await getOrders()).map((o) => applyOrderEdits(o, readStore().orderEdits[o.id])).find((o) => o.id === orderId)
        ?? readStore().business.filter((b) => b.id === orderId).map(businessToOrder)[0];
      if (!order) throw new Error("Bestelling niet gevonden.");
      const real = changes.filter((c) => c.to.trim() !== orderFieldValue(order, c.field));
      if (real.length === 0) throw new Error("Er is niets gewijzigd.");
      for (const c of real) {
        if (c.from !== orderFieldValue(order, c.field)) throw new Error("Deze bestelling is net door iemand anders aangepast. Ververs en probeer het opnieuw.");
        if ((c.field === "withRaisins" || c.field === "withoutRaisins") && !/^\d+$/.test(c.to.trim())) throw new Error("Aantal moet een heel getal van 0 of meer zijn.");
        if (c.field === "deliveryDate" && !/^\d{4}-\d{2}-\d{2}$/.test(c.to)) throw new Error("Kies een leverdatum.");
      }
      mutate((store) => {
        const at = nowStamp();
        const log: ChangeEntry[] = real.map((c) => ({ at, kind: "bestelling", orderId, field: c.field, from: c.from, to: c.to.trim(), by: session.name, note: "" }));
        const b = store.business.find((x) => x.id === orderId);
        if (b) {
          // A business order lives in its own list; its amount follows from counts, delivery and moment.
          for (const c of real) {
            const v = c.to.trim();
            if (c.field === "withRaisins") b.withRaisins = Number(v);
            else if (c.field === "withoutRaisins") b.withoutRaisins = Number(v);
            else if (c.field === "deliveryDate") b.date = v;
            else if (c.field === "fulfilment") b.fulfilment = v === "afhalen" ? "afhalen" : "bezorgen";
            else if (c.field === "deliveryMoment") b.moment = (Object.keys(momentLabel) as Array<keyof typeof momentLabel>).find((k) => momentLabel[k] === v) ?? b.moment;
            else if (c.field === "address") b.street = v;
            else if (c.field === "postalCode") b.postalCode = v;
            else if (c.field === "city") b.city = v;
          }
          const totals = businessTotals(b, BUSINESS_DEFAULTS);
          if (totals.total !== b.totals.total) log.push({ at, kind: "bestelling", orderId, field: "amount", from: String(b.totals.total), to: String(totals.total), by: session.name, note: "opnieuw berekend" });
          b.totals = totals;
        } else {
          store.orderEdits[orderId] = { ...store.orderEdits[orderId], ...Object.fromEntries(real.map((c) => [c.field, c.to.trim()])) };
        }
        // Same rules as the script: new counts → pack again; another day → courier no longer applies.
        const p = store.packing[orderId];
        if (real.some((c) => c.field === "withRaisins" || c.field === "withoutRaisins") && p && (p.packedBy || p.met || p.zonder || p.totaal)) {
          log.push({ at, kind: "inpakken", orderId, field: "packing", from: p.packedBy ? `ingepakt door ${p.packedBy}` : "deels afgevinkt", to: "opnieuw inpakken", by: session.name, note: "aantallen gewijzigd" });
          store.packing[orderId] = { ...p, met: false, zonder: false, totaal: false, packedBy: "", packedAt: "" };
        }
        const m = store.meta[orderId];
        const was = m?.courier || order.supplierName;
        if (real.some((c) => c.field === "deliveryDate") && was) {
          log.push({ at, kind: "bestelling", orderId, field: "courier", from: was, to: "", by: session.name, note: "andere leverdatum" });
          if (m) m.courier = "";
          if (!b) store.orderEdits[orderId] = { ...store.orderEdits[orderId], supplierName: "" } as Partial<Record<OrderField, string>>;
        }
        store.changes = [...log.reverse(), ...store.changes];
      });
    },
    async assignCourier(session, orderId, courier) {
      await delay(150);
      mutate((store) => {
        const m = metaFor(store, orderId);
        m.courier = courier.trim();
        m.updatedBy = session.name;
        m.updatedAt = nowStamp();
      });
    },
    async assignCouriers(session, assignments) {
      await delay(250);
      mutate((store) => {
        for (const a of assignments) {
          const m = metaFor(store, a.orderId);
          m.courier = a.courier.trim();
          m.updatedBy = session.name;
          m.updatedAt = nowStamp();
        }
      });
    },
    async geocode(_session, addresses) {
      await delay(300);
      const points: Record<string, GeoPoint | null> = {};
      for (const a of addresses) points[a] = demoPoint(a);
      return { start: { address: DEMO_LOODS, point: demoPoint(DEMO_LOODS) }, points };
    },
    async computeRoute(_session, request) {
      await delay(500);
      // No Maps in demo mode: rough estimate of 3.5 km per stop by car, 2.5 km by bike.
      const perStop = request.mode === "bicycling" ? 2.5 : 3.5;
      const km = Math.round(request.stops.length * perStop * 10 + 25) / 10;
      // Rough arrival times: first stop after 15 minutes, then the travel time per stop plus 5 minutes there.
      const [h, m] = (/^\d{1,2}:\d{2}$/.test(request.startTime) ? request.startTime : "09:00").split(":").map(Number);
      const legMinutes = Math.round(perStop * (request.mode === "bicycling" ? 4 : 2.2));
      const perStopMinutes = request.minutesPerStop ?? 15;
      const stopTimes = request.stops.map((_, i) => {
        const t = h * 60 + m + 15 + i * (legMinutes + perStopMinutes);
        return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      });
      const info: RouteInfo = {
        key: request.part ? `${request.date}|${request.courier}|${request.part}` : `${request.date}|${request.courier}`,
        part: request.part ?? "",
        endAddress: request.endAddress ?? "",
        date: request.date,
        courier: request.courier,
        mode: request.mode,
        km,
        minutes: Math.round(km * (request.mode === "bicycling" ? 4 : 2.2) + request.stops.length * perStopMinutes),
        orderIds: request.stops.map((s) => s.orderId),
        mapsUrl: "",
        computedAt: nowStamp(),
        startTime: request.startTime,
        stopTimes
      };
      mutate((store) => {
        store.routes[info.key] = info;
      });
      return info;
    },
    async registerVolunteer(signup) {
      await delay(300);
      if (!signup.name.trim()) throw new Error("Vul je naam in.");
      if (!signup.phone.trim() && !signup.email.trim()) throw new Error("Vul een telefoonnummer of e-mailadres in.");
      if (!signup.consent) throw new Error("Geef toestemming voor het bewaren van je gegevens.");
      if (!Object.values(signup.roles).some((r) => r.wants)) throw new Error("Kies minstens één taak waarmee je wilt helpen.");
      mutate((store) => {
        store.volunteers.push({
          id: `demo-${Date.now()}`,
          createdAt: nowStamp(),
          name: signup.name.trim(),
          address: signup.address.trim(),
          city: signup.city.trim(),
          phone: signup.phone.trim(),
          email: signup.email.trim(),
          roles: signup.roles,
          cargoBike: signup.roles.fietskoerier.wants && signup.cargoBike,
          remark: signup.remark.trim(),
          planning: signup.planning
        });
      });
    },
    async extractReceipt() {
      await delay(900);
      return {
        fields: { date: nowStamp().slice(0, 10), amount: 23.45, supplier: "Voorbeeld Groothandel", description: "Bloem, gist en suiker (demo)" },
        photoUrl: "",
        warning: "Demo-modus: dit zijn voorbeeldwaarden, de foto is niet echt uitgelezen."
      };
    },
    async saveCost(session, cost) {
      await delay(200);
      if (!cost.date) throw new Error("Vul de datum in.");
      if (!(cost.amount > 0)) throw new Error("Vul een geldig bedrag in.");
      if (!cost.supplier.trim()) throw new Error("Vul de leverancier in.");
      if (!isValidIban(cost.iban)) throw new Error("Vul een geldig IBAN in, bijvoorbeeld NL91ABNA0417164300.");
      mutate((store) => {
        store.costs.push(
          withCostDefaults({ id: `demo-${Date.now()}`, createdAt: nowStamp(), createdBy: session.name, ...cost, iban: normaliseIban(cost.iban), status: "ingediend" })
        );
      });
    },
    async setDelivered(session, orderId, delivered) {
      await delay(150);
      mutate((store) => {
        if (delivered) store.delivery[orderId] = { deliveredBy: session.name, deliveredAt: nowStamp() };
        else delete store.delivery[orderId];
      });
    },
    async reviewCost(session, id, status, reason) {
      await delay(150);
      if (status === "afgekeurd" && !reason.trim()) throw new Error("Geef een reden waarom je de declaratie afkeurt.");
      mutate((store) => {
        const c = store.costs.find((x) => x.id === id);
        if (!c) throw new Error("Niet gevonden.");
        if (c.status === "uitbetaald") throw new Error("Deze declaratie is al uitbetaald.");
        Object.assign(c, { status, reason: status === "afgekeurd" ? reason.trim() : "", reviewedBy: session.name, reviewedAt: status === "ingediend" ? "" : nowStamp() });
      });
    },
    async payCost(_session, id, paid, date) {
      await delay(150);
      mutate((store) => {
        const c = store.costs.find((x) => x.id === id);
        if (!c) throw new Error("Niet gevonden.");
        if (paid && c.status !== "goedgekeurd") throw new Error("Keur de declaratie eerst goed.");
        if (!paid && c.status !== "uitbetaald") throw new Error("Deze declaratie is nog niet uitbetaald.");
        Object.assign(c, paid ? { status: "uitbetaald", paidAt: date || nowStamp().slice(0, 10) } : { status: "goedgekeurd", paidAt: "" });
      });
    },
    async anonymize(_session, confirm) {
      await delay(300);
      if (confirm !== "VERWIJDER") throw new Error("Typ VERWIJDER om te bevestigen.");
      const store = readStore();
      const result = { volunteers: store.volunteers.length, orders: 0, costs: store.costs.length, receipts: 0 };
      mutate((s) => {
        s.volunteers = [];
        s.costs = s.costs.map((c) => ({ ...c, createdBy: "", iban: "", reviewedBy: "" }));
        s.routes = {};
        for (const m of Object.values(s.meta)) Object.assign(m, { noteOverride: "", confirmationText: "", courier: "", updatedBy: "" });
        for (const p of Object.values(s.packing)) Object.assign(p, { claimedBy: "", packedBy: "" });
        for (const d of Object.values(s.delivery)) d.deliveredBy = "";
        for (const b of s.business) Object.assign(b, { contact: "", phone: "", email: "", invoiceEmail: "", remark: "", handledBy: "" });
      });
      return result;
    },
    async getBusinessInfo() {
      await delay(150);
      return BUSINESS_DEFAULTS;
    },
    async submitBusinessOrder(input) {
      await delay(500);
      if (input.website) throw new Error("Je aanvraag kon niet worden verstuurd.");
      const errors = Object.values(validateBusiness(input, BUSINESS_DEFAULTS));
      if (errors.length) throw new Error(errors[0]);
      let id = "";
      mutate((store) => {
        id = `Z${String(new Date().getFullYear()).slice(2)}-${String(store.business.length + 1).padStart(4, "0")}`;
        const { website: _, ...clean } = input;
        store.business.push({ ...clean, id, createdAt: nowStamp(), status: "nieuw", reason: "", handledBy: "", handledAt: "", totals: businessTotals(clean, BUSINESS_DEFAULTS) });
      });
      return { id };
    },
    async setBusinessStatus(session, id, status, reason) {
      await delay(200);
      if (status === "afgewezen" && !reason.trim()) throw new Error("Schrijf kort waarom je de aanvraag afwijst.");
      mutate((store) => {
        const b = store.business.find((x) => x.id === id);
        if (!b) throw new Error("Aanvraag niet gevonden.");
        Object.assign(b, { status, reason: status === "afgewezen" ? reason.trim() : "", handledBy: status === "nieuw" ? "" : session.name, handledAt: status === "nieuw" ? "" : nowStamp() });
      });
    }
  };
}

export const DEMO_STORAGE_KEY = DEMO_KEY;

const appsScriptUrl = (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined)?.trim();

export const backend: Backend = appsScriptUrl
  ? createAppsScriptBackend(appsScriptUrl)
  : createDemoBackend("Er is nog geen Google Sheet-koppeling ingesteld (VITE_APPS_SCRIPT_URL). Wijzigingen worden alleen in deze browser bewaard.");
