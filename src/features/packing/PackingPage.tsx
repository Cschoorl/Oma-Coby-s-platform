import { useEffect, useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState, PackingPart, PackingState } from "../../types/dashboard";
import { emptyPacking } from "../../types/dashboard";
import type { CustomerType, Order } from "../../types/order";
import { OrderFilters } from "../orders/OrderFilters";
import { Badge, Notice, Segmented, cardClass, formatNumber, ghostButton, pickInitialDate, primaryButton, secondaryButton } from "../../components/ui";
import { appLink } from "../../lib/router";
import { effectiveCourier, effectiveNote } from "../../utils/orderUtils";

interface PackingPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
}

type Filter = "open" | "mine" | "done" | "all";
type TypeFilter = "alle" | "particulier" | "zakelijk" | "barter";

const customerLabel: Record<CustomerType, string> = { particulier: "Particulier", zakelijk: "Zakelijk (B2B)", barter: "Barter", onbekend: "Onbekend" };

function packingOf(state: DashboardState, orderId: string): PackingState {
  return state.packing[orderId] ?? emptyPacking;
}

export function PackingPage({ state, session, run }: PackingPageProps) {
  const dates = useMemo(() => Array.from(new Set(state.orders.map((o) => o.deliveryDate))).sort(), [state.orders]);
  const [date, setDate] = useState(() => pickInitialDate(dates));
  const [filter, setFilter] = useState<Filter>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("alle");
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
      barter: { met: 0, zonder: 0 },
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
    const types = Object.values(byType);
    const met = types.reduce((sum, t) => sum + t.met, 0);
    const zonder = types.reduce((sum, t) => sum + t.zonder, 0);
    return { byType, met, zonder, packedMet, packedZonder, packedOrders };
  }, [dayOrders, state]);

  const baked = state.baked[date] ?? { withRaisins: 0, withoutRaisins: 0 };
  const toBakeMet = Math.max(0, totals.met - baked.withRaisins);
  const toBakeZonder = Math.max(0, totals.zonder - baked.withoutRaisins);

  const visibleOrders = dayOrders.filter((order) => {
    const p = packingOf(state, order.id);
    if (typeFilter !== "alle" && order.customerType !== typeFilter) return false;
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

  function setBakedValue(field: "withRaisins" | "withoutRaisins", value: number) {
    const next = { ...baked, [field]: Math.max(0, Math.round(value)) };
    if (next[field] === baked[field]) return;
    void act(`baked-${field}`, () => backend.setBaked(session, date, next));
  }

  const hasTypes = totals.byType.onbekend.met + totals.byType.onbekend.zonder < totals.met + totals.zonder || totals.met + totals.zonder === 0;

  const orderedTotal = totals.met + totals.zonder;
  const packedTotal = totals.packedMet + totals.packedZonder;
  // Progress counts orders: that is what the packers work through. Oliebollen are shown per column above.
  const packedPct = dayOrders.length ? Math.round((totals.packedOrders / dayOrders.length) * 100) : 0;
  const counts = {
    open: dayOrders.filter((o) => !packingOf(state, o.id).packedBy).length,
    mine: dayOrders.filter((o) => packingOf(state, o.id).claimedBy === session.name && !packingOf(state, o.id).packedBy).length,
    done: totals.packedOrders
  };

  return (
    <div className="grid gap-5">
      <OrderFilters selectedDate={date} availableDates={dates} onDateChange={setDate} />

      {/* One summary: what is ordered, still to bake and already packed. */}
      <section className={cardClass}>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Summary label="Met krenten" ordered={totals.met} toBake={toBakeMet} packed={totals.packedMet} />
          <Summary label="Zonder krenten" ordered={totals.zonder} toBake={toBakeZonder} packed={totals.packedZonder} />
          <Summary label="Totaal" ordered={orderedTotal} toBake={toBakeMet + toBakeZonder} packed={packedTotal} strong />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>
              Orders ingepakt: <span className="font-semibold text-stone-700">{totals.packedOrders} van {dayOrders.length}</span>
            </span>
            <span className="tabular-nums">{packedPct}% van de orders</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={packedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Orders ingepakt">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${packedPct}%` }} />
          </div>
        </div>

        {/* Baking is tracked here; "nog bakken" above only goes down once this is filled in. */}
        <div className="mt-4 grid gap-2 rounded-lg bg-coby-50 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-stone-900">Gebakken op deze leverdag</p>
            <p className="text-xs text-stone-600">Bakkers: vul hier in hoeveel er klaar ligt. Dan daalt "nog bakken" hierboven.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["withRaisins", "withoutRaisins"] as const).map((field) => (
              <BakedInput
                key={`${date}-${field}`}
                label={field === "withRaisins" ? "Met krenten" : "Zonder krenten"}
                value={baked[field]}
                ordered={field === "withRaisins" ? totals.met : totals.zonder}
                disabled={busy !== null}
                onChange={(v) => setBakedValue(field, v)}
              />
            ))}
          </div>
        </div>

        <details className="group mt-4 border-t border-stone-100 pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-stone-700 hover:text-stone-900">
            <span>Verdeling particulier / zakelijk / barter</span>
            <span className="text-stone-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-stone-500">Besteld per klanttype</p>
              {!hasTypes ? (
                <p className="text-sm text-amber-800">
                  Nog geen klanttype in de Sheet (kolom <code>Type</code>).
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone-500">
                      <th className="pb-1 font-medium">Type</th>
                      <th className="pb-1 text-right font-medium">Met</th>
                      <th className="pb-1 text-right font-medium">Zonder</th>
                      <th className="pb-1 text-right font-medium">Totaal</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {(Object.keys(totals.byType) as CustomerType[])
                      .filter((type) => type === "particulier" || type === "zakelijk" || totals.byType[type].met + totals.byType[type].zonder > 0)
                      .map((type) => {
                        const row = totals.byType[type];
                        return (
                          <tr key={type} className="border-t border-stone-100">
                            <td className="py-1.5 text-stone-700">{customerLabel[type]}</td>
                            <td className="py-1.5 text-right">{formatNumber(row.met)}</td>
                            <td className="py-1.5 text-right">{formatNumber(row.zonder)}</td>
                            <td className="py-1.5 text-right font-semibold">{formatNumber(row.met + row.zonder)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </details>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            label="Status"
            value={filter}
            onChange={setFilter}
            options={[
              ["open", `Te doen (${counts.open})`],
              ["mine", `Mijn orders (${counts.mine})`],
              ["done", `Klaar (${counts.done})`],
              ["all", "Alles"]
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Klanttype"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                ["alle", "Alle klanten"],
                ["particulier", "Particulier"],
                ["zakelijk", "Zakelijk"],
                ["barter", "Barter"]
              ]}
            />
            <a className={ghostButton} href={appLink(`/pakbonnen?datum=${date}`)} target="_blank" rel="noreferrer">
              Pakbonnen printen
            </a>
          </div>
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {visibleOrders.map((order) => (
            <PackingCard
              key={order.id}
              order={order}
              note={effectiveNote(order, state.meta[order.id])}
              courier={effectiveCourier(order, state.meta[order.id])}
              packing={packingOf(state, order.id)}
              session={session}
              busy={busy}
              onAct={act}
            />
          ))}
        </div>
        {visibleOrders.length === 0 ? <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">Geen orders in deze selectie.</p> : null}
      </section>
    </div>
  );
}

/** Number field plus quick buttons; saves when you leave the field or press a button. */
function BakedInput({ label, value, ordered, disabled, onChange }: { label: string; value: number; ordered: number; disabled: boolean; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text.replace(/\D/g, ""));
    if (Number.isFinite(n)) onChange(n);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <span className="w-28">{label}</span>
        <input
          inputMode="numeric"
          className="w-20 rounded-md border border-stone-300 bg-white px-2 py-1 text-right text-base font-semibold tabular-nums text-stone-900 focus:border-coby-500 focus:outline-none"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          aria-label={`Gebakken ${label.toLowerCase()}`}
        />
      </label>
      <span className="text-xs text-stone-500">van {formatNumber(ordered)}</span>
      <div className="flex gap-1">
        {[10, 50].map((delta) => (
          <button
            key={delta}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value + delta)}
            className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          >
            +{delta}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || value >= ordered}
          onClick={() => onChange(ordered)}
          className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40"
        >
          Alles
        </button>
      </div>
    </div>
  );
}

function Summary({ label, ordered, toBake, packed, strong }: { label: string; ordered: number; toBake: number; packed: number; strong?: boolean }) {
  return (
    <div className={strong ? "border-l border-stone-100 pl-3 sm:pl-4" : ""}>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className={`mt-0.5 font-semibold tabular-nums text-stone-900 ${strong ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}>{formatNumber(ordered)}</p>
      <p className="mt-1 text-[11px] leading-snug text-stone-500 sm:text-xs">
        <span className={toBake > 0 ? "font-semibold text-coby-700" : "text-emerald-700"}>{toBake > 0 ? `${formatNumber(toBake)} nog bakken` : "alles gebakken"}</span>
        <span className="hidden sm:inline"> · </span>
        <br className="sm:hidden" />
        {formatNumber(packed)} ingepakt
      </p>
    </div>
  );
}

interface PackingCardProps {
  order: Order;
  note: string;
  courier: string;
  packing: PackingState;
  session: Session;
  busy: string | null;
  onAct: (key: string, change: () => Promise<unknown>) => Promise<void>;
}

function PackingCard({ order, note, courier, packing, session, busy, onAct }: PackingCardProps) {
  // Ticks show immediately; the server answer (or an error) settles them afterwards.
  const [optimistic, setOptimistic] = useState<Partial<Record<PackingPart, boolean>>>({});
  const view = { ...packing, ...optimistic };
  const mine = packing.claimedBy === session.name;
  const claimedByOther = Boolean(packing.claimedBy) && !mine;
  const done = Boolean(packing.packedBy);
  const allChecked = view.met && view.zonder && view.totaal;
  const isBusy = busy?.startsWith(order.id) ?? false;
  const flyers = /^ja/i.test(order.flyers ?? "");

  const parts: Array<{ part: PackingPart; label: string; count: number }> = [
    { part: "met", label: "Met", count: order.withRaisins },
    { part: "zonder", label: "Zonder", count: order.withoutRaisins },
    { part: "totaal", label: "Geheel", count: order.withRaisins + order.withoutRaisins }
  ];

  function toggle(part: PackingPart, value: boolean) {
    setOptimistic((o) => ({ ...o, [part]: value, ...(part !== "totaal" && !value ? { totaal: false } : {}) }));
    void onAct(`${order.id}-${part}`, () => backend.checkPart(session, order.id, part, value)).finally(() =>
      setOptimistic((o) => {
        const next = { ...o };
        delete next[part];
        if (part !== "totaal") delete next.totaal;
        return next;
      })
    );
  }

  const meta = [
    order.fulfilment === "afhalen" ? `Afhalen${order.pickupLocation ? ` · ${order.pickupLocation}` : ""}` : courier ? `Bezorger: ${courier}` : "Bezorger nog niet ingedeeld",
    order.plannedTime,
    order.packaging,
    flyers ? "met flyers" : ""
  ].filter(Boolean);

  return (
    <article
      className={`grid gap-3 rounded-xl border p-4 transition ${
        done ? "border-stone-200 bg-stone-100/70" : mine ? "border-coby-400 bg-white ring-2 ring-coby-100" : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate font-semibold ${done ? "text-stone-500" : "text-stone-900"}`}>{order.locationName || order.contactPerson}</p>
          <p className="mt-0.5 text-xs text-stone-500">{meta.join(" · ")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {order.customerType === "zakelijk" ? <Badge tone="blue">Zakelijk</Badge> : null}
          {order.customerType === "barter" ? <Badge tone="blue">Barter</Badge> : null}
          {done ? <Badge>✓ Klaar</Badge> : mine ? <Badge tone="coby">Jij</Badge> : claimedByOther ? <Badge tone="amber">{packing.claimedBy}</Badge> : null}
        </div>
      </div>

      {note ? (
        <p className="line-clamp-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900" title={note}>
          {note}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {parts.map(({ part, label, count }) => {
          const checked = view[part];
          // GEHEEL stays locked until MET and ZONDER are both ticked.
          const locked = part === "totaal" && !(view.met && view.zonder);
          const disabled = !mine || done || isBusy || (locked && !checked);
          return (
            <button
              key={part}
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-label={`${label.toUpperCase()} afgevinkt`}
              disabled={disabled}
              onClick={() => toggle(part, !checked)}
              className={`flex flex-col items-center rounded-lg border px-2 py-2.5 transition ${
                checked
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : !mine || done
                    ? "border-stone-200 bg-stone-50 text-stone-700"
                    : locked
                      ? "border-dashed border-stone-300 bg-white text-stone-400"
                      : "border-stone-300 bg-white text-stone-900 hover:border-emerald-400 hover:bg-emerald-50/40"
              } ${disabled ? "cursor-not-allowed" : ""}`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                {checked ? "✓ " : ""}
                {label}
              </span>
              <span className="text-xl font-semibold tabular-nums">{count}</span>
              {locked && mine && !done ? <span className="text-[10px] text-stone-400">na met + zonder</span> : null}
            </button>
          );
        })}
      </div>

      {done ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stone-500">
            Ingepakt door <span className="font-semibold text-stone-700">{packing.packedBy}</span> · {packing.packedAt.slice(11, 16) || packing.packedAt}
          </p>
          <button
            type="button"
            className="text-xs font-semibold text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline disabled:opacity-40"
            disabled={isBusy}
            onClick={() => {
              if (window.confirm("Deze order heropenen om iets aan te passen? Hij komt dan op jouw naam te staan.")) {
                void onAct(`${order.id}-reopen`, () => backend.reopen(session, order.id));
              }
            }}
          >
            Heropenen om aan te passen
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {!packing.claimedBy ? (
            <button type="button" className={`${primaryButton} w-full sm:w-auto`} disabled={isBusy} onClick={() => void onAct(`${order.id}-claim`, () => backend.claim(session, order.id))}>
              Ik pak deze order
            </button>
          ) : null}
          {mine ? (
            <>
              <button type="button" className={primaryButton} disabled={!allChecked || isBusy} onClick={() => void onAct(`${order.id}-complete`, () => backend.complete(session, order.id))}>
                Afronden
              </button>
              <button type="button" className={secondaryButton} disabled={isBusy} onClick={() => void onAct(`${order.id}-release`, () => backend.release(session, order.id))}>
                Vrijgeven
              </button>
            </>
          ) : null}
          {claimedByOther ? <p className="text-xs text-stone-500">{packing.claimedBy} is hiermee bezig.</p> : null}
          {claimedByOther && session.role === "beheer" ? (
            <button type="button" className="text-xs font-semibold text-stone-600 hover:text-stone-900 hover:underline" disabled={isBusy} onClick={() => void onAct(`${order.id}-release`, () => backend.release(session, order.id))}>
              Vrijgeven (beheer)
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
