import { useEffect, useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import { OrderFilters } from "../orders/OrderFilters";
import { Badge, Card, Notice, SectionTitle, StatTile, formatDayLabel, formatNumber, inputClass, pickInitialDate, primaryButton, secondaryButton } from "../../components/ui";
import { mapsRouteUrlForOrders, stopAddress } from "../../utils/orderUtils";
import { appLink } from "../../lib/router";
import { courierOrders, guessMode, isRouteStale, orderedStops, routeKey, whatsappNumber } from "./routeUtils";

interface RoutesPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
  isDemo: boolean;
}

export function RoutesPage({ state, session, run, isDemo }: RoutesPageProps) {
  const dates = useMemo(() => Array.from(new Set(state.orders.map((o) => o.deliveryDate))).sort(), [state.orders]);
  const [date, setDate] = useState(() => pickInitialDate(dates));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modes, setModes] = useState<Record<string, "driving" | "bicycling">>({});

  useEffect(() => {
    if (dates.length > 0 && !dates.includes(date)) setDate(pickInitialDate(dates));
  }, [dates, date]);

  const couriers = useMemo(
    () => Array.from(new Set(state.orders.filter((o) => o.deliveryDate === date).map((o) => o.supplierName))).sort(),
    [state.orders, date]
  );

  const dayRoutes = couriers.map((c) => state.routes[routeKey(date, c)]).filter(Boolean);
  const totalKm = dayRoutes.reduce((sum, r) => sum + r.km, 0);

  async function compute(courier: string) {
    const orders = courierOrders(state, date, courier);
    const mode = modes[courier] ?? state.routes[routeKey(date, courier)]?.mode ?? guessMode(orders);
    setBusy(courier);
    setError(null);
    try {
      await run(() =>
        backend.computeRoute(session, {
          date,
          courier,
          mode,
          stops: orders.map((o) => ({ orderId: o.id, address: stopAddress(o) }))
        })
      );
    } catch (err) {
      setError(`${courier}: ${err instanceof Error ? err.message : "route berekenen mislukt"}`);
    } finally {
      setBusy(null);
    }
  }

  async function computeAll() {
    for (const courier of couriers) await compute(courier);
  }

  return (
    <div className="grid gap-4">
      <OrderFilters selectedDate={date} availableDates={dates} onDateChange={setDate} />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Bezorgers" value={couriers.length} />
        <StatTile label="Stops" value={state.orders.filter((o) => o.deliveryDate === date).length} />
        <StatTile label="Kilometers (berekend)" value={`${formatNumber(Math.round(totalKm * 10) / 10)} km`} hint={`${dayRoutes.length} van ${couriers.length} routes berekend`} />
      </section>

      <Card>
        <SectionTitle
          title={`Routes voor ${formatDayLabel(date)}`}
          subtitle="Bereken per bezorger de snelste volgorde en de kilometers vanaf de baklocatie, en stuur de route via WhatsApp."
          action={
            <button type="button" className={primaryButton} disabled={busy !== null || couriers.length === 0} onClick={() => void computeAll()}>
              Alle routes berekenen
            </button>
          }
        />
        {isDemo ? (
          <div className="mb-3">
            <Notice tone="warning">Demo-modus: kilometers zijn een schatting. Met de Google Sheet-koppeling rekent Google Maps de echte route uit.</Notice>
          </div>
        ) : null}
        {error ? (
          <div className="mb-3">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}

        <div className="grid gap-3">
          {couriers.map((courier) => {
            const orders = courierOrders(state, date, courier);
            const route = state.routes[routeKey(date, courier)];
            const stale = isRouteStale(orders, route);
            const mode = modes[courier] ?? route?.mode ?? guessMode(orders);
            const stops = orderedStops(orders, route);
            const mapsUrl = route?.mapsUrl || mapsRouteUrlForOrders(stops);
            const volunteer = state.volunteers.find((v) => v.name.trim().toLowerCase() === courier.trim().toLowerCase());
            const link = appLink(`/bezorger?naam=${encodeURIComponent(courier)}&datum=${date}`);
            const pieces = orders.reduce((sum, o) => sum + o.withRaisins + o.withoutRaisins, 0);
            const message = [
              `Hoi ${courier}! Je bezorgroute voor ${formatDayLabel(date)}:`,
              `${orders.length} stops, ${pieces} oliebollen${route ? `, ${route.km.toLocaleString("nl-NL")} km (± ${route.minutes} min)` : ""}.`,
              "",
              `Alle adressen, aantallen en opmerkingen: ${link}`,
              mapsUrl ? `Route in Google Maps: ${mapsUrl}` : "",
              "",
              "Inloggen met de bezorgerscode. Succes en bedankt!"
            ]
              .filter((line, i, all) => line !== "" || all[i - 1] !== "")
              .join("\n");
            const waUrl = `https://wa.me/${volunteer?.phone ? whatsappNumber(volunteer.phone) : ""}?text=${encodeURIComponent(message)}`;

            return (
              <article key={courier} className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-stone-900">{courier}</p>
                    <p className="text-xs text-stone-600">
                      {orders.length} stops · {pieces} oliebollen
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {route ? (
                      <Badge tone={stale ? "amber" : "green"}>
                        {route.km.toLocaleString("nl-NL")} km · ± {route.minutes} min{stale ? " · verouderd" : ""}
                      </Badge>
                    ) : (
                      <Badge>Nog niet berekend</Badge>
                    )}
                    <select
                      className={`${inputClass} w-auto py-1 text-xs`}
                      value={mode}
                      onChange={(e) => setModes((m) => ({ ...m, [courier]: e.target.value as "driving" | "bicycling" }))}
                      aria-label="Vervoer"
                    >
                      <option value="driving">Auto</option>
                      <option value="bicycling">Fiets</option>
                    </select>
                  </div>
                </div>

                <ol className="grid gap-1 text-sm text-stone-700">
                  {stops.map((o, i) => (
                    <li key={o.id} className="flex gap-2">
                      <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-coby-700">{i + 1}.</span>
                      <span>
                        {o.locationName || o.contactPerson} — {stopAddress(o)}
                        {o.plannedTime ? <span className="text-stone-500"> · {o.plannedTime}</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>

                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondaryButton} disabled={busy !== null} onClick={() => void compute(courier)}>
                    {busy === courier ? "Berekenen…" : route ? "Opnieuw berekenen" : "Route berekenen"}
                  </button>
                  {mapsUrl ? (
                    <a className={secondaryButton} href={mapsUrl} target="_blank" rel="noreferrer">
                      Open in Google Maps
                    </a>
                  ) : null}
                  <a className={primaryButton} href={waUrl} target="_blank" rel="noreferrer">
                    Stuur via WhatsApp
                  </a>
                  <button type="button" className={secondaryButton} onClick={() => void navigator.clipboard?.writeText(message)}>
                    Kopieer bericht
                  </button>
                </div>
                {!volunteer?.phone ? (
                  <p className="text-xs text-stone-500">Geen telefoonnummer van deze bezorger bij de aanmeldingen: WhatsApp vraagt zelf aan wie je het stuurt.</p>
                ) : null}
              </article>
            );
          })}
          {couriers.length === 0 ? <p className="text-sm text-stone-600">Geen bezorgingen op deze dag.</p> : null}
        </div>
      </Card>
    </div>
  );
}
