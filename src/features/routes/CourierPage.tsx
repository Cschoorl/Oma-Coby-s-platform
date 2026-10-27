import { useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import { emptyPacking } from "../../types/dashboard";
import { OrderFilters } from "../orders/OrderFilters";
import { SupplierPicker } from "../orders/SupplierPicker";
import { Badge, Bollenteller, Card, EmptyState, Icon, Note, Notice, ProgressBar, bigButton, formatDayLabel, pickInitialDate, primaryButton, rollOliebol, secondaryButton, textAction, toast } from "../../components/ui";
import { effectiveNote, mapsRouteUrlForOrders, mapsUrl, stopAddress } from "../../utils/orderUtils";
import { navigate } from "../../lib/router";
import { patches } from "../../lib/patches";
import type { Patch } from "../../lib/useDashboard";
import { courierRuns, couriersOn, isRouteStale, orderedStops, runRoute } from "./routeUtils";

interface CourierPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>, patch?: Patch) => Promise<void>;
  name: string | null;
  date: string | null;
}

/** Mobile-first page per bezorger; this is the link that goes out via WhatsApp. */
export function CourierPage({ state, session, run, name, date: dateParam }: CourierPageProps) {
  const [error, setError] = useState<string | null>(null);

  // Shows at once and the next stop can be ticked straight away; the Sheet saves in the background.
  async function markDelivered(orderId: string, delivered: boolean) {
    setError(null);
    if (delivered) {
      const left = orders.filter((o) => o.id !== orderId && !state.delivery[o.id]).length;
      if (left === 0) {
        rollOliebol();
        toast("Alle bollen zijn binnen. Rij voorzichtig terug!");
      } else toast(`Afgeleverd. Nog ${left} ${left === 1 ? "stop" : "stops"}.`);
    }
    try {
      await run(() => backend.setDelivered(session, orderId, delivered), patches.delivered(orderId, session.name, delivered));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt.");
    }
  }
  const dates = useMemo(() => Array.from(new Set(state.orders.map((o) => o.deliveryDate))).sort(), [state.orders]);
  // The date lives in the link (#/bezorger?naam=..&datum=..), so a WhatsApp link opens the right day.
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : pickInitialDate(dates);

  const couriers = useMemo(() => couriersOn(state, date), [state, date]);

  function go(nextName: string | null, nextDate: string) {
    navigate(nextName ? `/bezorger?naam=${encodeURIComponent(nextName)}&datum=${nextDate}` : `/bezorger?datum=${nextDate}`);
  }

  // One trip per dagdeel; most couriers have one.
  const runs = name ? courierRuns(state, date, name) : [];
  const trips = runs.map((r) => {
    const route = runRoute(state, date, name ?? "", r, runs.length === 1);
    const stops = orderedStops(r.orders, route);
    return { ...r, route, stale: isRouteStale(r.orders, route), stops, url: route?.mapsUrl || mapsRouteUrlForOrders(stops) };
  });
  const orders = trips.flatMap((t) => t.orders);
  const stops = trips.flatMap((t) => t.stops);
  const tripOf = (orderId: string) => trips.find((t) => t.orders.some((o) => o.id === orderId));
  const computed = trips.filter((t) => t.route && !t.stale);
  const km = computed.reduce((sum, t) => sum + (t.route?.km ?? 0), 0);
  const minutes = computed.reduce((sum, t) => sum + (t.route?.minutes ?? 0), 0);
  const firstStart = trips[0]?.route && !trips[0].stale ? trips[0].route.startTime : "";
  const pieces = orders.reduce((sum, o) => sum + o.withRaisins + o.withoutRaisins, 0);
  const deliveredCount = orders.filter((o) => state.delivery[o.id]).length;
  const nextStop = stops.find((o) => !state.delivery[o.id]);

  const allDelivered = orders.length > 0 && deliveredCount === orders.length;

  return (
    <div className="grid gap-4">
      <OrderFilters selectedDate={date} availableDates={dates} onDateChange={(d) => go(name, d)} />
      {!name ? (
        <SupplierPicker supplierNames={couriers} selectedSupplier={null} onSelectSupplier={(n) => go(n, date)} />
      ) : (
        <>
          <Card className="grid gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{formatDayLabel(date)}</p>
                <p className="font-display text-[34px] uppercase leading-none tracking-wide text-krent">Hoi {name.split(" ")[0]}!</p>
                <p className="mt-1 text-sm text-oliebol">
                  {orders.length} {orders.length === 1 ? "stop" : "stops"} · {pieces} oliebollen
                  {computed.length ? ` · ${(Math.round(km * 10) / 10).toLocaleString("nl-NL")} km (± ${minutes} min)` : ""}
                  {trips.length > 1 ? ` · ${trips.length} ritten` : ""}
                  {firstStart ? ` · vertrek ${firstStart}` : ""}
                </p>
              </div>
              <button type="button" className={textAction} onClick={() => go(null, date)}>
                Wissel
              </button>
            </div>
            {trips.map((t) =>
              t.url ? (
                <a key={t.part || "rit"} className={`${primaryButton} min-h-[48px] text-base`} href={t.url} target="_blank" rel="noreferrer">
                  <Icon name="map" />
                  {trips.length > 1 ? `Start rit ${t.part || ""} in Google Maps` : "Start route in Google Maps"}
                </a>
              ) : null
            )}
            <p className="-mt-1 text-center text-xs text-muted">{trips.length > 1 ? "Elke rit start bij de loods in Aalsmeer." : "De route start bij de loods in Aalsmeer."}</p>
            {orders.length > 0 ? <ProgressBar label="Afgeleverd" done={deliveredCount} total={orders.length} /> : null}
          </Card>
          {error ? <Notice tone="error">{error}</Notice> : null}
          {allDelivered ? (
            <div className="grid justify-items-center gap-1 rounded-kaart bg-kerst-50 p-5 text-center">
              <p className="font-display text-[34px] uppercase leading-none text-kerst-ink">Alle bollen zijn binnen!</p>
              <p className="text-sm text-kerst-ink">
                {orders.length} van {orders.length} stops afgeleverd. Rij voorzichtig terug.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3">
            {stops.map((order, i) => {
              const note = effectiveNote(order, state.meta[order.id]);
              const packing = state.packing[order.id] ?? emptyPacking;
              const delivered = state.delivery[order.id];
              const trip = tripOf(order.id);
              const eta = trip?.route && !trip.stale ? trip.route.stopTimes[trip.route.orderIds.indexOf(order.id)] : "";
              const isNext = nextStop?.id === order.id;
              // With more than one trip, a small heading where each trip begins.
              const tripHead =
                trips.length > 1 && trip && trip.stops[0]?.id === order.id ? (
                  <p key={`kop-${trip.part}`} className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                    Rit {trip.part || ""}
                    {trip.route?.startTime && !trip.stale ? ` · vertrek ${trip.route.startTime} vanaf de loods` : ""}
                  </p>
                ) : null;
              if (delivered) {
                // Delivered stops fold into one quiet line.
                return [
                  tripHead,
                  <div key={order.id} className="flex items-center gap-3 px-1 py-1.5">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kerst text-sm font-bold text-meel">✓</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-muted">{order.locationName || order.contactPerson}</p>
                      <p className="text-xs text-muted">
                        Afgeleverd door {delivered.deliveredBy} om {delivered.deliveredAt.slice(11, 16)} ·{" "}
                        <button type="button" className={textAction} onClick={() => void markDelivered(order.id, false)}>
                          Ongedaan maken
                        </button>
                      </p>
                    </div>
                  </div>
                ];
              }
              return [
                tripHead,
                <Card key={order.id} className={`grid gap-3 ${isNext ? "ring-2 ring-feest" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums text-meel ${isNext ? "bg-feest" : "bg-krent"}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-krent">{order.locationName || order.contactPerson}</p>
                        {packing.packedBy ? <Badge tone="klaar">Ingepakt</Badge> : <Badge tone="aandacht">Nog inpakken</Badge>}
                      </div>
                      <p className="text-sm text-oliebol">{stopAddress(order)}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {[eta ? `Verwacht ${eta}` : order.plannedTime && `Gepland ${order.plannedTime}`, order.deliveryMoment, order.packaging, /^ja/i.test(order.flyers ?? "") ? "met flyers" : "", order.status !== "open" ? order.status : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <Bollenteller
                    compact
                    cells={[
                      { label: "Met", value: order.withRaisins },
                      { label: "Zonder", value: order.withoutRaisins },
                      { label: "Totaal", value: order.withRaisins + order.withoutRaisins }
                    ]}
                  />
                  {note ? <Note>{note}</Note> : null}
                  <div className="grid grid-cols-2 gap-2">
                    {order.phone ? (
                      <a className={secondaryButton} href={`tel:${order.phone}`}>
                        <Icon name="phone" />
                        Bellen
                      </a>
                    ) : (
                      <span />
                    )}
                    <a className={secondaryButton} href={mapsUrl(order)} target="_blank" rel="noreferrer">
                      <Icon name="map" />
                      Navigeren
                    </a>
                  </div>
                  <button type="button" className={bigButton} onClick={() => void markDelivered(order.id, true)}>
                    ✓ Afgeleverd
                  </button>
                </Card>
              ];
            })}
            {stops.length === 0 ? <EmptyState title={`Geen stops voor ${name} op deze dag.`} text="Kies een andere dag of wissel van bezorger." /> : null}
          </div>
        </>
      )}
    </div>
  );
}
