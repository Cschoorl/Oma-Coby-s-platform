import { ROUTE_START_TIMES } from "../../config";
import type { DashboardState } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { effectiveCourier } from "../../utils/orderUtils";
import { courierRuns, defaultStart, isRouteStale, orderPart, runRoute, toHhmm, toMinutes } from "../routes/routeUtils";

/*
 * Inpakken › "Klaar vóór": how much has to be packed by which time on a delivery day.
 *
 * The time an order has to be ready is when it leaves the loods:
 * - a delivery in a calculated route: the departure of that trip;
 * - a delivery without a (current) route: the start of the dagdeel, from the courier's signup or the
 *   order's bezorgmoment ("tussen 9:00 en 12:30" → ochtend → 09:00);
 * - a pickup: the planned time, else the first time in the moment, else the start of the dagdeel;
 * - pop-up stock: the planned time, else the start of the day.
 */

/** Where the time of an order comes from. */
export type DeadlineSource = "rit" | "zonder-route" | "niet-ingedeeld" | "afhalen" | "popup";

export interface PackDeadline {
  /** "09:00". */
  time: string;
  /** Minutes after midnight, for sorting and the clock. */
  minutes: number;
  orders: Order[];
  withRaisins: number;
  withoutRaisins: number;
  total: number;
  packedOrders: number;
  packedTotal: number;
  /** Stops per courier whose trip leaves at this time (calculated route). */
  trips: Array<{ courier: string; stops: number }>;
  /** How many orders got their time another way. */
  counts: Record<Exclude<DeadlineSource, "rit">, number>;
}

const pieces = (o: Order) => o.withRaisins + o.withoutRaisins;

function validTime(text: string | undefined): string {
  const m = toMinutes(text ?? "");
  return Number.isNaN(m) ? "" : toHhmm(m);
}

/** When one order has to be packed, and why that time. */
export function orderDeadline(state: DashboardState, order: Order): { time: string; source: DeadlineSource; courier: string } {
  const partStart = ROUTE_START_TIMES[orderPart(order)] ?? ROUTE_START_TIMES[""];
  if (order.category === "popup") return { time: validTime(order.plannedTime) || ROUTE_START_TIMES[""], source: "popup", courier: "" };
  if (order.fulfilment === "afhalen") {
    const inMoment = (order.deliveryMoment ?? "").match(/\d{1,2}[:.]\d{2}/)?.[0];
    return { time: validTime(order.plannedTime) || validTime(inMoment) || partStart, source: "afhalen", courier: "" };
  }
  const courier = effectiveCourier(order, state.meta[order.id]);
  if (!courier) return { time: partStart, source: "niet-ingedeeld", courier: "" };
  const runs = courierRuns(state, order.deliveryDate, courier);
  const run = runs.find((r) => r.orders.some((o) => o.id === order.id));
  if (!run) return { time: partStart, source: "zonder-route", courier };
  const route = runRoute(state, order.deliveryDate, courier, run, runs.length === 1);
  const start = route && !isRouteStale(run.orders, route, state.changes) ? validTime(route.startTime) : "";
  if (start) return { time: start, source: "rit", courier };
  return { time: defaultStart(state.volunteers, order.deliveryDate, courier, run.part), source: "zonder-route", courier };
}

/** The day's orders grouped by the time they have to be packed, earliest first. */
export function packDeadlines(state: DashboardState, date: string): PackDeadline[] {
  const byTime = new Map<string, PackDeadline>();
  for (const order of state.orders) {
    if (order.deliveryDate !== date) continue;
    const { time, source, courier } = orderDeadline(state, order);
    const group =
      byTime.get(time) ??
      ({
        time,
        minutes: toMinutes(time),
        orders: [],
        withRaisins: 0,
        withoutRaisins: 0,
        total: 0,
        packedOrders: 0,
        packedTotal: 0,
        trips: [],
        counts: { "zonder-route": 0, "niet-ingedeeld": 0, afhalen: 0, popup: 0 }
      } satisfies PackDeadline);
    group.orders.push(order);
    group.withRaisins += order.withRaisins;
    group.withoutRaisins += order.withoutRaisins;
    group.total += pieces(order);
    if (state.packing[order.id]?.packedBy) {
      group.packedOrders += 1;
      group.packedTotal += pieces(order);
    }
    if (source === "rit") {
      const trip = group.trips.find((t) => t.courier === courier);
      if (trip) trip.stops += 1;
      else group.trips.push({ courier, stops: 1 });
    } else group.counts[source] += 1;
    byTime.set(time, group);
  }
  return Array.from(byTime.values()).sort((a, b) => a.minutes - b.minutes);
}
