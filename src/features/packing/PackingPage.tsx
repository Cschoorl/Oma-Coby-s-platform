import { useEffect, useMemo, useRef, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState, PackingPart, PackingState } from "../../types/dashboard";
import { emptyPacking } from "../../types/dashboard";
import { patches } from "../../lib/patches";
import type { Patch } from "../../lib/useDashboard";
import type { CustomerType, Order } from "../../types/order";
import { OrderFilters } from "../orders/OrderFilters";
import {
  Badge,
  Bollenteller,
  ConfirmPanel,
  EmptyState,
  Icon,
  Note,
  Notice,
  ProgressBar,
  Segmented,
  Sticker,
  fieldLabel,
  formatNumber,
  ghostButton,
  oudjesLine,
  pickInitialDate,
  primaryButton,
  quickButton,
  rollOliebol,
  secondaryButton,
  textAction,
  toast
} from "../../components/ui";
import { appLink } from "../../lib/router";
import { NameTag, firstName } from "../../components/Avatar";
import { effectiveCourier, effectiveNote } from "../../utils/orderUtils";
import { minBoxes } from "../../utils/boxes";
import { byRoute, labelsFor, loadAutoPrint, printLabels } from "./labels";
import { LabelPanel, boxPlan } from "./LabelPanel";

interface PackingPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>, patch?: Patch) => Promise<void>;
}

type Filter = "open" | "mine" | "done" | "all";
type TypeFilter = "alle" | "particulier" | "zakelijk" | "barter" | "popup";

const customerLabel: Record<CustomerType, string> = { particulier: "Particulier", zakelijk: "Zakelijk (B2B)", barter: "Barter", popup: "Pop-upvoorraad", onbekend: "Onbekend" };

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
  // The order whose label panel is open stays in the list, also when the filter would hide it now it is packed.
  const [labelOrder, setLabelsFor] = useState<string | null>(null);

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
      popup: { met: 0, zonder: 0 },
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
    if (order.id === labelOrder) return true;
    if (typeFilter !== "alle" && order.customerType !== typeFilter) return false;
    if (filter === "open") return !p.packedBy;
    if (filter === "mine") return p.claimedBy === session.name && !p.packedBy;
    if (filter === "done") return Boolean(p.packedBy);
    return true;
  });

  const typedOrders = dayOrders.filter((o) => typeFilter === "alle" || o.customerType === typeFilter);
  const dayLabels = typedOrders.reduce((sum, o) => sum + minBoxes(o.withRaisins) + minBoxes(o.withoutRaisins), 0);

  /**
   * With a patch (claim, ticks, afronden) the change shows at once and nothing is blocked: the next
   * click can follow straight away while the Sheet saves in the background.
   */
  async function act(key: string, change: () => Promise<unknown>, patch?: Patch): Promise<boolean> {
    if (!patch) setBusy(key);
    setError(null);
    try {
      await run(change, patch);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
      return false;
    } finally {
      if (!patch) setBusy(null);
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
  const counts = {
    open: dayOrders.filter((o) => !packingOf(state, o.id).packedBy).length,
    mine: dayOrders.filter((o) => packingOf(state, o.id).claimedBy === session.name && !packingOf(state, o.id).packedBy).length,
    done: totals.packedOrders
  };
  const allPacked = dayOrders.length > 0 && totals.packedOrders === dayOrders.length;

  // Knipoog: the moment the last order of the day is packed, a drawn oliebol rolls by.
  const lastPacked = useRef<{ date: string; packed: number } | null>(null);
  useEffect(() => {
    const prev = lastPacked.current;
    lastPacked.current = { date, packed: totals.packedOrders };
    if (prev && prev.date === date && prev.packed < dayOrders.length && allPacked) {
      rollOliebol();
      toast("Alles ingepakt. Tijd voor een bakkie.");
    }
  }, [date, totals.packedOrders, dayOrders.length, allPacked]);

  return (
    <div className="grid gap-5">
      <OrderFilters selectedDate={date} availableDates={dates} onDateChange={setDate} />

      {/* One summary: what is ordered, still to bake and already packed. */}
      <Bollenteller
        cells={[
          { label: "Met", value: totals.met, sub: <BakeLine toBake={toBakeMet} packed={totals.packedMet} /> },
          { label: "Zonder", value: totals.zonder, sub: <BakeLine toBake={toBakeZonder} packed={totals.packedZonder} /> },
          { label: "Totaal", value: orderedTotal, sub: <BakeLine toBake={toBakeMet + toBakeZonder} packed={packedTotal} /> }
        ]}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[220px] flex-1">
          <ProgressBar label="Orders ingepakt" done={totals.packedOrders} total={dayOrders.length} />
        </div>
        {allPacked ? <Sticker tone="kerst">Alles ingepakt!</Sticker> : null}
      </div>

      {/* Baking is tracked here; "nog bakken" above only goes down once this is filled in. */}
      <section className="grid gap-2.5 rounded-kaart bg-gouwe-50 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-serif text-base font-bold text-krent">Gebakken op deze leverdag</p>
          <p className="text-xs text-oliebol">Bakkers: vul in wat klaar ligt, dan zakt "nog bakken" mee.</p>
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
      </section>

      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-bold text-oliebol hover:text-krent">
          Verdeling particulier / zakelijk / barter
          <span className="transition group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-3 max-w-xl rounded-kaart bg-papier p-4 shadow-zacht">
          {!hasTypes ? (
            <p className="text-sm text-gouwe-ink">
              Nog geen klanttype in de Sheet (kolom <code>Type</code>).
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b border-lijn-2 text-left ${fieldLabel}`}>
                  <th className="pb-1.5 font-bold">Type</th>
                  <th className="pb-1.5 text-right font-bold">Met</th>
                  <th className="pb-1.5 text-right font-bold">Zonder</th>
                  <th className="pb-1.5 text-right font-bold">Totaal</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {(Object.keys(totals.byType) as CustomerType[])
                  .filter((type) => type === "particulier" || type === "zakelijk" || totals.byType[type].met + totals.byType[type].zonder > 0)
                  .map((type) => {
                    const row = totals.byType[type];
                    return (
                      <tr key={type} className="border-b border-lijn last:border-0">
                        <td className="py-2">{customerLabel[type]}</td>
                        <td className="py-2 text-right">{formatNumber(row.met)}</td>
                        <td className="py-2 text-right">{formatNumber(row.zonder)}</td>
                        <td className="py-2 text-right font-bold">{formatNumber(row.met + row.zonder)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </details>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            label="Status"
            value={filter}
            onChange={setFilter}
            options={[
              ["open", "Te doen", counts.open],
              ["mine", "Mijn orders", counts.mine],
              ["done", "Klaar", counts.done],
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
                ["barter", "Barter"],
                ["popup", "Pop-up"]
              ]}
            />
            <a className={ghostButton} href={appLink(`/pakbonnen?datum=${date}`)} target="_blank" rel="noreferrer">
              <Icon name="print" />
              Pakbonnen
            </a>
            <button
              type="button"
              className={ghostButton}
              disabled={dayLabels === 0}
              title="Alle doos-labels van deze leverdag, in routevolgorde, voor de DYMO"
              onClick={() => void printLabels(byRoute(state, typedOrders).flatMap((o) => labelsFor(state, o)))}
            >
              <Icon name="print" />
              Labels ({dayLabels})
            </button>
          </div>
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}

        <div className="grid items-start gap-3 lg:grid-cols-2">
          {visibleOrders.map((order) => (
            <PackingCard
              key={order.id}
              state={state}
              labelsOpen={labelOrder === order.id}
              onLabels={(open) => setLabelsFor(open ? order.id : null)}
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
        {visibleOrders.length === 0 ? (
          allPacked && filter === "open" ? (
            <EmptyState title="Niks meer te doen." text="Alle orders voor deze dag zijn ingepakt. Oma Coby is trots op je." />
          ) : (
            <EmptyState title="Geen orders in deze selectie." text="Kies een andere status, klanttype of leverdag." />
          )
        ) : null}
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
      <label className="flex items-center gap-2 text-sm text-krent">
        <span className="w-28">{label}</span>
        <input
          inputMode="numeric"
          className="w-20 rounded-md border border-lijn-2 bg-papier px-2 py-1 text-right font-serif text-lg font-bold tabular-nums text-krent focus:border-krent focus:outline-none focus:ring-2 focus:ring-krent/20"
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
      <span className="text-xs text-muted">van {formatNumber(ordered)}</span>
      <div className="flex gap-1">
        {[10, 50].map((delta) => (
          <button key={delta} type="button" disabled={disabled} onClick={() => onChange(value + delta)} className={quickButton}>
            +{delta}
          </button>
        ))}
        <button type="button" disabled={disabled || value >= ordered} onClick={() => onChange(ordered)} className={`${secondaryButton} min-h-[32px] px-2.5 py-1 text-xs`}>
          Alles
        </button>
      </div>
    </div>
  );
}

/** "60 nog bakken · 120 ingepakt"; counts down visibly when the bakers fill in more. */
function BakeLine({ toBake, packed }: { toBake: number; packed: number }) {
  const [tick, setTick] = useState(0);
  const prev = useRef(toBake);
  useEffect(() => {
    if (toBake < prev.current) setTick((t) => t + 1);
    prev.current = toBake;
  }, [toBake]);
  return (
    <p className="text-muted">
      <span key={tick} className={toBake > 0 ? `font-bold text-feest-ink ${tick ? "oc-tick inline-block" : ""}` : "font-bold text-kerst-ink"}>
        {toBake > 0 ? `${formatNumber(toBake)} nog bakken` : "alles gebakken ✓"}
      </span>
      <span className="hidden sm:inline"> · </span>
      <br className="sm:hidden" />
      {formatNumber(packed)} ingepakt
    </p>
  );
}

interface PackingCardProps {
  state: DashboardState;
  labelsOpen: boolean;
  onLabels: (open: boolean) => void;
  order: Order;
  note: string;
  courier: string;
  packing: PackingState;
  session: Session;
  busy: string | null;
  onAct: (key: string, change: () => Promise<unknown>, patch?: Patch) => Promise<boolean>;
}

function PackingCard({ state, labelsOpen, onLabels, order, note, courier, packing, session, busy, onAct }: PackingCardProps) {
  const [askReopen, setAskReopen] = useState(false);
  const [justDone, setJustDone] = useState(false);
  // Clicks show at once (see useDashboard); the Sheet confirms them in the background.
  const view = packing;
  const mine = packing.claimedBy === session.name;
  const claimedByOther = Boolean(packing.claimedBy) && !mine;
  const done = Boolean(packing.packedBy);
  const allChecked = view.met && view.zonder && view.totaal;
  const isBusy = busy?.startsWith(order.id) ?? false;
  const flyers = /^ja/i.test(order.flyers ?? "");

  const parts: Array<{ part: PackingPart; label: string; count: number }> = [
    { part: "met", label: "Met", count: order.withRaisins },
    { part: "zonder", label: "Zonder", count: order.withoutRaisins },
    { part: "totaal", label: "Totaal", count: order.withRaisins + order.withoutRaisins }
  ];

  function toggle(part: PackingPart, value: boolean) {
    void onAct(`${order.id}-${part}`, () => backend.checkPart(session, order.id, part, value), patches.checkPart(order.id, part, value));
  }

  const meta = [
    order.fulfilment === "afhalen" ? `Afhalen${order.pickupLocation ? ` · ${order.pickupLocation}` : ""}` : courier ? `Bezorger: ${courier}` : "Bezorger nog niet ingedeeld",
    order.plannedTime,
    flyers ? "met flyers" : ""
  ].filter(Boolean);

  async function complete() {
    const pieces = order.withRaisins + order.withoutRaisins;
    setJustDone(true);
    onLabels(true);
    toast(`Ingepakt! ${oudjesLine(pieces)}`);
    if (loadAutoPrint()) void printLabels(labelsFor(state, order));
    if (!(await onAct(`${order.id}-complete`, () => backend.complete(session, order.id), patches.complete(order.id, session.name)))) setJustDone(false);
  }

  return (
    <article
      className={`relative grid gap-3 rounded-kaart p-4 transition ${
        done ? "bg-transparent" : mine ? "bg-gouwe-50 shadow-zacht ring-1 ring-gouwe/70" : "bg-papier shadow-zacht"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate font-bold ${done ? "text-muted" : "text-krent"}`}>{order.locationName || order.contactPerson}</p>
          <p className="mt-0.5 text-xs text-muted">{meta.join(" · ")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {order.customerType === "zakelijk" ? <Badge tone="zacht">Zakelijk</Badge> : null}
          {order.customerType === "barter" ? <Badge tone="zacht">Barter</Badge> : null}
          {order.customerType === "popup" ? <Badge tone="aandacht">Pop-upvoorraad</Badge> : null}
          {mine && !done ? <NameTag name={session.name} mine short /> : claimedByOther && !done ? <NameTag name={packing.claimedBy} short suffix="is bezig" /> : null}
        </div>
      </div>
      {done ? <Sticker tone="kerst" slap={justDone} className="pointer-events-none absolute -top-3 right-3">Ingepakt!</Sticker> : null}

      {note ? (
        <Note className="line-clamp-2">
          <span title={note}>{note}</span>
        </Note>
      ) : null}

      <div className={`grid grid-cols-3 gap-1.5 ${done ? "opacity-55" : ""}`}>
        {parts.map(({ part, label, count }) => {
          const checked = view[part];
          // TOTAAL stays locked until MET and ZONDER are both ticked.
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
              className={`flex min-h-[72px] flex-col items-center justify-center rounded-lg border px-2 py-2 transition active:scale-[0.97] ${
                checked
                  ? "border-transparent bg-kerst-50 text-kerst-ink"
                  : locked && mine && !done
                    ? "border-dashed border-lijn-2 bg-transparent text-muted"
                    : mine && !done
                      ? "border-transparent bg-vul text-krent hover:bg-vul-2"
                      : "border-transparent bg-vul text-krent"
              } ${disabled ? "cursor-not-allowed" : ""}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                {checked ? "✓ " : ""}
                {label}
              </span>
              <span className="font-serif text-2xl font-bold tabular-nums">{count}</span>
              {locked && mine && !done ? <span className="text-[10px] text-muted">na met + zonder</span> : null}
            </button>
          );
        })}
      </div>

      {!done ? <p className="-mt-1 text-xs text-muted">Verdeel in {boxPlan(order)}.</p> : null}

      {done ? (
        askReopen ? (
          <ConfirmPanel
            confirmLabel="Heropenen"
            busy={isBusy}
            onCancel={() => setAskReopen(false)}
            onConfirm={() => {
              setAskReopen(false);
              setJustDone(false);
              void onAct(`${order.id}-reopen`, () => backend.reopen(session, order.id), patches.reopen(order.id, session.name));
            }}
          >
            <p>Deze order heropenen om iets aan te passen? Hij komt dan op jouw naam te staan.</p>
          </ConfirmPanel>
        ) : (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                Ingepakt door <NameTag name={packing.packedBy} mine={packing.packedBy === session.name} /> {packing.packedAt.slice(11, 16) || packing.packedAt}
              </p>
              <span className="flex flex-wrap items-center gap-3">
                {!labelsOpen ? (
                  <button type="button" className={textAction} onClick={() => onLabels(true)}>
                    Labels printen
                  </button>
                ) : null}
                <button type="button" className={textAction} disabled={isBusy} onClick={() => setAskReopen(true)}>
                  Heropenen om aan te passen
                </button>
              </span>
            </div>
            {labelsOpen ? <LabelPanel state={state} order={order} onClose={() => onLabels(false)} /> : null}
          </div>
        )
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {!packing.claimedBy ? (
            <button type="button" className={`${primaryButton} w-full sm:w-auto`} disabled={isBusy} onClick={() => void onAct(`${order.id}-claim`, () => backend.claim(session, order.id), patches.claim(order.id, session.name))}>
              Ik pak deze order
            </button>
          ) : null}
          {mine ? (
            <>
              <button type="button" className={primaryButton} disabled={!allChecked || isBusy} onClick={() => void complete()}>
                Afronden
              </button>
              <button type="button" className={ghostButton} disabled={isBusy} onClick={() => void onAct(`${order.id}-release`, () => backend.release(session, order.id), patches.release(order.id))}>
                Vrijgeven
              </button>
            </>
          ) : null}
          {claimedByOther ? <p className="text-xs text-muted">{firstName(packing.claimedBy)} pakt deze in.</p> : null}
          {claimedByOther && session.role === "beheer" ? (
            <button type="button" className={textAction} disabled={isBusy} onClick={() => void onAct(`${order.id}-release`, () => backend.release(session, order.id), patches.release(order.id))}>
              Vrijgeven (beheer)
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
