import { useEffect, useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import { OrderFilters } from "../orders/OrderFilters";
import { Badge, Card, Notice, SectionTitle, StatStrip, formatDayLabel, formatNumber, ghostButton, inputClass, pickInitialDate, primaryButton } from "../../components/ui";
import { mapsRouteUrlForOrders, stopAddress } from "../../utils/orderUtils";
import { appLink } from "../../lib/router";
import { courierCandidates, courierOrders, couriersOn, deliveryOrders, findVolunteer, guessMode, isRouteStale, orderPart, orderedStops, routeKey, transportOn, whatsappNumber } from "./routeUtils";
import { BIKE_MAX_PIECES, ROUTE_START_TIMES } from "../../config";
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
  const [startTimes, setStartTimes] = useState<Record<string, string>>({});

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
  const staleCouriers = couriers.filter((c) => isRouteStale(courierOrders(state, date, c), state.routes[routeKey(date, c)]));
  const delivered = dayDeliveries.filter((o) => state.delivery[o.id]).length;

  const modeFor = (courier: string) =>
    modes[courier] ?? state.routes[routeKey(date, courier)]?.mode ?? guessMode(courierOrders(state, date, courier), findVolunteer(state.volunteers, courier), date);
  const startFor = (courier: string) => {
    if (startTimes[courier]) return startTimes[courier];
    const saved = state.routes[routeKey(date, courier)]?.startTime;
    if (saved) return saved;
    // Earliest dagdeel among the stops decides the default departure.
    const parts = courierOrders(state, date, courier).map(orderPart);
    const first = ["ochtend", "middag", "avond"].find((p) => parts.includes(p)) ?? "";
    return ROUTE_START_TIMES[first];
  };

  async function compute(courier: string) {
    const orders = courierOrders(state, date, courier);
    const mode = modeFor(courier);
    setBusy(courier);
    setError(null);
    try {
      await run(() =>
        backend.computeRoute(session, {
          date,
          courier,
          mode,
          startTime: startFor(courier),
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

      <StatStrip
        items={[
          { label: "Bezorgers", value: couriers.length },
          { label: "Bezorgingen", value: dayDeliveries.length, hint: `${unassigned.length} nog in te delen${pickups ? ` · ${pickups} afhalen` : ""}` },
          { label: "Kilometers", value: `${formatNumber(Math.round(totalKm * 10) / 10)} km`, hint: `${dayRoutes.length} van ${couriers.length} routes berekend` },
          { label: "Afgeleverd", value: `${delivered} / ${dayDeliveries.length}`, hint: "door de bezorgers afgevinkt" }
        ]}
      />

      {staleCouriers.length > 0 ? (
        <Notice tone="warning">
          Na het berekenen zijn er bezorgingen bijgekomen, vervallen of verschoven bij {staleCouriers.join(", ")}. De volgorde en tijden kloppen daar niet meer.{" "}
          <button type="button" className="font-semibold underline" disabled={busy !== null} onClick={() => void (async () => { for (const c of staleCouriers) await compute(c); })()}>
            Deze routes opnieuw berekenen
          </button>
        </Notice>
      ) : null}

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
        {isDemo ? <p className="-mt-2 mb-3 text-xs text-amber-800">Demo: kilometers zijn een schatting. Met de Sheet-koppeling rekent Google Maps de echte route.</p> : null}
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
            const mode = modeFor(courier);
            const stops = orderedStops(orders, route);
            const mapsUrl = route?.mapsUrl || mapsRouteUrlForOrders(stops);
            const volunteer = findVolunteer(state.volunteers, courier);
            const link = appLink(`/bezorger?naam=${encodeURIComponent(courier)}&datum=${date}`);
            const pieces = orders.reduce((sum, o) => sum + o.withRaisins + o.withoutRaisins, 0);
            const transport = volunteer ? transportOn(volunteer, date) : [];
            const warnings = [
              volunteer && mode === "driving" && !volunteer.roles.autokoerier.wants ? `${courier} heeft zich niet als autokoerier aangemeld.` : "",
              volunteer && mode === "bicycling" && !volunteer.roles.fietskoerier.wants ? `${courier} heeft zich niet als fietskoerier aangemeld.` : "",
              volunteer && transport.length === 0 ? `${courier} heeft zich niet voor deze dag aangemeld.` : "",
              mode === "bicycling" && pieces > BIKE_MAX_PIECES ? `${pieces} oliebollen is veel voor de fiets (richtlijn: max. ${BIKE_MAX_PIECES}). Overweeg een auto.` : ""
            ].filter(Boolean);
            const done = orders.filter((o) => state.delivery[o.id]).length;
            const message = [
              `Hoi ${courier}! Je bezorgroute voor ${formatDayLabel(date)}:`,
              `${orders.length} stops, ${pieces} oliebollen${route ? `, ${route.km.toLocaleString("nl-NL")} km (± ${route.minutes} min)` : ""}.`,
              route?.startTime && !stale ? `Vertrek ${route.startTime} vanaf de baklocatie.` : "",
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
                      {orders.length} {orders.length === 1 ? "stop" : "stops"} · {pieces} oliebollen · {done} van {orders.length} afgeleverd
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
                      className={`${inputClass} !w-auto py-1 text-xs`}
                      value={mode}
                      onChange={(e) => setModes((m) => ({ ...m, [courier]: e.target.value as "driving" | "bicycling" }))}
                      aria-label="Vervoer"
                    >
                      <option value="driving">Auto</option>
                      <option value="bicycling">Fiets</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-stone-600">
                      Vertrek
                      <input
                        type="time"
                        className={`${inputClass} !w-28 py-1 text-xs`}
                        value={startFor(courier)}
                        onChange={(e) => setStartTimes((t) => ({ ...t, [courier]: e.target.value }))}
                        aria-label={`Vertrektijd ${courier}`}
                      />
                    </label>
                  </div>
                </div>
                {warnings.length > 0 ? (
                  <ul className="grid gap-1 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}

                <ol className="grid gap-1 text-sm text-stone-700">
                  {stops.map((o, i) => {
                    const eta = route && !stale ? route.stopTimes[route.orderIds.indexOf(o.id)] : "";
                    return (
                      <li key={o.id} className="flex gap-2">
                        <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-coby-700">{i + 1}.</span>
                        <span className="w-11 shrink-0 tabular-nums text-stone-500">{eta || o.plannedTime || ""}</span>
                        <span className={state.delivery[o.id] ? "text-stone-400 line-through" : ""}>
                          {o.locationName || o.contactPerson} — {stopAddress(o)}
                          {o.deliveryMoment ? <span className="text-stone-500"> · {o.deliveryMoment}</span> : null}
                        </span>
                        {state.delivery[o.id] ? <span className="text-xs text-emerald-700">✓ {state.delivery[o.id].deliveredAt.slice(11, 16)}</span> : null}
                      </li>
                    );
                  })}
                </ol>

                <div className="flex flex-wrap items-center gap-1">
                  <a className={`${primaryButton} mr-1`} href={waUrl} target="_blank" rel="noreferrer">
                    Stuur via WhatsApp
                  </a>
                  <button type="button" className={ghostButton} disabled={busy !== null} onClick={() => void compute(courier)}>
                    {busy === courier ? "Berekenen…" : route ? "Opnieuw berekenen" : "Route berekenen"}
                  </button>
                  {mapsUrl ? (
                    <a className={ghostButton} href={mapsUrl} target="_blank" rel="noreferrer">
                      Google Maps
                    </a>
                  ) : null}
                  <button type="button" className={ghostButton} onClick={() => void navigator.clipboard?.writeText(message)}>
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
  const { available } = courierCandidates(state.volunteers, date);
  const assignedNames = Array.from(new Set(orders.map((o) => effectiveCourier(o, state.meta[o.id])).filter(Boolean)));
  const known = new Set(state.volunteers.map((v) => v.name));
  const extra = assignedNames.filter((n) => !known.has(n));
  const sorted = [...orders].sort((a, b) => (a.city + a.address).localeCompare(b.city + b.address));

  const transportLabel = (name: string, part = "") => {
    const v = findVolunteer(state.volunteers, name);
    if (!v) return "";
    const on = transportOn(v, date, part);
    const kinds = on.length ? on : [v.roles.fietskoerier.wants ? "fiets" : "", v.roles.autokoerier.wants ? "auto" : ""].filter(Boolean);
    return kinds.map((k) => (k === "fiets" && v.cargoBike ? "bakfiets" : k)).join("/");
  };

  return (
    <Card>
      <SectionTitle
        title="Bezorgers indelen"
        subtitle={`${available.length} koeriers hebben zich voor ${formatDayLabel(date)} aangemeld. Per bezorging staan bovenaan wie in dat dagdeel kan, met fiets of auto.`}
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
              const part = orderPart(order);
              const { available: fits, others } = courierCandidates(state.volunteers, date, part);
              return (
                <tr key={order.id} className="border-t border-stone-100 align-top">
                  <td className="py-2 pr-3">
                    <p className="font-semibold text-stone-900">{order.locationName || order.contactPerson}</p>
                    {order.deliveryMoment || part ? <p className="text-xs text-stone-500">{order.deliveryMoment || part}</p> : null}
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
                      {fits.length > 0 ? (
                        <optgroup label={part ? `Beschikbaar in de ${part}` : "Beschikbaar deze dag"}>
                          {fits.map((v) => (
                            <option key={v.id} value={v.name}>
                              {v.name} ({transportLabel(v.name, part)})
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {others.length > 0 ? (
                        <optgroup label="Niet aangemeld voor dit moment">
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

