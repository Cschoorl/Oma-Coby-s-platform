import { useMemo } from "react";
import type { DashboardState } from "../../types/dashboard";
import { emptyPacking } from "../../types/dashboard";
import { OrderFilters } from "../orders/OrderFilters";
import { SupplierPicker } from "../orders/SupplierPicker";
import { StatusBadge } from "../../components/StatusBadge";
import { Badge, Card, StatTile, formatDayLabel, pickInitialDate, primaryButton, secondaryButton } from "../../components/ui";
import { effectiveNote, mapsRouteUrlForOrders, mapsUrl, stopAddress } from "../../utils/orderUtils";
import { navigate } from "../../lib/router";
import { courierOrders, orderedStops, routeKey } from "./routeUtils";

interface CourierPageProps {
  state: DashboardState;
  name: string | null;
  date: string | null;
}

/** Mobile-first page per bezorger; this is the link that goes out via WhatsApp. */
export function CourierPage({ state, name, date: dateParam }: CourierPageProps) {
  const dates = useMemo(() => Array.from(new Set(state.orders.map((o) => o.deliveryDate))).sort(), [state.orders]);
  // The date lives in the link (#/bezorger?naam=..&datum=..), so a WhatsApp link opens the right day.
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : pickInitialDate(dates);

  const couriers = useMemo(
    () => Array.from(new Set(state.orders.filter((o) => o.deliveryDate === date).map((o) => o.supplierName))).sort(),
    [state.orders, date]
  );

  function go(nextName: string | null, nextDate: string) {
    navigate(nextName ? `/bezorger?naam=${encodeURIComponent(nextName)}&datum=${nextDate}` : `/bezorger?datum=${nextDate}`);
  }

  const orders = name ? courierOrders(state, date, name) : [];
  const route = name ? state.routes[routeKey(date, name)] : undefined;
  const stops = orderedStops(orders, route);
  const routeUrl = route?.mapsUrl || mapsRouteUrlForOrders(stops);
  const pieces = orders.reduce((sum, o) => sum + o.withRaisins + o.withoutRaisins, 0);

  return (
    <div className="grid gap-4">
      <OrderFilters selectedDate={date} availableDates={dates} onDateChange={(d) => go(name, d)} />
      {!name ? (
        <SupplierPicker supplierNames={couriers} selectedSupplier={null} onSelectSupplier={(n) => go(n, date)} />
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Bezorger</p>
                <p className="text-lg font-semibold text-stone-900">{name}</p>
                <p className="text-sm text-stone-600">{formatDayLabel(date)}</p>
              </div>
              <button type="button" className={secondaryButton} onClick={() => go(null, date)}>
                Andere bezorger
              </button>
            </div>
          </Card>
          <section className="grid grid-cols-3 gap-3">
            <StatTile label="Stops" value={orders.length} />
            <StatTile label="Oliebollen" value={pieces} />
            <StatTile label="Afstand" value={route ? `${route.km.toLocaleString("nl-NL")} km` : "–"} hint={route ? `± ${route.minutes} min` : "nog niet berekend"} />
          </section>
          {routeUrl ? (
            <a className={`${primaryButton} py-3 text-base`} href={routeUrl} target="_blank" rel="noreferrer">
              Start route in Google Maps
            </a>
          ) : null}
          <p className="text-center text-xs text-stone-600">De route start en eindigt bij de baklocatie in Aalsmeer.</p>

          <div className="grid gap-3">
            {stops.map((order, i) => {
              const note = effectiveNote(order, state.meta[order.id]);
              const packing = state.packing[order.id] ?? emptyPacking;
              return (
                <Card key={order.id} className="grid gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coby-600 text-sm font-bold text-white">{i + 1}</span>
                      <div>
                        <p className="font-semibold text-stone-900">{order.locationName || order.contactPerson}</p>
                        <p className="text-sm text-stone-600">{stopAddress(order)}</p>
                        {order.plannedTime ? <p className="text-xs text-stone-500">Gepland: {order.plannedTime}</p> : null}
                      </div>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-stone-50 p-2">
                      <p className="text-[11px] uppercase text-stone-500">Met</p>
                      <p className="text-lg font-semibold tabular-nums">{order.withRaisins}</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 p-2">
                      <p className="text-[11px] uppercase text-stone-500">Zonder</p>
                      <p className="text-lg font-semibold tabular-nums">{order.withoutRaisins}</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 p-2">
                      <p className="text-[11px] uppercase text-stone-500">Totaal</p>
                      <p className="text-lg font-semibold tabular-nums">{order.withRaisins + order.withoutRaisins}</p>
                    </div>
                  </div>
                  {note ? <p className="rounded-lg bg-coby-50 px-3 py-2 text-sm text-coby-900">Opmerking: {note}</p> : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {order.phone ? (
                      <a className={secondaryButton} href={`tel:${order.phone}`}>
                        Bel {order.contactPerson || "klant"}
                      </a>
                    ) : null}
                    <a className={secondaryButton} href={mapsUrl(order)} target="_blank" rel="noreferrer">
                      Navigeer
                    </a>
                    {packing.packedBy ? <Badge tone="green">Ingepakt door {packing.packedBy}</Badge> : <Badge tone="amber">Nog niet ingepakt</Badge>}
                  </div>
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
