import { useEffect, useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState, PackingPart, PackingState } from "../../types/dashboard";
import { emptyPacking } from "../../types/dashboard";
import type { CustomerType, Order } from "../../types/order";
import { OrderFilters } from "../orders/OrderFilters";
import { Badge, Card, Notice, SectionTitle, formatNumber, pickInitialDate, primaryButton, secondaryButton } from "../../components/ui";
import { effectiveNote } from "../../utils/orderUtils";

interface PackingPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
}

type Filter = "open" | "mine" | "done" | "all";

const customerLabel: Record<CustomerType, string> = { particulier: "Particulier", zakelijk: "Zakelijk (B2B)", onbekend: "Onbekend" };

function packingOf(state: DashboardState, orderId: string): PackingState {
  return state.packing[orderId] ?? emptyPacking;
}

export function PackingPage({ state, session, run }: PackingPageProps) {
  const dates = useMemo(() => Array.from(new Set(state.orders.map((o) => o.deliveryDate))).sort(), [state.orders]);
  const [date, setDate] = useState(() => pickInitialDate(dates));
  const [filter, setFilter] = useState<Filter>("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dates.length > 0 && !dates.includes(date)) setDate(pickInitialDate(dates));
  }, [dates, date]);

  const dayOrders = useMemo(
    () => state.orders.filter((o) => o.deliveryDate === date).sort((a, b) => a.plannedTime.localeCompare(b.plannedTime)),
    [state.orders, date]
  );

  const totals = useMemo(() => {
    const byType: Record<CustomerType, { met: number; zonder: number }> = {
      particulier: { met: 0, zonder: 0 },
      zakelijk: { met: 0, zonder: 0 },
      onbekend: { met: 0, zonder: 0 }
    };
    let packedMet = 0;
    let packedZonder = 0;
    let packedOrders = 0;
    for (const order of dayOrders) {
      byType[order.customerType].met += order.withRaisins;
      byType[order.customerType].zonder += order.withoutRaisins;
      if (packingOf(state, order.id).packedBy) {
        packedMet += order.withRaisins;
        packedZonder += order.withoutRaisins;
        packedOrders += 1;
      }
    }
    const met = byType.particulier.met + byType.zakelijk.met + byType.onbekend.met;
    const zonder = byType.particulier.zonder + byType.zakelijk.zonder + byType.onbekend.zonder;
    return { byType, met, zonder, packedMet, packedZonder, packedOrders };
  }, [dayOrders, state]);

  const baked = state.baked[date] ?? { withRaisins: 0, withoutRaisins: 0 };
  const toBakeMet = Math.max(0, totals.met - baked.withRaisins);
  const toBakeZonder = Math.max(0, totals.zonder - baked.withoutRaisins);

  const visibleOrders = dayOrders.filter((order) => {
    const p = packingOf(state, order.id);
    if (filter === "open") return !p.packedBy;
    if (filter === "mine") return p.claimedBy === session.name && !p.packedBy;
    if (filter === "done") return Boolean(p.packedBy);
    return true;
  });

  async function act(key: string, change: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await run(change);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setBusy(null);
    }
  }

  function adjustBaked(field: "withRaisins" | "withoutRaisins", delta: number) {
    const next = { ...baked, [field]: Math.max(0, baked[field] + delta) };
    void act(`baked-${field}`, () => backend.setBaked(session, date, next));
  }

  const hasTypes = totals.byType.particulier.met + totals.byType.particulier.zonder + totals.byType.zakelijk.met + totals.byType.zakelijk.zonder > 0;

  return (
    <div className="grid gap-4">
      <OrderFilters selectedDate={date} availableDates={dates} onDateChange={setDate} />

      <section className="grid gap-3 md:grid-cols-3">
        <TotalTile label="MET krenten" ordered={totals.met} baked={baked.withRaisins} toBake={toBakeMet} packed={totals.packedMet} />
        <TotalTile label="ZONDER krenten" ordered={totals.zonder} baked={baked.withoutRaisins} toBake={toBakeZonder} packed={totals.packedZonder} />
        <TotalTile
          label="TOTAAL"
          ordered={totals.met + totals.zonder}
          baked={baked.withRaisins + baked.withoutRaisins}
          toBake={toBakeMet + toBakeZonder}
          packed={totals.packedMet + totals.packedZonder}
          footer={`${totals.packedOrders} van ${dayOrders.length} orders ingepakt`}
        />
      </section>

      <Card>
        <SectionTitle title="Gebakken" subtitle="Bakkers houden hier bij hoeveel er klaar is. Nog te bakken = besteld − gebakken." />
        <div className="grid gap-3 sm:grid-cols-2">
          {(["withRaisins", "withoutRaisins"] as const).map((field) => (
            <div key={field} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-3">
              <span className="w-28 text-sm font-semibold text-stone-800">{field === "withRaisins" ? "MET" : "ZONDER"}</span>
              <span className="w-16 text-lg font-semibold tabular-nums text-stone-900">{formatNumber(baked[field])}</span>
              {[-10, 10, 50, 100].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => adjustBaked(field, delta)}
                  className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:border-coby-300 hover:bg-coby-50 disabled:opacity-50"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Particulier en zakelijk" subtitle="Bestelde aantallen voor deze leverdag." />
        {!hasTypes ? (
          <Notice tone="warning">
            Er staat nog geen klanttype in de Sheet. Voeg een kolom <code>type_klant</code> toe (particulier / zakelijk) om de B2B-splitsing te zien.
          </Notice>
        ) : null}
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 text-right font-semibold">MET</th>
                <th className="py-2 pr-3 text-right font-semibold">ZONDER</th>
                <th className="py-2 text-right font-semibold">TOTAAL</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {(Object.keys(totals.byType) as CustomerType[])
                .filter((type) => type !== "onbekend" || totals.byType.onbekend.met + totals.byType.onbekend.zonder > 0)
                .map((type) => {
                  const row = totals.byType[type];
                  return (
                    <tr key={type} className="border-t border-stone-100">
                      <td className="py-2 pr-3 text-stone-800">{customerLabel[type]}</td>
                      <td className="py-2 pr-3 text-right">{formatNumber(row.met)}</td>
                      <td className="py-2 pr-3 text-right">{formatNumber(row.zonder)}</td>
                      <td className="py-2 text-right font-semibold">{formatNumber(row.met + row.zonder)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Orders inpakken"
          subtitle={`Ingelogd als ${session.name}. Claim een order, vink MET, ZONDER en TOTAAL af en rond af.`}
        />
        <div className="mb-3 flex flex-wrap gap-2">
          {(
            [
              ["open", "Nog in te pakken"],
              ["mine", "Mijn orders"],
              ["done", "Ingepakt"],
              ["all", "Alles"]
            ] as Array<[Filter, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                filter === value ? "border-coby-500 bg-coby-100 text-coby-900" : "border-stone-200 bg-white text-stone-700 hover:border-coby-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mb-3">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {visibleOrders.map((order) => (
            <PackingCard
              key={order.id}
              order={order}
              note={effectiveNote(order, state.meta[order.id])}
              packing={packingOf(state, order.id)}
              session={session}
              busy={busy}
              onAct={act}
            />
          ))}
        </div>
        {visibleOrders.length === 0 ? <p className="rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-600">Geen orders in deze selectie.</p> : null}
      </Card>
    </div>
  );
}

function TotalTile({ label, ordered, baked, toBake, packed, footer }: { label: string; ordered: number; baked: number; toBake: number; packed: number; footer?: string }) {
  return (
    <article className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-card backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-stone-900">{formatNumber(ordered)}</p>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs text-stone-600">
        <div>
          <dt>Gebakken</dt>
          <dd className="text-sm font-semibold tabular-nums text-stone-900">{formatNumber(baked)}</dd>
        </div>
        <div>
          <dt>Nog bakken</dt>
          <dd className={`text-sm font-semibold tabular-nums ${toBake > 0 ? "text-coby-700" : "text-emerald-700"}`}>{formatNumber(toBake)}</dd>
        </div>
        <div>
          <dt>Ingepakt</dt>
          <dd className="text-sm font-semibold tabular-nums text-stone-900">{formatNumber(packed)}</dd>
        </div>
      </dl>
      {footer ? <p className="mt-2 text-xs text-stone-600">{footer}</p> : null}
    </article>
  );
}

interface PackingCardProps {
  order: Order;
  note: string;
  packing: PackingState;
  session: Session;
  busy: string | null;
  onAct: (key: string, change: () => Promise<unknown>) => Promise<void>;
}

function PackingCard({ order, note, packing, session, busy, onAct }: PackingCardProps) {
  // Ticks show immediately; the server answer (or an error) settles them afterwards.
  const [optimistic, setOptimistic] = useState<Partial<Record<PackingPart, boolean>>>({});
  const view = { ...packing, ...optimistic };
  const mine = packing.claimedBy === session.name;
  const claimedByOther = Boolean(packing.claimedBy) && !mine;
  const done = Boolean(packing.packedBy);
  const allChecked = view.met && view.zonder && view.totaal;
  const isBusy = busy?.startsWith(order.id) ?? false;

  const parts: Array<{ part: PackingPart; label: string; count: number }> = [
    { part: "met", label: "MET", count: order.withRaisins },
    { part: "zonder", label: "ZONDER", count: order.withoutRaisins },
    { part: "totaal", label: "TOTAAL", count: order.withRaisins + order.withoutRaisins }
  ];

  return (
    <article
      className={`grid gap-3 rounded-xl border p-3 ${
        done ? "border-emerald-200 bg-emerald-50/60" : mine ? "border-coby-400 bg-coby-50" : claimedByOther ? "border-stone-200 bg-stone-50" : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-stone-900">{order.locationName || order.contactPerson}</p>
          <p className="text-xs text-stone-600">
            {order.id} · {order.plannedTime || "geen tijd"} · bezorger {order.supplierName}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {order.customerType === "zakelijk" ? <Badge tone="blue">B2B</Badge> : null}
          {done ? <Badge tone="green">Ingepakt</Badge> : mine ? <Badge tone="coby">Jij bent bezig</Badge> : claimedByOther ? <Badge tone="amber">Bezig: {packing.claimedBy}</Badge> : <Badge>Vrij</Badge>}
        </div>
      </div>

      {note ? <p className="rounded-lg bg-white/80 px-2 py-1.5 text-xs text-stone-700">Opmerking: {note}</p> : null}

      <div className="grid grid-cols-3 gap-2">
        {parts.map(({ part, label, count }) => {
          const checked = view[part];
          return (
            <label
              key={part}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-center ${
                checked ? "border-emerald-400 bg-emerald-100" : "border-stone-200 bg-white"
              } ${!mine || done ? "cursor-not-allowed opacity-80" : ""}`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">{label}</span>
              <span className="text-xl font-semibold tabular-nums text-stone-900">{count}</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-600"
                checked={checked}
                disabled={!mine || done || isBusy}
                onChange={(e) => {
                  const value = e.target.checked;
                  setOptimistic((o) => ({ ...o, [part]: value }));
                  void onAct(`${order.id}-${part}`, () => backend.checkPart(session, order.id, part, value)).finally(() =>
                    setOptimistic((o) => {
                      const next = { ...o };
                      delete next[part];
                      return next;
                    })
                  );
                }}
                aria-label={`${label} afgevinkt`}
              />
            </label>
          );
        })}
      </div>

      {done ? (
        <p className="text-xs text-emerald-800">
          Ingepakt door <span className="font-semibold">{packing.packedBy}</span> op {packing.packedAt}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!packing.claimedBy ? (
            <button type="button" className={primaryButton} disabled={isBusy} onClick={() => void onAct(`${order.id}-claim`, () => backend.claim(session, order.id))}>
              Claim deze order
            </button>
          ) : null}
          {mine ? (
            <>
              <button
                type="button"
                className={primaryButton}
                disabled={!allChecked || isBusy}
                onClick={() => void onAct(`${order.id}-complete`, () => backend.complete(session, order.id))}
              >
                Afronden
              </button>
              <button type="button" className={secondaryButton} disabled={isBusy} onClick={() => void onAct(`${order.id}-release`, () => backend.release(session, order.id))}>
                Vrijgeven
              </button>
            </>
          ) : null}
          {claimedByOther && session.role === "beheer" ? (
            <button type="button" className={secondaryButton} disabled={isBusy} onClick={() => void onAct(`${order.id}-release`, () => backend.release(session, order.id))}>
              Claim vrijgeven (beheer)
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
