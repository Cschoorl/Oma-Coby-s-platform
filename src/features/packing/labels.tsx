import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { LABEL_SIZE } from "../../config";
import type { DashboardState } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { orderBoxes, type Box, type BoxKind } from "../../utils/boxes";
import { effectiveCourier, stopAddress } from "../../utils/orderUtils";
import { routeKey } from "../routes/routeUtils";

/*
 * Box labels for the DYMO LabelWriter 450: one label per box, printed through the browser's own
 * print dialog. Each label is one page of exactly LABEL_SIZE, so the printer cuts nothing off.
 * Thermal print: black on white only, no greys, big type.
 */

export interface LabelData {
  box: Box;
  orderId: string;
  name: string;
  contact: string;
  /** Street, postcode and city, or "AFHALEN · Locatie". */
  address: string;
  day: string;
  moment: string;
  courier: string;
  /** 1-based stop in the route, 0 when not in a route yet. */
  stop: number;
  /** Flyers go in the first box. */
  flyers: boolean;
}

const WEEKDAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "2026-12-30" → "wo 30 dec". */
function shortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${WEEKDAYS[new Date(y, m - 1, d, 12).getDay()]} ${d} ${MONTHS[m - 1]}`;
}

/** Courier, place in the route and expected arrival; the same order the pakbonnen use. */
export function routePlace(state: DashboardState, order: Order): { courier: string; stop: number; eta: string } {
  const courier = effectiveCourier(order, state.meta[order.id]);
  const route = courier ? state.routes[routeKey(order.deliveryDate, courier)] : undefined;
  const index = route ? route.orderIds.indexOf(order.id) : -1;
  return { courier, stop: index + 1, eta: route && index !== -1 ? route.stopTimes[index] ?? "" : "" };
}

/** Pickups last, then per courier in route order. */
export function byRoute(state: DashboardState, orders: Order[]): Order[] {
  const place = new Map(orders.map((o) => [o.id, routePlace(state, o)]));
  return [...orders].sort((a, b) => {
    const pa = place.get(a.id)!;
    const pb = place.get(b.id)!;
    return (
      Number(a.fulfilment === "afhalen") - Number(b.fulfilment === "afhalen") ||
      (pa.courier || "~").localeCompare(pb.courier || "~") ||
      (pa.stop || 999) - (pb.stop || 999) ||
      (a.locationName || a.contactPerson).localeCompare(b.locationName || b.contactPerson)
    );
  });
}

export function labelsFor(state: DashboardState, order: Order, counts?: Partial<Record<BoxKind, number>>): LabelData[] {
  const { courier, stop } = routePlace(state, order);
  const pickup = order.fulfilment === "afhalen";
  const flyers = /^ja/i.test(order.flyers ?? "");
  return orderBoxes(order, counts).map((box) => ({
    box,
    orderId: order.id,
    name: order.locationName || order.contactPerson,
    contact: order.locationName && order.contactPerson ? order.contactPerson : "",
    address: pickup ? `AFHALEN${order.pickupLocation ? ` · ${order.pickupLocation}` : ""}` : stopAddress(order),
    day: shortDay(order.deliveryDate),
    moment: order.deliveryMoment || order.plannedTime,
    courier: pickup ? "" : courier,
    stop: pickup ? 0 : stop,
    flyers: flyers && box.number === 1
  }));
}

const kindText: Record<BoxKind, string> = { met: "MET krenten", zonder: "ZONDER krenten" };

/**
 * One label at real size. MET has a black outline, ZONDER is inverted (white on black),
 * so the two are told apart from across the table.
 */
export function DymoLabel({ label }: { label: LabelData }) {
  const { box } = label;
  const zonder = box.kind === "zonder";
  return (
    <div
      className="oc-label flex flex-col overflow-hidden bg-white font-sans text-black"
      style={{ width: `${LABEL_SIZE.widthMm}mm`, height: `${LABEL_SIZE.heightMm}mm`, padding: "2.5mm 3mm" }}
    >
      <div className="flex items-start justify-between gap-[2mm]">
        <div className="min-w-0">
          <p className="line-clamp-2 font-display uppercase leading-[0.95] tracking-wide" style={{ fontSize: "5.2mm" }}>
            {label.name}
          </p>
          {label.contact ? (
            <p className="truncate" style={{ fontSize: "2.7mm" }}>
              t.a.v. {label.contact}
            </p>
          ) : null}
          <p className="line-clamp-2 font-bold leading-tight" style={{ fontSize: "2.9mm" }}>
            {label.address}
          </p>
        </div>
        <div className="shrink-0 text-right leading-none">
          <p className="font-bold uppercase tracking-[0.1em]" style={{ fontSize: "2.3mm" }}>
            Doos
          </p>
          <p className="font-serif font-bold tabular-nums" style={{ fontSize: "7.5mm" }}>
            {box.number}
            <span style={{ fontSize: "4.2mm" }}>/{box.total}</span>
          </p>
        </div>
      </div>

      <div
        className={`mt-auto flex items-center gap-[3mm] rounded-[1.2mm] px-[2.5mm] ${zonder ? "bg-black text-white" : "border-[0.6mm] border-black"}`}
        style={{ height: "15mm", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <span className="font-serif font-bold tabular-nums leading-none" style={{ fontSize: "11mm" }}>
          {box.count}
        </span>
        <span className="font-display uppercase leading-none tracking-wide" style={{ fontSize: "6.4mm" }}>
          {kindText[box.kind]}
        </span>
      </div>

      <div className="mt-[1.6mm] flex items-end justify-between gap-[2mm] leading-tight" style={{ fontSize: "2.6mm" }}>
        <p className="min-w-0">
          <b>{label.day}</b>
          {label.moment ? ` · ${label.moment}` : ""}
          {label.courier ? (
            <>
              <br />
              {label.courier}
              {label.stop ? ` · stop ${label.stop}` : ""}
            </>
          ) : null}
          {label.flyers ? <b> · flyers erin</b> : null}
        </p>
        <p className="shrink-0 text-right">
          {label.orderId}
          <br />
          <span className="font-display uppercase tracking-wide" style={{ fontSize: "3mm" }}>
            Oma Coby's Oliebollenbar
          </span>
        </p>
      </div>
    </div>
  );
}

let root: Root | null = null;

/**
 * Prints these labels, one per page, through the print dialog; choose the DYMO there.
 * The labels are drawn in their own element next to the app; while printing only that element shows.
 */
export async function printLabels(labels: LabelData[]): Promise<void> {
  if (labels.length === 0) return;
  let host = document.getElementById("oc-labels");
  if (!host) {
    host = document.createElement("div");
    host.id = "oc-labels";
    document.body.appendChild(host);
    root = createRoot(host);
  }
  flushSync(() =>
    root!.render(
      <>
        {labels.map((l) => (
          <DymoLabel key={`${l.orderId}-${l.box.number}`} label={l} />
        ))}
      </>
    )
  );
  const page = document.createElement("style");
  page.textContent = `@page { size: ${LABEL_SIZE.widthMm}mm ${LABEL_SIZE.heightMm}mm; margin: 0; }`;
  document.head.appendChild(page);
  document.body.classList.add("oc-labels-printing");
  // The label fonts must be there before the dialog takes its snapshot.
  await document.fonts?.ready;
  const done = () => {
    document.body.classList.remove("oc-labels-printing");
    page.remove();
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}

const AUTO_KEY = "omacoby-labels-autoprint";

/** Per device: print the labels straight after Afronden (handy at a fixed packing table with the DYMO). */
export function loadAutoPrint(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveAutoPrint(on: boolean) {
  try {
    if (on) localStorage.setItem(AUTO_KEY, "1");
    else localStorage.removeItem(AUTO_KEY);
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
}
