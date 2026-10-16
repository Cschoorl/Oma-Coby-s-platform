import { useEffect, useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import { OrderFilters } from "../orders/OrderFilters";
import { Badge, Card, Notice, SectionTitle, StatTile, formatDayLabel, formatNumber, inputClass, pickInitialDate, primaryButton, secondaryButton } from "../../components/ui";
import { mapsRouteUrlForOrders, stopAddress } from "../../utils/orderUtils";
import { appLink } from "../../lib/router";
import { courierCandidates, courierOrders, couriersOn, deliveryOrders, findVolunteer, guessMode, isRouteStale, orderedStops, routeKey, whatsappNumber } from "./routeUtils";
import { effectiveCourier } from "../../utils/orderUtils";
import type { Order } from "../../types/order";

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

  const couriers = useMemo(() => couriersOn(state, date), [state, date]);
  const dayDeliveries = useMemo(() => deliveryOrders(state, date), [state, date]);
  const unassigned = dayDeliveries.filter((o) => !effectiveCourier(o, state.meta[o.id]));
  const pickups = state.orders.filter((o) => o.deliveryDate === date && o.fulfilment === "afhalen").length;

  async function assign(order: Order, courier: string) {
    setBusy(`assign-${order.id}`);
    setError(null);
    try {
      await run(() => backend.assignCourier(session, order.id, courier));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Indelen mislukt.");
    } finally {
      setBusy(null);
    }
  }

  const dayRoutes = couriers.map((c) => state.routes[routeKey(date, c)]).filter(Boolean);
  const totalKm = dayRoutes.reduce((sum, r) => sum + r.km, 0);

  async function compute(courier: string) {
    const orders = courierOrders(state, date, courier);
    const mode = modes[courier] ?? state.routes[routeKey(date, courier)]?.mode ?? guessMode(orders, findVolunteer(state.volunteers, courier));
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
        <StatTile label="Bezorgingen" value={dayDeliveries.length} hint={`${unassigned.length} nog in te delen${pickups ? ` · ${pickups} afhalen` : ""}`} />
        <StatTile label="Kilometers (berekend)" value={`${formatNumber(Math.round(totalKm * 10) / 10)} km`} hint={`${dayRoutes.length} van ${couriers.length} routes berekend`} />
      </section>

      <CourierAssignment state={state} date={date} orders={dayDeliveries} busy={busy} onAssign={assign} />

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
            const mode = modes[courier] ?? route?.mode ?? guessMode(orders, findVolunteer(state.volunteers, courier));
            const stops = orderedStops(orders, route);
            const mapsUrl = route?.mapsUrl || mapsRouteUrlForOrders(stops);
            const volunteer = findVolunteer(state.volunteers, courier);
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
          {couriers.length === 0 ? <p className="text-sm text-stone-600">Nog geen bezorgers ingedeeld op deze dag.</p> : null}
        </div>
      </Card>
    </div>
  );
}

interface CourierAssignmentProps {
  state: DashboardState;
  date: string;
  orders: Order[];
  busy: string | null;
  onAssign: (order: Order, courier: string) => Promise<void>;
}

/** Table to divide the day's deliveries over couriers; volunteers available that day come first. */
function CourierAssignment({ state, date, orders, busy, onAssign }: CourierAssignmentProps) {
  const { available, others } = courierCandidates(state.volunteers, date);
  const assignedNames = Array.from(new Set(orders.map((o) => effectiveCourier(o, state.meta[o.id])).filter(Boolean)));
  const known = new Set([...available, ...others].map((v) => v.name));
  const extra = assignedNames.filter((n) => !known.has(n));
  const sorted = [...orders].sort((a, b) => (a.city + a.address).localeCompare(b.city + b.address));

  const transportLabel = (name: string) => {
    const v = findVolunteer(state.volunteers, name);
    if (!v) return "";
    return [v.roles.fietskoerier.wants ? (v.cargoBike ? "bakfiets" : "fiets") : "", v.roles.autokoerier.wants ? "auto" : ""].filter(Boolean).join("/");
  };

  return (
    <Card>
      <SectionTitle
        title="Bezorgers indelen"
        subtitle={`${available.length} koeriers hebben zich voor ${formatDayLabel(date)} aangemeld. Kies per bezorging wie hem rijdt.`}
      />
      {orders.length === 0 ? <p className="text-sm text-stone-600">Geen bezorgingen op deze dag.</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="py-2 pr-3 font-semibold">Bezorging</th>
              <th className="py-2 pr-3 font-semibold">Adres</th>
              <th className="py-2 pr-3 text-right font-semibold">Bollen</th>
              <th className="py-2 font-semibold">Bezorger</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((order) => {
              const current = effectiveCourier(order, state.meta[order.id]);
              return (
                <tr key={order.id} className="border-t border-stone-100 align-top">
                  <td className="py-2 pr-3">
                    <p className="font-semibold text-stone-900">{order.locationName || order.contactPerson}</p>
                    {order.deliveryMoment ? <p className="text-xs text-stone-500">{order.deliveryMoment}</p> : null}
                  </td>
                  <td className="py-2 pr-3 text-stone-700">{stopAddress(order)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{order.withRaisins + order.withoutRaisins}</td>
                  <td className="py-2">
                    <select
                      className={`${inputClass} py-1 ${current ? "" : "border-amber-400 bg-amber-50"}`}
                      value={current}
                      disabled={busy === `assign-${order.id}`}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (value === "__other") {
                          value = window.prompt("Naam van de bezorger") ?? "";
                          if (!value.trim()) return;
                        }
                        void onAssign(order, value);
                      }}
                      aria-label={`Bezorger voor ${order.locationName}`}
                    >
                      <option value="">Nog niet ingedeeld</option>
                      {available.length > 0 ? (
                        <optgroup label="Beschikbaar deze dag">
                          {available.map((v) => (
                            <option key={v.id} value={v.name}>
                              {v.name} ({transportLabel(v.name)})
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {others.length > 0 ? (
                        <optgroup label="Andere koeriers">
                          {others.map((v) => (
                            <option key={v.id} value={v.name}>
                              {v.name} ({transportLabel(v.name)})
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {extra.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      <option value="__other">Andere naam…</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

