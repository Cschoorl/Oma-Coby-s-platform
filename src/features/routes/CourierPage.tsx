import { useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import { emptyPacking } from "../../types/dashboard";
import { OrderFilters } from "../orders/OrderFilters";
import { SupplierPicker } from "../orders/SupplierPicker";
import { Badge, Card, Notice, formatDayLabel, ghostButton, pickInitialDate, primaryButton, secondaryButton } from "../../components/ui";
import { effectiveNote, mapsRouteUrlForOrders, mapsUrl, stopAddress } from "../../utils/orderUtils";
import { navigate } from "../../lib/router";
import { courierOrders, couriersOn, isRouteStale, orderedStops, routeKey } from "./routeUtils";

interface CourierPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
  name: string | null;
  date: string | null;
}

/** Mobile-first page per bezorger; this is the link that goes out via WhatsApp. */
export function CourierPage({ state, session, run, name, date: dateParam }: CourierPageProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markDelivered(orderId: string, delivered: boolean) {
    setBusy(orderId);
    setError(null);
    try {
      await run(() => backend.setDelivered(session, orderId, delivered));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setBusy(null);
    }
  }
  const dates = useMemo(() => Array.from(new Set(state.orders.map((o) => o.deliveryDate))).sort(), [state.orders]);
  // The date lives in the link (#/bezorger?naam=..&datum=..), so a WhatsApp link opens the right day.
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : pickInitialDate(dates);

  const couriers = useMemo(() => couriersOn(state, date), [state, date]);

  function go(nextName: string | null, nextDate: string) {
    navigate(nextName ? `/bezorger?naam=${encodeURIComponent(nextName)}&datum=${nextDate}` : `/bezorger?datum=${nextDate}`);
  }

  const orders = name ? courierOrders(state, date, name) : [];
  const route = name ? state.routes[routeKey(date, name)] : undefined;
  const stops = orderedStops(orders, route);
  const routeUrl = route?.mapsUrl || mapsRouteUrlForOrders(stops);
  const pieces = orders.reduce((sum, o) => sum + o.withRaisins + o.withoutRaisins, 0);
  const stale = isRouteStale(orders, route);
  const deliveredCount = orders.filter((o) => state.delivery[o.id]).length;
  const nextStop = stops.find((o) => !state.delivery[o.id]);

  return (
    <div className="grid gap-4">
      <OrderFilters selectedDate={date} availableDates={dates} onDateChange={(d) => go(name, d)} />
      {!name ? (
        <SupplierPicker supplierNames={couriers} selectedSupplier={null} onSelectSupplier={(n) => go(n, date)} />
      ) : (
        <>
          <Card className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-stone-900">{name}</p>
                <p className="text-sm text-stone-500">
                  {formatDayLabel(date)} · {orders.length} {orders.length === 1 ? "stop" : "stops"} · {pieces} oliebollen
                  {route ? ` · ${route.km.toLocaleString("nl-NL")} km (± ${route.minutes} min)` : ""}
                  {route?.startTime && !stale ? ` · vertrek ${route.startTime}` : ""}
                </p>
                <p className="mt-1 text-sm font-semibold text-stone-800">
                  {deliveredCount} van {orders.length} afgeleverd
                </p>
              </div>
              <button type="button" className={ghostButton} onClick={() => go(null, date)}>
                Wissel
              </button>
            </div>
            {routeUrl ? (
              <a className={`${primaryButton} py-3 text-base`} href={routeUrl} target="_blank" rel="noreferrer">
                Start route in Google Maps
              </a>
            ) : null}
            <p className="-mt-2 text-center text-xs text-stone-500">Start en eindigt bij de baklocatie in Aalsmeer.</p>
            {orders.length > 0 ? (
              <div className="h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={deliveredCount} aria-valuemin={0} aria-valuemax={orders.length} aria-label="Afgeleverd">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(deliveredCount / orders.length) * 100}%` }} />
              </div>
            ) : null}
          </Card>
          {error ? <Notice tone="error">{error}</Notice> : null}

          <div className="grid gap-3">
            {stops.map((order, i) => {
              const note = effectiveNote(order, state.meta[order.id]);
              const packing = state.packing[order.id] ?? emptyPacking;
              const delivered = state.delivery[order.id];
              const eta = route && !stale ? route.stopTimes[route.orderIds.indexOf(order.id)] : "";
              return (
                <Card key={order.id} className={`grid gap-3 ${delivered ? "opacity-60" : nextStop?.id === order.id ? "ring-2 ring-coby-200" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${delivered ? "bg-emerald-600" : "bg-stone-900"}`}>{delivered ? "✓" : i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-stone-900">{order.locationName || order.contactPerson}</p>
                        {delivered ? <Badge tone="green">Afgeleverd {delivered.deliveredAt.slice(11, 16)}</Badge> : packing.packedBy ? <Badge tone="green">Ingepakt</Badge> : <Badge tone="amber">Nog inpakken</Badge>}
                      </div>
                      <p className="text-sm text-stone-600">{stopAddress(order)}</p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {[eta ? `Verwacht ${eta}` : order.plannedTime && `Gepland ${order.plannedTime}`, order.deliveryMoment, order.packaging, /^ja/i.test(order.flyers ?? "") ? "met flyers" : "", order.status !== "open" ? order.status : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-stone-100 rounded-lg border border-stone-200 text-center">
                    {[
                      ["Met", order.withRaisins],
                      ["Zonder", order.withoutRaisins],
                      ["Totaal", order.withRaisins + order.withoutRaisins]
                    ].map(([label, count]) => (
                      <div key={label} className="py-2">
                        <p className="text-[11px] font-medium text-stone-500">{label}</p>
                        <p className="text-lg font-semibold tabular-nums text-stone-900">{count}</p>
                      </div>
                    ))}
                  </div>
                  {note ? <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{note}</p> : null}
                  <div className="grid grid-cols-2 gap-2">
                    {order.phone ? (
                      <a className={secondaryButton} href={`tel:${order.phone}`}>
                        Bellen
                      </a>
                    ) : (
                      <span />
                    )}
                    <a className={secondaryButton} href={mapsUrl(order)} target="_blank" rel="noreferrer">
                      Navigeren
                    </a>
                  </div>
                  {delivered ? (
                    <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                      <span>
                        Afgeleverd door {delivered.deliveredBy} om {delivered.deliveredAt.slice(11, 16)}
                      </span>
                      <button type="button" className="font-semibold text-stone-600 hover:text-stone-900 hover:underline" disabled={busy !== null} onClick={() => void markDelivered(order.id, false)}>
                        Ongedaan maken
                      </button>
                    </div>
                  ) : (
                    <button type="button" className={`${primaryButton} py-3 text-base`} disabled={busy !== null} onClick={() => void markDelivered(order.id, true)}>
                      {busy === order.id ? "Opslaan…" : "✓ Afgeleverd"}
                    </button>
                  )}
                </Card>
              );
            })}
            {stops.length === 0 ? <Card>Geen stops voor {name} op deze dag.</Card> : null}
          </div>
        </>
      )}
    </div>
  );
}
