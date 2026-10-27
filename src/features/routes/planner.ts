import type { Volunteer } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { PLANNING } from "../../config";
import { stopAddress } from "../../utils/orderUtils";
import { courierAvailability, findVolunteer, homeAddress, orderPart, orderWindow, toHhmm, type Transport } from "./routeUtils";

/*
 * Automatic planning of one delivery day.
 *
 * A trip ("rit") is one courier in one dagdeel: it starts at the loods when the dagdeel starts and
 * must be done when it ends. The courier's last trip of the day ends at home, so the last stop is
 * the one nearest home; earlier trips end back at the loods to load up again.
 *
 * Orders are placed one by one (hardest first) where they add the least travel time, as long as
 * every stop is reached within its time slot, the trip fits in the dagdeel and the bollen fit on
 * the bike or in the car. Travel times are estimates from straight-line distance; Google Maps
 * calculates the real route afterwards.
 */

export interface Point {
  lat: number;
  lng: number;
}

export interface PlanStop {
  order: Order;
  /** Expected arrival, minutes after midnight. */
  eta: number;
}

export interface PlanRun {
  courier: string;
  volunteer?: Volunteer;
  part: string;
  vehicle: "fiets" | "bakfiets" | "auto";
  start: number;
  end: number;
  /** Departure from the loods: the start of the dagdeel, or later when the first stop asks for a later time. */
  depart: number;
  /** Where the trip ends: the courier's home (last trip) or back at the loods. */
  endsAtHome: boolean;
  homeAddress: string;
  stops: PlanStop[];
  /** Estimated km over the road, loods → stops → end. */
  km: number;
  /** When the last stop is done. */
  finish: number;
  pieces: number;
  capacity: number;
  /** Fixed by hand before planning; the planner keeps these. */
  lockedIds: string[];
}

export interface Plan {
  runs: PlanRun[];
  unassigned: Array<{ order: Order; reason: string }>;
  notes: string[];
}

export interface PlanInput {
  orders: Order[];
  volunteers: Volunteer[];
  date: string;
  /** Orders that keep their current courier. */
  locked: Record<string, string>;
  start: Point;
  points: Record<string, Point | null>;
  minutesPerStop: number;
}

const R = 6371;
export function straightKm(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function roadKm(a: Point, b: Point): number {
  return straightKm(a, b) * PLANNING.roadFactor;
}

/** Minutes on the road; cars are slow for the first 10 km and fast on longer stretches. */
function travelMinutes(km: number, vehicle: PlanRun["vehicle"]): number {
  if (vehicle !== "auto") return (km / PLANNING.speed.fiets) * 60;
  const city = Math.min(km, 10);
  return (city / PLANNING.speed.autoStad) * 60 + (Math.max(0, km - 10) / PLANNING.speed.autoSnelweg) * 60 + (km > 0.2 ? 3 : 0);
}

const pieces = (o: Order) => o.withRaisins + o.withoutRaisins;

interface Ctx {
  start: Point;
  point: (o: Order) => Point;
  home: Map<PlanRun, Point | null>;
  perStop: number;
}

interface Simulation {
  ok: boolean;
  etas: number[];
  finish: number;
  /** Travel minutes including the way to the end point; what the planner minimises. */
  travel: number;
  km: number;
}

/** Drive the trip in this order and check every time slot and the end of the dagdeel. */
function simulate(run: PlanRun, stops: Order[], ctx: Ctx, strict: boolean): Simulation {
  let t = run.start;
  let pos = ctx.start;
  let travel = 0;
  let km = 0;
  let ok = true;
  const etas: number[] = [];
  for (const order of stops) {
    const p = ctx.point(order);
    const d = roadKm(pos, p);
    const minutes = travelMinutes(d, run.vehicle);
    t += minutes;
    travel += minutes;
    km += d;
    const [from, to] = orderWindow(order);
    if (t < from) t = from;
    if (t > to + 5) ok = false;
    etas.push(t);
    t += ctx.perStop;
    pos = p;
  }
  const finish = t;
  const end = run.endsAtHome ? ctx.home.get(run) ?? ctx.start : ctx.start;
  const back = roadKm(pos, end);
  const backMinutes = travelMinutes(back, run.vehicle);
  travel += backMinutes;
  km += back;
  // A trip back to the loods must fit in the dagdeel; the way home does not count as work.
  const doneAt = run.endsAtHome ? finish : finish + backMinutes;
  if (doneAt > run.end + 10) ok = false;
  if (strict && stops.reduce((s, o) => s + pieces(o), 0) > run.capacity) ok = false;
  return { ok, etas, finish, travel, km };
}

function vehicleFor(transport: Transport[], v: Volunteer): PlanRun["vehicle"] {
  if (transport.includes("auto")) return "auto";
  return v.cargoBike ? "bakfiets" : "fiets";
}

function capacityOf(vehicle: PlanRun["vehicle"]): number {
  return PLANNING.capacity[vehicle];
}

/** Order fits this trip at all (dagdeel, distance for the bike), regardless of what else is in it. */
function fitsRun(order: Order, run: PlanRun, ctx: Ctx): string {
  const part = orderPart(order);
  if (part && run.part && part !== run.part) return "dagdeel";
  if (run.vehicle !== "auto" && straightKm(ctx.start, ctx.point(order)) > PLANNING.bikeMaxKm) return "fiets";
  if (pieces(order) > run.capacity) return "capaciteit";
  return "";
}

/** Minutes on the road, plus a minute per car kilometre: nearby stops go by bike when one is free. */
function tripCost(run: PlanRun, sim: Simulation): number {
  return sim.travel + (run.vehicle === "auto" ? sim.km : 0);
}

/** Best place to put an order in a trip, or null when it does not fit anywhere. */
function bestInsertion(run: PlanRun, order: Order, ctx: Ctx): { index: number; cost: number; busy: number } | null {
  const current = run.stops.map((s) => s.order);
  const now = simulate(run, current, ctx, true);
  const base = tripCost(run, now);
  const busy = current.length ? now.finish - run.start : 0;
  let best: { index: number; cost: number; busy: number } | null = null;
  for (let i = 0; i <= current.length; i++) {
    const next = [...current.slice(0, i), order, ...current.slice(i)];
    const sim = simulate(run, next, ctx, true);
    if (!sim.ok) continue;
    const cost = tripCost(run, sim) - base;
    if (!best || cost < best.cost) best = { index: i, cost, busy };
  }
  return best;
}

function refresh(run: PlanRun, ctx: Ctx) {
  const orders = run.stops.map((s) => s.order);
  const sim = simulate(run, orders, ctx, false);
  run.stops = orders.map((order, i) => ({ order, eta: sim.etas[i] }));
  // No point leaving at 9:00 for a first stop at 11:00: leave just in time.
  const firstLeg = orders.length ? travelMinutes(roadKm(ctx.start, ctx.point(orders[0])), run.vehicle) : 0;
  run.depart = orders.length ? Math.max(run.start, Math.floor((sim.etas[0] - firstLeg) / 5) * 5) : run.start;
  run.km = Math.round(sim.km * 10) / 10;
  run.finish = sim.finish;
  run.pieces = orders.reduce((s, o) => s + pieces(o), 0);
}

/** Move single stops to a better place while that saves travel time (and keeps the trip feasible). */
function improve(run: PlanRun, ctx: Ctx) {
  let orders = run.stops.map((s) => s.order);
  let cost = simulate(run, orders, ctx, false).travel;
  for (let round = 0; round < 4; round++) {
    let better = false;
    for (let i = 0; i < orders.length; i++) {
      const without = orders.filter((_, k) => k !== i);
      for (let j = 0; j <= without.length; j++) {
        if (j === i) continue;
        const next = [...without.slice(0, j), orders[i], ...without.slice(j)];
        const sim = simulate(run, next, ctx, false);
        if (sim.ok && sim.travel < cost - 0.5) {
          orders = next;
          cost = sim.travel;
          better = true;
        }
      }
    }
    if (!better) break;
  }
  run.stops = orders.map((order) => ({ order, eta: 0 }));
}

export function makePlan(input: PlanInput): Plan {
  const notes: string[] = [];
  const unassigned: Plan["unassigned"] = [];
  const runs: PlanRun[] = [];
  const home = new Map<PlanRun, Point | null>();

  // Trips: every courier signed up for this day, one per dagdeel; the last one ends at home.
  for (const v of input.volunteers) {
    const slots = courierAvailability(v, input.date);
    if (slots.length === 0) continue;
    const address = homeAddress(v);
    const homePoint = address ? input.points[address] ?? null : null;
    if (!address) notes.push(`${v.name} heeft geen woonadres ingevuld; de laatste rit eindigt bij de loods.`);
    else if (!homePoint) notes.push(`Het adres van ${v.name} is niet gevonden; de laatste rit eindigt bij de loods.`);
    slots.forEach((slot, i) => {
      const vehicle = vehicleFor(slot.transport, v);
      const run: PlanRun = {
        courier: v.name,
        volunteer: v,
        part: slot.part,
        vehicle,
        start: slot.start,
        end: slot.end,
        depart: slot.start,
        endsAtHome: i === slots.length - 1 && homePoint !== null,
        homeAddress: address,
        stops: [],
        km: 0,
        finish: slot.start,
        pieces: 0,
        capacity: capacityOf(vehicle),
        lockedIds: []
      };
      home.set(run, homePoint);
      runs.push(run);
    });
  }

  const missing = new Set<string>();
  const ctx: Ctx = {
    start: input.start,
    home,
    perStop: input.minutesPerStop,
    point: (o) => input.points[stopAddress(o)] as Point
  };
  const located = input.orders.filter((o) => {
    if (input.points[stopAddress(o)]) return true;
    missing.add(o.id);
    unassigned.push({ order: o, reason: `Adres niet gevonden: ${stopAddress(o) || "geen adres"}` });
    return false;
  });

  // Orders fixed by hand stay with their courier, in the trip of their dagdeel.
  const free: Order[] = [];
  for (const order of located) {
    const courier = input.locked[order.id];
    if (!courier) {
      free.push(order);
      continue;
    }
    const part = orderPart(order);
    let run = runs.find((r) => r.courier === courier && (!part || !r.part || r.part === part)) ?? runs.find((r) => r.courier === courier);
    if (!run) {
      // Not signed up for this day: a trip of its own, so the hand-made choice is not lost.
      const v = findVolunteer(input.volunteers, courier);
      const [a, b] = PLANNING.partWindows[part] ?? PLANNING.partWindows[""];
      const vehicle: PlanRun["vehicle"] = v && v.roles.fietskoerier.wants && !v.roles.autokoerier.wants ? (v.cargoBike ? "bakfiets" : "fiets") : "auto";
      run = {
        courier,
        volunteer: v,
        part,
        vehicle,
        start: Number(a.slice(0, 2)) * 60 + Number(a.slice(3)),
        end: Number(b.slice(0, 2)) * 60 + Number(b.slice(3)),
        depart: Number(a.slice(0, 2)) * 60 + Number(a.slice(3)),
        endsAtHome: false,
        homeAddress: homeAddress(v),
        stops: [],
        km: 0,
        finish: 0,
        pieces: 0,
        capacity: capacityOf(vehicle),
        lockedIds: []
      };
      home.set(run, null);
      runs.push(run);
      notes.push(`${courier} is met de hand ingedeeld maar heeft zich niet voor deze dag aangemeld.`);
    }
    const at = bestInsertion(run, order, ctx);
    run.stops.splice(at ? at.index : run.stops.length, 0, { order, eta: 0 });
    run.lockedIds.push(order.id);
  }

  // Hardest orders first: fewest possible trips, earliest deadline, furthest from the loods.
  const options = (o: Order) => runs.filter((r) => !fitsRun(o, r, ctx)).length;
  free.sort((a, b) => options(a) - options(b) || orderWindow(a)[1] - orderWindow(b)[1] || straightKm(ctx.start, ctx.point(b)) - straightKm(ctx.start, ctx.point(a)));

  for (const order of free) {
    let best: { run: PlanRun; index: number; score: number } | null = null;
    const reasons = new Set<string>();
    for (const run of runs) {
      const why = fitsRun(order, run, ctx);
      if (why) {
        reasons.add(why);
        continue;
      }
      const at = bestInsertion(run, order, ctx);
      if (!at) {
        reasons.add(run.stops.reduce((s, x) => s + pieces(x.order), 0) + pieces(order) > run.capacity ? "vol" : "tijd");
        continue;
      }
      // Extra travel time, plus part of the time the trip is already busy, so the work is spread
      // over everyone who signed up instead of piling up on the fastest car.
      const score = at.cost + at.busy * 0.4;
      if (!best || score < best.score) best = { run, index: at.index, score };
    }
    if (best) {
      best.run.stops.splice(best.index, 0, { order, eta: 0 });
      continue;
    }
    const part = orderPart(order);
    const reason =
      runs.length === 0
        ? "Er heeft zich niemand als koerier voor deze dag aangemeld."
        : !runs.some((r) => !part || !r.part || r.part === part)
          ? `Niemand heeft zich als koerier voor de ${part} aangemeld.`
          : reasons.has("tijd")
            ? "Past bij niemand meer binnen de tijd (dagdeel of gevraagde tijd)."
            : reasons.has("vol")
              ? "Er is geen plek meer: fietsen en auto's zitten vol."
              : reasons.has("fiets")
                ? "Te ver voor de fiets, en er is geen auto beschikbaar."
                : "Past bij geen enkele koerier.";
    unassigned.push({ order, reason });
  }

  // The courier's last trip that actually has stops is the one that ends at home.
  const lastRun = new Map<string, PlanRun>();
  for (const run of runs) if (run.stops.length > 0 && (!lastRun.get(run.courier) || run.start > lastRun.get(run.courier)!.start)) lastRun.set(run.courier, run);
  for (const run of runs) run.endsAtHome = lastRun.get(run.courier) === run && Boolean(home.get(run));

  for (const run of runs) {
    if (run.stops.length > 1) improve(run, ctx);
    refresh(run, ctx);
  }
  if (missing.size > 0) notes.push(`${missing.size} ${missing.size === 1 ? "adres is" : "adressen zijn"} niet gevonden; controleer ze in de Sheet.`);

  const used = runs.filter((r) => r.stops.length > 0).sort((a, b) => a.courier.localeCompare(b.courier) || a.start - b.start);
  return { runs: used, unassigned, notes };
}

export function describeWindow(run: PlanRun): string {
  return `${toHhmm(run.start)}–${toHhmm(run.end)}`;
}
