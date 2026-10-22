import type {
  BakedCount,
  CostEntry,
  DashboardState,
  OrderMeta,
  PackingPart,
  PackingState,
  ReceiptFields,
  Role,
  RoleAvailability,
  RouteInfo,
  Volunteer,
  VolunteerRole
} from "../types/dashboard";
import { emptyMeta, emptyPacking } from "../types/dashboard";
import type { Order } from "../types/order";
import { mapSheetRowsToOrders } from "./googleSheetAdapter";
import { loadOrders } from "./ordersSource";

export interface Session {
  code: string;
  role: Role;
  name: string;
}

export interface RouteRequest {
  date: string;
  courier: string;
  mode: "driving" | "bicycling";
  stops: Array<{ orderId: string; address: string }>;
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
}

export interface ReceiptResult {
  fields: ReceiptFields;
  photoUrl: string;
  warning: string;
}

/** Signups per role per form option (lowercased), without names. */
export type SignupCounts = Record<VolunteerRole, Record<string, number>>;

export interface CostInput {
  date: string;
  amount: number;
  supplier: string;
  description: string;
  photoUrl: string;
}

export interface Backend {
  kind: "apps-script" | "demo";
  /** Why demo data is shown, when relevant. */
  notice?: string;
  login(code: string): Promise<Role>;
  getVersion(session: Session): Promise<number>;
  getState(session: Session): Promise<DashboardState>;
  claim(session: Session, orderId: string): Promise<void>;
  release(session: Session, orderId: string): Promise<void>;
  checkPart(session: Session, orderId: string, part: PackingPart, done: boolean): Promise<void>;
  complete(session: Session, orderId: string): Promise<void>;
  reopen(session: Session, orderId: string): Promise<void>;
  getSignupCounts(): Promise<SignupCounts>;
  setBaked(session: Session, date: string, counts: BakedCount): Promise<void>;
  updateNote(session: Session, orderId: string, note: string, reviewed: boolean): Promise<void>;
  saveConfirmation(session: Session, orderId: string, text: string): Promise<void>;
  sendConfirmation(session: Session, orderId: string, subject: string, text: string): Promise<void>;
  assignCourier(session: Session, orderId: string, courier: string): Promise<void>;
  computeRoute(session: Session, request: RouteRequest): Promise<RouteInfo>;
  registerVolunteer(signup: VolunteerSignup): Promise<void>;
  extractReceipt(session: Session, imageBase64: string, mediaType: string): Promise<ReceiptResult>;
  saveCost(session: Session, cost: CostInput): Promise<void>;
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
    async getState(session) {
      const raw = await call<RawState>("state", withSession(session));
      const { rows, ...rest } = raw;
      return { ...rest, orders: mapSheetRowsToOrders(rows).filter((order) => order.deliveryDate) };
    },
    async claim(session, orderId) {
      await call("claim", withSession(session, { orderId }));
    },
    async release(session, orderId) {
      await call("release", withSession(session, { orderId }));
    },
    async checkPart(session, orderId, part, done) {
      await call("checkPart", withSession(session, { orderId, part, done }));
    },
    async complete(session, orderId) {
      await call("complete", withSession(session, { orderId }));
    },
    async reopen(session, orderId) {
      await call("reopen", withSession(session, { orderId }));
    },
    async getSignupCounts() {
      const data = await call<{ counts: SignupCounts }>("signupStats", {});
      return data.counts;
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
    }
  };
}

// ---------------------------------------------------------------------------
// Demo backend: same rules as the Apps Script, stored in this browser only.

export const DEMO_CODES: Record<Role, string> = { beheer: "beheer", inpakker: "inpak", bezorger: "bezorg" };

const DEMO_KEY = "omacoby-demo-v3";

interface DemoStore {
  version: number;
  meta: Record<string, OrderMeta>;
  packing: Record<string, PackingState>;
  baked: Record<string, BakedCount>;
  routes: Record<string, RouteInfo>;
  volunteers: Volunteer[];
  costs: CostEntry[];
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
      phone: "0600000001",
      email: "anna@example.nl",
      cargoBike: true,
      roles: { inpakken: none, fietskoerier: { wants: true, days: ["Woensdag 30 december: ochtend", "Donderdag 31 december: ochtend"] }, autokoerier: none, oliebollenbar: none }
    },
    {
      ...base,
      id: "demo-2",
      name: "Bezorger Bram",
      phone: "0600000002",
      email: "",
      roles: { inpakken: { wants: true, days: ["Dinsdag 29 december"] }, fietskoerier: none, autokoerier: { wants: true, days: ["Woensdag 30 december: middag"] }, oliebollenbar: none }
    },
    {
      ...base,
      id: "demo-3",
      name: "Bezorger Chris",
      phone: "0600000003",
      email: "chris@example.nl",
      remark: "Liefst samen met Bram",
      roles: { inpakken: none, fietskoerier: none, autokoerier: { wants: true, days: ["Donderdag 31 december: middag"] }, oliebollenbar: { wants: true, days: ["Woensdag 30 december"] } }
    }
  ];
}

function emptyStore(): DemoStore {
  return { version: 1, meta: {}, packing: {}, baked: {}, routes: {}, volunteers: demoVolunteers(), costs: [] };
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
    async getState(session) {
      const orders = await getOrders();
      const store = readStore();
      const admin = session.role === "beheer";
      return {
        version: store.version,
        orders,
        meta: store.meta,
        packing: store.packing,
        baked: store.baked,
        routes: store.routes,
        volunteers: admin ? store.volunteers : store.volunteers.map((v) => ({ ...v, phone: "", email: "", remark: "", address: "" })),
        costs: admin ? store.costs : [],
        history: admin ? demoHistory() : [],
        pricePerPiece: 0.95
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
    async getSignupCounts() {
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
      return counts;
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
      mutate((store) => {
        const m = metaFor(store, orderId);
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
    async assignCourier(session, orderId, courier) {
      await delay(150);
      mutate((store) => {
        const m = metaFor(store, orderId);
        m.courier = courier.trim();
        m.updatedBy = session.name;
        m.updatedAt = nowStamp();
      });
    },
    async computeRoute(_session, request) {
      await delay(500);
      // No Maps in demo mode: rough estimate of 3.5 km per stop by car, 2.5 km by bike.
      const perStop = request.mode === "bicycling" ? 2.5 : 3.5;
      const km = Math.round(request.stops.length * perStop * 10 + 25) / 10;
      const info: RouteInfo = {
        key: `${request.date}|${request.courier}`,
        date: request.date,
        courier: request.courier,
        mode: request.mode,
        km,
        minutes: Math.round(km * (request.mode === "bicycling" ? 4 : 2.2) + request.stops.length * 5),
        orderIds: request.stops.map((s) => s.orderId),
        mapsUrl: "",
        computedAt: nowStamp()
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
          remark: signup.remark.trim()
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
      mutate((store) => {
        store.costs.push({ id: `demo-${Date.now()}`, createdAt: nowStamp(), createdBy: session.name, ...cost });
      });
    }
  };
}

export const DEMO_STORAGE_KEY = DEMO_KEY;

const appsScriptUrl = (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined)?.trim();

export const backend: Backend = appsScriptUrl
  ? createAppsScriptBackend(appsScriptUrl)
  : createDemoBackend("Er is nog geen Google Sheet-koppeling ingesteld (VITE_APPS_SCRIPT_URL). Wijzigingen worden alleen in deze browser bewaard.");
