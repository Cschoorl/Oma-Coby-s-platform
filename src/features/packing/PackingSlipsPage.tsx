import { useMemo } from "react";
import type { DashboardState } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { EmptyState, Icon, formatDayLabel, pickInitialDate, primaryButton } from "../../components/ui";
import logoUrl from "../../assets/logo-oliebollenbar.svg";
import { OrderFilters } from "../orders/OrderFilters";
import { navigate } from "../../lib/router";
import { effectiveCourier, effectiveNote, stopAddress } from "../../utils/orderUtils";
import { PARTS } from "../routes/routeUtils";

const typeLabel: Record<Order["customerType"], string> = { particulier: "Particulier", zakelijk: "Zakelijk", barter: "Barter", onbekend: "" };

/** Printable packing slips: one block per order, sorted by courier and route order, pickups last. */
export function PackingSlipsPage({ state, date: dateParam }: { state: DashboardState; date: string | null }) {
  const dates = useMemo(() => Array.from(new Set(state.orders.map((o) => o.deliveryDate))).sort(), [state.orders]);
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : pickInitialDate(dates);

  const slips = useMemo(() => {
    const rank = (o: Order) => {
      const courier = effectiveCourier(o, state.meta[o.id]);
      // The courier's trip (dagdeel) that has this stop; morning trips first.
      const route = courier ? Object.values(state.routes).find((r) => r.date === date && r.courier === courier && r.orderIds.includes(o.id)) : undefined;
      const index = route ? route.orderIds.indexOf(o.id) : -1;
      const tripRank = Math.max(0, PARTS.indexOf((route?.part ?? "") as (typeof PARTS)[number]));
      return { courier, stop: index === -1 ? 999 : tripRank * 100 + index, eta: route && index !== -1 ? route.stopTimes[index] ?? "" : "" };
    };
    return state.orders
      .filter((o) => o.deliveryDate === date)
      .map((o) => ({ order: o, ...rank(o) }))
      .sort(
        (a, b) =>
          Number(a.order.fulfilment === "afhalen") - Number(b.order.fulfilment === "afhalen") ||
          (a.courier || "~").localeCompare(b.courier || "~") ||
          a.stop - b.stop ||
          (a.order.locationName || a.order.contactPerson).localeCompare(b.order.locationName || b.order.contactPerson)
      );
  }, [state, date]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <OrderFilters selectedDate={date} availableDates={dates} onDateChange={(d) => navigate(`/pakbonnen?datum=${d}`)} />
        <button type="button" className={primaryButton} onClick={() => window.print()}>
          <Icon name="print" />
          Printen
        </button>
      </div>
      <p className="text-sm text-oliebol print:hidden">
        {slips.length} pakbonnen voor {formatDayLabel(date)}, gesorteerd per bezorger in routevolgorde; afhalen staat achteraan. Knip ze los en leg ze bij de dozen.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
        {slips.map(({ order, courier, stop, eta }) => {
          const note = effectiveNote(order, state.meta[order.id]);
          const flyers = /^ja/i.test(order.flyers ?? "");
          return (
            <article key={order.id} className="break-inside-avoid rounded-md border-2 border-dashed border-[#777] bg-white p-3 text-sm text-black">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-2xl uppercase leading-none tracking-wide">{order.locationName || order.contactPerson}</p>
                  {order.locationName && order.contactPerson ? <p className="text-xs">t.a.v. {order.contactPerson}</p> : null}
                </div>
                <p className="shrink-0 text-right text-xs">
                  {formatDayLabel(order.deliveryDate)}
                  {typeLabel[order.customerType] ? <span className="block font-semibold">{typeLabel[order.customerType]}</span> : null}
                </p>
              </div>
              <p className="mt-1 text-xs">
                {order.fulfilment === "afhalen" ? `AFHALEN${order.pickupLocation ? ` · ${order.pickupLocation}` : ""}` : stopAddress(order)}
                {order.phone ? ` · ${order.phone}` : ""}
              </p>
              <div className="mt-2 grid grid-cols-3 border border-black text-center">
                {[
                  ["MET", order.withRaisins],
                  ["ZONDER", order.withoutRaisins],
                  ["TOTAAL", order.withRaisins + order.withoutRaisins]
                ].map(([label, n]) => (
                  <div key={label} className="border-r border-black py-1 last:border-r-0">
                    <p className="text-[10px] font-semibold">{label}</p>
                    <p className="text-lg font-bold tabular-nums">{n}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs">
                {[order.packaging, flyers ? "MET FLYERS" : "geen flyers", order.deliveryMoment].filter(Boolean).join(" · ")}
              </p>
              {order.fulfilment === "bezorgen" ? (
                <p className="mt-1 text-xs">
                  Bezorger: <span className="font-semibold">{courier || "nog niet ingedeeld"}</span>
                  {stop !== 999 ? ` · stop ${stop + 1}` : ""}
                  {eta ? ` · ± ${eta}` : ""}
                </p>
              ) : null}
              {note ? <p className="mt-1 border-t border-[#999] pt-1 text-xs italic">{note}</p> : null}
              <p className="mt-2 flex gap-4 text-[11px]">
                <span>☐ met</span>
                <span>☐ zonder</span>
                <span>☐ totaal</span>
                <span className="ml-auto">{order.id}</span>
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#999] pt-2 text-[10px]">
                <img src={logoUrl} alt="Oma Coby's Oliebollenbar" className="w-20 grayscale" />
                <span className="text-right">Met 10 oliebollen laat je 1 oudje rock en rollen.</span>
              </div>
            </article>
          );
        })}
      </div>
      {slips.length === 0 ? <EmptyState title="Geen orders op deze dag." text="Kies een andere leverdag." /> : null}
    </div>
  );
}
