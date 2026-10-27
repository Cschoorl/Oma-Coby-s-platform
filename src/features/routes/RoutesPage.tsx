import { useEffect, useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import { OrderFilters } from "../orders/OrderFilters";
import { Badge, Card, CopyButton, EmptyState, Icon, Notice, OliebolLoader, SectionTitle, StatStrip, fieldLabel, formatDayLabel, formatNumber, ghostButton, inputClass, pickInitialDate, primaryButton, secondaryButton, toast } from "../../components/ui";
import { Avatar } from "../../components/Avatar";
import { mapsRouteUrlForOrders, stopAddress } from "../../utils/orderUtils";
import { appLink } from "../../lib/router";
import { courierAvailability, courierCandidates, courierRuns, couriersOn, deliveryOrders, findVolunteer, guessMode, homeAddress, isRouteStale, orderPart, orderedStops, runRoute, toHhmm, transportOn, whatsappNumber } from "./routeUtils";
import { BIKE_MAX_PIECES, PLANNING, ROUTE_START_TIMES } from "../../config";
import { AutoPlanCard } from "./AutoPlanCard";
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
  // One flag for the whole run, so the loader does not restart between couriers.
  const [computingAll, setComputingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per trip ("courier|dagdeel"): vehicle and departure chosen on this page.
  const [modes, setModes] = useState<Record<string, "driving" | "bicycling">>({});
  const [startTimes, setStartTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (dates.length > 0 && !dates.includes(date)) setDate(pickInitialDate(dates));
  }, [dates, date]);

  const couriers = useMemo(() => couriersOn(state, date), [state, date]);
  const dayDeliveries = useMemo(() => deliveryOrders(state, date), [state, date]);
  const unassigned = dayDeliveries.filter((o) => !effectiveCourier(o, state.meta[o.id]));
  const pickups = state.orders.filter((o) => o.deliveryDate === date && o.fulfilment === "afhalen").length;

  // Every trip of the day: one per courier and dagdeel.
  const trips = useMemo(
    () =>
      couriers.flatMap((courier) => {
        const runs = courierRuns(state, date, courier);
        return runs.map((r, i) => ({ courier, part: r.part, orders: r.orders, last: i === runs.length - 1, route: runRoute(state, date, courier, r, runs.length === 1) }));
      }),
    [couriers, state, date]
  );

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

  const dayRoutes = trips.map((t) => t.route).filter(Boolean);
  const totalKm = dayRoutes.reduce((sum, r) => sum + (r?.km ?? 0), 0);
  const staleTrips = trips.filter((t) => isRouteStale(t.orders, t.route));
  const delivered = dayDeliveries.filter((o) => state.delivery[o.id]).length;

  const tripKey = (courier: string, part: string) => `${courier}|${part}`;
  const modeFor = (courier: string, part: string, orders: Order[]) =>
    modes[tripKey(courier, part)] ?? routeOf(courier, part)?.mode ?? guessMode(orders, findVolunteer(state.volunteers, courier), date);
  const routeOf = (courier: string, part: string) => trips.find((t) => t.courier === courier && t.part === part)?.route;
  const startFor = (courier: string, part: string) => {
    if (startTimes[tripKey(courier, part)]) return startTimes[tripKey(courier, part)];
    const saved = routeOf(courier, part)?.startTime;
    if (saved) return saved;
    // The start of the dagdeel the courier signed up for, else the default for the dagdeel.
    const v = findVolunteer(state.volunteers, courier);
    const slot = v ? courierAvailability(v, date).find((a) => a.part === part) : undefined;
    return slot ? toHhmm(slot.start) : ROUTE_START_TIMES[part] ?? ROUTE_START_TIMES[""];
  };
  /** The last trip of the day ends at the courier's home, when the address is known. */
  const endFor = (courier: string, last: boolean) => (last ? homeAddress(findVolunteer(state.volunteers, courier)) : "");

  async function computeTrip(trip: { courier: string; part: string; mode: "driving" | "bicycling"; startTime: string; endAddress: string; orders: Order[] }) {
    const id = tripKey(trip.courier, trip.part);
    setBusy(id);
    setError(null);
    try {
      await run(() =>
        backend.computeRoute(session, {
          date,
          courier: trip.courier,
          part: trip.part,
          mode: trip.mode,
          startTime: trip.startTime,
          endAddress: trip.endAddress,
          minutesPerStop: PLANNING.minutesPerStop,
          stops: trip.orders.map((o) => ({ orderId: o.id, address: stopAddress(o) }))
        })
      );
    } catch (err) {
      setError(`${trip.courier}${trip.part ? ` (${trip.part})` : ""}: ${err instanceof Error ? err.message : "route berekenen mislukt"}`);
    } finally {
      setBusy(null);
    }
  }

  const tripRequest = (t: (typeof trips)[number]) => ({
    courier: t.courier,
    part: t.part,
    mode: modeFor(t.courier, t.part, t.orders),
    startTime: startFor(t.courier, t.part),
    endAddress: endFor(t.courier, t.last),
    orders: t.orders
  });

  async function computeMany(list: Array<Parameters<typeof computeTrip>[0]>) {
    setComputingAll(true);
    try {
      for (const t of list) await computeTrip(t);
    } finally {
      setComputingAll(false);
    }
    toast("Alle routes berekend. De bezorgers kunnen op pad.");
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <OrderFilters selectedDate={date} availableDates={dates} onDateChange={setDate} />

      <StatStrip
        items={[
          { label: "Bezorgers", value: couriers.length, hint: trips.length > couriers.length ? `${trips.length} ritten` : undefined },
          { label: "Bezorgingen", value: dayDeliveries.length, hint: `${unassigned.length} nog in te delen${pickups ? ` · ${pickups} afhalen` : ""}` },
          { label: "Kilometers", value: `${formatNumber(Math.round(totalKm * 10) / 10)} km`, hint: `${dayRoutes.length} van ${trips.length} routes berekend` },
          { label: "Afgeleverd", value: `${delivered} / ${dayDeliveries.length}`, hint: "door de bezorgers afgevinkt" }
        ]}
      />

      {staleTrips.length > 0 ? (
        <Notice tone="warning">
          Na het berekenen zijn er bezorgingen bijgekomen, vervallen of verschoven bij {Array.from(new Set(staleTrips.map((t) => t.courier))).join(", ")}. De volgorde en tijden kloppen daar niet meer.{" "}
          <button type="button" className="font-bold underline underline-offset-4" disabled={busy !== null} onClick={() => void computeMany(staleTrips.map(tripRequest))}>
            Deze routes opnieuw berekenen
          </button>
        </Notice>
      ) : null}

      <AutoPlanCard state={state} session={session} date={date} orders={dayDeliveries} run={run} isDemo={isDemo} onApplied={(list) => computeMany(list)} />

      <CourierAssignment state={state} date={date} orders={dayDeliveries} busy={busy} onAssign={assign} />

      <section>
        <SectionTitle
          title={`Routes voor ${formatDayLabel(date)}`}
          subtitle={`Per bezorger en dagdeel de snelste volgorde vanaf de loods, met ${PLANNING.minutesPerStop} minuten per stop. De laatste rit eindigt bij huis. Stuur de route via WhatsApp.`}
          action={
            <button type="button" className={primaryButton} disabled={busy !== null || trips.length === 0} onClick={() => void computeMany(trips.map(tripRequest))}>
              Alle routes berekenen
            </button>
          }
        />
        {isDemo ? <p className="-mt-2 mb-3 text-xs text-gouwe-ink">Demo: kilometers zijn een schatting. Met de Sheet-koppeling rekent Google Maps de echte route.</p> : null}
        {/* Calculating routes calls Google Maps per trip: a real wait. Assigning a courier is quick and shows nothing. */}
        {computingAll || (busy && !busy.startsWith("assign-")) ? (
          <div className="mb-3">
            <OliebolLoader label="De routes worden berekend…" delay={600} />
          </div>
        ) : null}
        {error ? (
          <div className="mb-3">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {trips.map((trip) => {
            const { courier, part, orders, route } = trip;
            const id = tripKey(courier, part);
            const stale = isRouteStale(orders, route);
            const mode = modeFor(courier, part, orders);
            const stops = orderedStops(orders, route);
            const mapsUrl = route?.mapsUrl || mapsRouteUrlForOrders(stops);
            const volunteer = findVolunteer(state.volunteers, courier);
            const link = appLink(`/bezorger?naam=${encodeURIComponent(courier)}&datum=${date}`);
            const pieces = orders.reduce((sum, o) => sum + o.withRaisins + o.withoutRaisins, 0);
            const transport = volunteer ? transportOn(volunteer, date, part) : [];
            const warnings = [
              volunteer && mode === "driving" && !volunteer.roles.autokoerier.wants ? `${courier} heeft zich niet als autokoerier aangemeld.` : "",
              volunteer && mode === "bicycling" && !volunteer.roles.fietskoerier.wants ? `${courier} heeft zich niet als fietskoerier aangemeld.` : "",
              volunteer && transport.length === 0 ? `${courier} heeft zich niet voor ${part ? `de ${part} van ` : ""}deze dag aangemeld.` : "",
              mode === "bicycling" && pieces > BIKE_MAX_PIECES ? `${pieces} oliebollen is veel voor de fiets (richtlijn: max. ${BIKE_MAX_PIECES}). Overweeg een auto.` : ""
            ].filter(Boolean);
            const done = orders.filter((o) => state.delivery[o.id]).length;
            const message = [
              `Hoi ${courier}! Je bezorgroute voor ${formatDayLabel(date)}${part ? ` (${part})` : ""}:`,
              `${orders.length} stops, ${pieces} oliebollen${route ? `, ${route.km.toLocaleString("nl-NL")} km (± ${route.minutes} min)` : ""}.`,
              route?.startTime && !stale ? `Vertrek ${route.startTime} vanaf de loods in Aalsmeer.` : "",
              "",
              `Alle adressen, aantallen en opmerkingen: ${link}`,
              mapsUrl ? `Route in Google Maps: ${mapsUrl}` : "",
              "",
              "Inloggen met de bezorgerscode. Succes en bedankt!"
            ]
              .filter((line, i, all) => line !== "" || all[i - 1] !== "")
              .join("\n");
            const waUrl = `https://wa.me/${volunteer?.phone ? whatsappNumber(volunteer.phone) : ""}?text=${encodeURIComponent(message)}`;
            const ends = route ? route.endAddress : endFor(courier, trip.last);

            return (
              <Card key={id} className="grid content-start gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={courier} size={36} />
                    <div>
                      <p className="font-serif text-lg font-bold text-krent">
                        {courier}
                        {part ? <span className="font-sans text-sm font-normal text-oliebol"> · {part}</span> : null}
                      </p>
                      <p className="text-xs text-muted">
                        {orders.length} {orders.length === 1 ? "stop" : "stops"} · {pieces} oliebollen · {done} van {orders.length} afgeleverd
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {route ? (
                      <Badge tone={stale ? "aandacht" : "klaar"}>
                        {route.km.toLocaleString("nl-NL")} km · ± {route.minutes} min{stale ? " · verouderd" : ""}
                      </Badge>
                    ) : (
                      <Badge>Nog niet berekend</Badge>
                    )}
                    <select
                      className={`${inputClass} !w-auto py-1 text-xs`}
                      value={mode}
                      onChange={(e) => setModes((m) => ({ ...m, [id]: e.target.value as "driving" | "bicycling" }))}
                      aria-label={`Vervoer ${courier}${part ? ` ${part}` : ""}`}
                    >
                      <option value="driving">Auto</option>
                      <option value="bicycling">Fiets</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-muted">
                      Vertrek
                      <input
                        type="time"
                        className={`${inputClass} !w-28 py-1 text-xs`}
                        value={startFor(courier, part)}
                        onChange={(e) => setStartTimes((t) => ({ ...t, [id]: e.target.value }))}
                        aria-label={`Vertrektijd ${courier}${part ? ` ${part}` : ""}`}
                      />
                    </label>
                  </div>
                </div>
                {warnings.length > 0 ? (
                  <Notice tone="warning">
                    <ul className="grid gap-0.5 text-xs">
                      {warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </Notice>
                ) : null}

                <ol className="grid gap-1 text-sm text-krent">
                  {stops.map((o, i) => {
                    const eta = route && !stale ? route.stopTimes[route.orderIds.indexOf(o.id)] : "";
                    return (
                      <li key={o.id} className="flex gap-2">
                        <span className="w-5 shrink-0 text-right font-bold tabular-nums text-feest-ink">{i + 1}.</span>
                        <span className="w-11 shrink-0 tabular-nums text-muted">{eta || o.plannedTime || ""}</span>
                        <span className={state.delivery[o.id] ? "text-muted line-through" : ""}>
                          {o.locationName || o.contactPerson} · {stopAddress(o)}
                          {o.deliveryMoment ? <span className="text-muted"> · {o.deliveryMoment}</span> : null}
                        </span>
                        {state.delivery[o.id] ? <Badge tone="klaar">✓ {state.delivery[o.id].deliveredAt.slice(11, 16)}</Badge> : null}
                      </li>
                    );
                  })}
                </ol>
                <p className="-mt-1 text-xs text-muted">{ends ? `Eindigt bij huis (${ends}).` : "Eindigt weer bij de loods."}</p>

                <div className="flex flex-wrap items-center gap-1">
                  <a className={`${primaryButton} mr-1`} href={waUrl} target="_blank" rel="noreferrer">
                    <Icon name="whatsapp" />
                    Stuur via WhatsApp
                  </a>
                  <button type="button" className={ghostButton} disabled={busy !== null} onClick={() => void computeTrip(tripRequest(trip))}>
                    {busy === id ? "Berekenen…" : route ? "Opnieuw berekenen" : "Route berekenen"}
                  </button>
                  {mapsUrl ? (
                    <a className={ghostButton} href={mapsUrl} target="_blank" rel="noreferrer">
                      Google Maps
                    </a>
                  ) : null}
                  <CopyButton text={message} label="Kopieer bericht" done="Bericht gekopieerd" className={ghostButton} />
                </div>
                {!volunteer?.phone ? (
                  <p className="text-xs text-muted">Geen telefoonnummer van deze bezorger bij de aanmeldingen: WhatsApp vraagt zelf aan wie je het stuurt.</p>
                ) : null}
              </Card>
            );
          })}
        </div>
        {couriers.length === 0 ? <EmptyState title="Nog geen bezorgers ingedeeld." text="Maak hierboven een voorstel of deel de bezorgingen zelf in; daarna verschijnen hier de routes." /> : null}
      </section>
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
  // "Andere naam…" opens a small field in the row instead of a browser prompt.
  const [otherFor, setOtherFor] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("");

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
      {orders.length === 0 ? <p className="text-sm text-muted">Geen bezorgingen op deze dag.</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className={`border-b border-lijn-2 text-left ${fieldLabel}`}>
              <th className="py-2 pr-3 font-bold">Bezorging</th>
              <th className="py-2 pr-3 font-bold">Adres</th>
              <th className="py-2 pr-3 text-right font-bold">Bollen</th>
              <th className="py-2 font-bold">Bezorger</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((order) => {
              const current = effectiveCourier(order, state.meta[order.id]);
              const part = orderPart(order);
              const { available: fits, others } = courierCandidates(state.volunteers, date, part);
              return (
                <tr key={order.id} className="border-b border-lijn align-top last:border-0">
                  <td className="py-2.5 pr-3">
                    <p className="font-bold text-krent">{order.locationName || order.contactPerson}</p>
                    {order.deliveryMoment || part ? <p className="text-xs text-muted">{order.deliveryMoment || part}</p> : null}
                  </td>
                  <td className="py-2.5 pr-3 text-oliebol">{stopAddress(order)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{order.withRaisins + order.withoutRaisins}</td>
                  <td className="py-2">
                    {otherFor === order.id ? (
                      <form
                        className="flex gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!otherName.trim()) return;
                          void onAssign(order, otherName.trim());
                          setOtherFor(null);
                          setOtherName("");
                        }}
                      >
                        <input className={`${inputClass} py-1`} autoFocus placeholder="Naam van de bezorger" value={otherName} onChange={(e) => setOtherName(e.target.value)} aria-label="Naam van de bezorger" />
                        <button type="submit" className={`${primaryButton} min-h-[34px] px-3 py-1`}>
                          Indelen
                        </button>
                        <button type="button" className={`${secondaryButton} min-h-[34px] px-3 py-1`} onClick={() => setOtherFor(null)}>
                          ×
                        </button>
                      </form>
                    ) : (
                    <select
                      className={`${inputClass} py-1 ${current ? "" : "border-gouwe bg-gouwe-50"}`}
                      value={current}
                      disabled={busy === `assign-${order.id}`}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "__other") {
                          setOtherFor(order.id);
                          return;
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
                    )}
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

