import { useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { Badge, Card, Notice, OliebolLoader, SectionTitle, fieldLabel, formatDayLabel, inputClass, primaryButton, secondaryButton, toast } from "../../components/ui";
import { PLANNING } from "../../config";
import { effectiveCourier, stopAddress } from "../../utils/orderUtils";
import { describeWindow, makePlan, type Plan, type PlanRun } from "./planner";
import { courierAvailability, homeAddress, toHhmm } from "./routeUtils";

const vehicleLabel: Record<PlanRun["vehicle"], string> = { fiets: "fiets", bakfiets: "bakfiets", auto: "auto" };

interface AutoPlanCardProps {
  state: DashboardState;
  session: Session;
  date: string;
  orders: Order[];
  run: (change: () => Promise<unknown>) => Promise<void>;
  /** After applying: calculate the real routes with Google Maps, trip by trip. */
  onApplied: (trips: Array<{ courier: string; part: string; mode: "driving" | "bicycling"; startTime: string; endAddress: string; orders: Order[] }>) => Promise<void>;
  isDemo: boolean;
}

/**
 * Makes a proposal for who delivers what: by dagdeel and transport people signed up with, the
 * time per stop, every trip starting at the loods and the last trip ending near home.
 */
export function AutoPlanCard({ state, session, date, orders, run, onApplied, isDemo }: AutoPlanCardProps) {
  const [keepManual, setKeepManual] = useState(true);
  const [perStop, setPerStop] = useState(PLANNING.minutesPerStop);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<"plan" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const couriers = state.volunteers.filter((v) => courierAvailability(v, date).length > 0);
  const manual = orders.filter((o) => effectiveCourier(o, state.meta[o.id])).length;

  async function propose() {
    setBusy("plan");
    setError(null);
    setPlan(null);
    try {
      const addresses = Array.from(new Set([...orders.map(stopAddress), ...couriers.map(homeAddress)].filter(Boolean)));
      const geo = await backend.geocode(session, addresses);
      if (!geo.start.point) throw new Error(`Het adres van de loods (${geo.start.address}) is niet gevonden.`);
      const locked: Record<string, string> = {};
      if (keepManual) for (const o of orders) if (effectiveCourier(o, state.meta[o.id])) locked[o.id] = effectiveCourier(o, state.meta[o.id]);
      setPlan(makePlan({ orders, volunteers: state.volunteers, date, locked, start: geo.start.point, points: geo.points, minutesPerStop: perStop }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Het voorstel maken is mislukt.");
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    if (!plan) return;
    setBusy("apply");
    setError(null);
    try {
      const assignments = plan.runs.flatMap((r) => r.stops.map((s) => ({ orderId: s.order.id, courier: r.courier }))).filter((a) => effectiveCourier(orders.find((o) => o.id === a.orderId)!, state.meta[a.orderId]) !== a.courier);
      if (assignments.length > 0) await run(() => backend.assignCouriers(session, assignments));
      const trips = plan.runs.map((r) => ({
        courier: r.courier,
        part: r.part,
        mode: (r.vehicle === "auto" ? "driving" : "bicycling") as "driving" | "bicycling",
        startTime: toHhmm(r.depart),
        endAddress: r.endsAtHome ? r.homeAddress : "",
        orders: r.stops.map((s) => s.order)
      }));
      setPlan(null);
      toast(`${assignments.length} ${assignments.length === 1 ? "bezorging" : "bezorgingen"} ingedeeld. Nu de routes…`);
      await onApplied(trips);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Overnemen is mislukt.");
    } finally {
      setBusy(null);
    }
  }

  const planned = plan ? plan.runs.reduce((s, r) => s + r.stops.length, 0) : 0;

  return (
    <Card>
      <SectionTitle
        title="Automatisch indelen"
        subtitle={`Een voorstel voor ${formatDayLabel(date)}: wie wanneer kan (dagdeel, fiets of auto), ${perStop} minuten per stop, elke rit vanaf de loods en de laatste rit eindigt zo dicht mogelijk bij huis.`}
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          <span className={fieldLabel}>Minuten per stop</span>
          <input type="number" min={5} max={45} step={5} className={`${inputClass} !w-24`} value={perStop} onChange={(e) => setPerStop(Math.max(5, Number(e.target.value) || PLANNING.minutesPerStop))} />
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm text-krent">
          <input type="checkbox" className="h-4 w-4 accent-krent" checked={keepManual} onChange={(e) => setKeepManual(e.target.checked)} />
          Bestaande indeling houden{manual ? ` (${manual})` : ""}
        </label>
        <button type="button" className={primaryButton} disabled={busy !== null || orders.length === 0} onClick={() => void propose()}>
          {plan ? "Opnieuw voorstellen" : "Maak een voorstel"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        {couriers.length} {couriers.length === 1 ? "koerier heeft" : "koeriers hebben"} zich voor deze dag aangemeld. Er verandert pas iets als je het voorstel overneemt.
        {isDemo ? " Demo: afstanden zijn geschat op plaatsnaam." : ""}
      </p>

      {busy === "plan" ? (
        <div className="mt-3">
          <OliebolLoader label="Adressen opzoeken en puzzelen…" delay={600} />
        </div>
      ) : null}
      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      {plan ? (
        <div className="mt-4 grid gap-4 border-t border-lijn pt-4">
          <p className="text-sm text-krent">
            <span className="font-bold">
              {planned} van {orders.length}
            </span>{" "}
            bezorgingen verdeeld over <span className="font-bold">{plan.runs.length}</span> {plan.runs.length === 1 ? "rit" : "ritten"}
            {plan.unassigned.length > 0 ? (
              <>
                , <span className="font-bold text-feest-ink">{plan.unassigned.length} past niet</span>
              </>
            ) : null}
            .
          </p>

          {plan.unassigned.length > 0 ? (
            <Notice tone="warning">
              <p className="font-bold">Nog zonder bezorger</p>
              <ul className="mt-1 grid gap-0.5 text-xs">
                {plan.unassigned.map(({ order, reason }) => (
                  <li key={order.id}>
                    <span className="font-bold">{order.locationName || order.contactPerson}</span> ({order.withRaisins + order.withoutRaisins} bollen
                    {order.deliveryMoment ? `, ${order.deliveryMoment}` : ""}): {reason}
                  </li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {plan.notes.length > 0 ? (
            <ul className="grid gap-0.5 text-xs text-muted">
              {plan.notes.map((n) => (
                <li key={n}>· {n}</li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-2">
            {plan.runs.map((r) => (
              <div key={`${r.courier}|${r.part}`} className="rounded-kaart bg-meel/60 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-serif text-base font-bold text-krent">
                      {r.courier}
                      {r.part ? <span className="font-sans text-sm font-normal text-oliebol"> · {r.part}</span> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {vehicleLabel[r.vehicle]} · {describeWindow(r)} · {r.stops.length} {r.stops.length === 1 ? "stop" : "stops"} · {r.pieces} van max. {r.capacity} bollen
                    </p>
                  </div>
                  <Badge tone={r.finish > r.end ? "aandacht" : "klaar"}>± {Math.round(r.km)} km · klaar {toHhmm(r.finish)}</Badge>
                </div>
                <ol className="mt-2 grid gap-0.5 text-sm">
                  <li className="flex gap-2 text-xs text-muted">
                    <span className="w-11 shrink-0 tabular-nums">{toHhmm(r.depart)}</span>
                    <span>Vertrek vanaf de loods</span>
                  </li>
                  {r.stops.map((s, i) => (
                    <li key={s.order.id} className="flex gap-2">
                      <span className="w-11 shrink-0 tabular-nums text-muted">{toHhmm(s.eta)}</span>
                      <span className="text-krent">
                        <span className="font-bold text-feest-ink">{i + 1}.</span> {s.order.locationName || s.order.contactPerson}
                        <span className="text-muted"> · {s.order.city || stopAddress(s.order)}</span>
                        {r.lockedIds.includes(s.order.id) ? <span className="text-muted"> · vast</span> : null}
                      </span>
                    </li>
                  ))}
                  <li className="flex gap-2 text-xs text-muted">
                    <span className="w-11 shrink-0" />
                    <span>{r.endsAtHome ? `Daarna naar huis (${r.volunteer?.city || "woonadres"})` : "Terug naar de loods"}</span>
                  </li>
                </ol>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={primaryButton} disabled={busy !== null || plan.runs.length === 0} onClick={() => void apply()}>
              {busy === "apply" ? "Bezig…" : "Voorstel overnemen en routes berekenen"}
            </button>
            <button type="button" className={secondaryButton} disabled={busy !== null} onClick={() => setPlan(null)}>
              Annuleren
            </button>
            <p className="text-xs text-muted">Tijden en kilometers zijn een schatting; Google Maps rekent daarna de echte route.</p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
