import { useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { Badge, Card, Notice, SectionTitle, Segmented, fieldLabel, ghostButton, inputClass, primaryButton, toast } from "../../components/ui";
import { OrderFilters } from "./OrderFilters";
import { momentLabel } from "../business/business";
import { TYPE_CHOICES } from "../../lib/categories";
import { changesFor, fieldLabel as changeLabel, formatChangeTime, formatChangeValue, orderFieldValue, ROUTE_FIELDS, type OrderField, type OrderFieldChange } from "../../lib/orderChanges";

interface OrderEditCardProps {
  order: Order;
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
  onClose: () => void;
}

type Draft = Record<OrderField, string>;

const FIELDS: OrderField[] = ["type", "locationName", "withRaisins", "withoutRaisins", "deliveryDate", "fulfilment", "deliveryMoment", "pickupLocation", "address", "postalCode", "city", "amount"];

/** The moments a business order can have (same as the order form). */
const BUSINESS_MOMENTS = Object.values(momentLabel);

/**
 * Edit an order: products, date, bezorgen/afhalen, moment, address and (sheet orders) the amount.
 * Saving writes the new values in the Sheet and every change in the Wijzigingslog.
 */
export function OrderEditCard({ order, state, session, run, onClose }: OrderEditCardProps) {
  const initial = useMemo(() => Object.fromEntries(FIELDS.map((f) => [f, orderFieldValue(order, f)])) as Draft, [order]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const business = state.business.some((b) => b.id === order.id);
  const set = (field: OrderField) => (value: string) => setDraft((d) => ({ ...d, [field]: value }));
  const changes: OrderFieldChange[] = FIELDS.filter((f) => draft[f].trim() !== initial[f]).map((f) => ({ field: f, from: initial[f], to: draft[f].trim() }));
  const changed = new Set(changes.map((c) => c.field));

  const dates = useMemo(
    () => Array.from(new Set([...state.orders.map((o) => o.deliveryDate), ...state.agenda.map((a) => a.date)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort(),
    [state.orders, state.agenda]
  );
  const moments = useMemo(() => Array.from(new Set(state.orders.map((o) => o.deliveryMoment ?? "").filter(Boolean))).sort(), [state.orders]);

  // What else changes because of this edit, so it is no surprise afterwards.
  const packing = state.packing[order.id];
  const courier = state.meta[order.id]?.courier || order.supplierName;
  const route = Object.values(state.routes).find((r) => r.orderIds.includes(order.id));
  const countsChanged = changed.has("withRaisins") || changed.has("withoutRaisins");
  const toPopup = changed.has("type") && draft.type === "Pop-up";
  const fromPopup = changed.has("type") && initial.type === "Pop-up";
  const warnings = [
    toPopup ? "Als pop-upvoorraad telt deze in de tussenstand en omzet alleen nog mee voor wat verkocht is, en komt hij niet meer in de routes." : "",
    fromPopup ? "Dit wordt een gewone bestelling: hij telt weer helemaal mee in de tussenstand." : "",
    countsChanged && packing && (packing.packedBy || packing.met || packing.zonder || packing.totaal)
      ? `${packing.packedBy ? `Al ingepakt door ${packing.packedBy}` : "Al deels afgevinkt"}: na opslaan moet deze order opnieuw ingepakt worden.`
      : "",
    changed.has("deliveryDate") && courier ? `${courier} is ingedeeld voor de oude dag; die indeling vervalt.` : "",
    route && changes.some((c) => ROUTE_FIELDS.includes(c.field)) ? `De route van ${route.courier} klopt daarna niet meer: bereken hem opnieuw op Routes.` : "",
    business && (countsChanged || changed.has("fulfilment") || changed.has("deliveryMoment")) ? "Het bedrag van deze zakelijke bestelling wordt opnieuw berekend." : "",
    order.amount !== undefined && !business && countsChanged && !changed.has("amount") ? "Het bedrag verandert niet vanzelf: pas het hieronder aan als dat nodig is." : ""
  ].filter(Boolean);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await run(() => backend.updateOrder(session, order.id, changes));
      toast(`Bestelling bijgewerkt (${changes.length} ${changes.length === 1 ? "wijziging" : "wijzigingen"}).`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan is mislukt.");
    } finally {
      setBusy(false);
    }
  }

  const total = (Number(draft.withRaisins) || 0) + (Number(draft.withoutRaisins) || 0);
  const mark = (field: OrderField) => (changed.has(field) ? "ring-2 ring-gouwe" : "");

  return (
    <Card>
      <SectionTitle title="Bestelling aanpassen" subtitle="Wat je hier opslaat komt in de Sheet en in de wijzigingsgeschiedenis, met jouw naam en de tijd." />
      <div className="grid gap-5">
        {!business ? (
          <div className="grid gap-2 sm:grid-cols-[14rem_1fr]">
            <label className="grid gap-1 text-sm">
              <span className={fieldLabel}>Soort</span>
              <select className={`${inputClass} ${mark("type")}`} value={draft.type} onChange={(e) => set("type")(e.target.value)}>
                {draft.type === "" ? <option value="">Onbekend (regulier)</option> : null}
                {TYPE_CHOICES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className={fieldLabel}>{draft.type === "Pop-up" ? "Pop-up (naam of plek)" : "Naam"}</span>
              <input className={`${inputClass} ${mark("locationName")}`} value={draft.locationName} onChange={(e) => set("locationName")(e.target.value)} />
            </label>
          </div>
        ) : null}
        <fieldset className="grid gap-2">
          <legend className={fieldLabel}>Producten</legend>
          <div className="grid grid-cols-3 gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted">MET krenten</span>
              <input className={`${inputClass} ${mark("withRaisins")}`} inputMode="numeric" value={draft.withRaisins} onChange={(e) => set("withRaisins")(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">ZONDER krenten</span>
              <input className={`${inputClass} ${mark("withoutRaisins")}`} inputMode="numeric" value={draft.withoutRaisins} onChange={(e) => set("withoutRaisins")(e.target.value.replace(/\D/g, ""))} />
            </label>
            <div className="grid gap-1 text-sm">
              <span className="text-muted">TOTAAL</span>
              <p className="flex min-h-[40px] items-center font-serif text-xl font-bold tabular-nums text-krent">{total}</p>
            </div>
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className={fieldLabel}>Levering</legend>
          <Segmented
            label="Bezorgen of afhalen"
            value={draft.fulfilment as "bezorgen" | "afhalen"}
            onChange={set("fulfilment")}
            options={[
              ["bezorgen", "Bezorgen"],
              ["afhalen", "Afhalen"]
            ]}
          />
          <div className={`rounded-lg ${mark("deliveryDate")}`}>
            <OrderFilters selectedDate={draft.deliveryDate} availableDates={dates} onDateChange={set("deliveryDate")} />
          </div>
          {draft.fulfilment === "bezorgen" ? (
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Bezorgmoment</span>
              {business ? (
                <select className={`${inputClass} ${mark("deliveryMoment")}`} value={draft.deliveryMoment} onChange={(e) => set("deliveryMoment")(e.target.value)}>
                  {BUSINESS_MOMENTS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input className={`${inputClass} ${mark("deliveryMoment")}`} list="bezorgmomenten" value={draft.deliveryMoment} onChange={(e) => set("deliveryMoment")(e.target.value)} placeholder="bijv. tussen 9:00 en 12:30 uur" />
                  <datalist id="bezorgmomenten">
                    {moments.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </>
              )}
            </label>
          ) : !business ? (
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Afhaallocatie</span>
              <input className={`${inputClass} ${mark("pickupLocation")}`} value={draft.pickupLocation} onChange={(e) => set("pickupLocation")(e.target.value)} />
            </label>
          ) : null}
        </fieldset>

        {draft.fulfilment === "bezorgen" ? (
          <fieldset className="grid gap-2">
            <legend className={fieldLabel}>Adres</legend>
            <input className={`${inputClass} ${mark("address")}`} value={draft.address} onChange={(e) => set("address")(e.target.value)} placeholder="Straat en huisnummer" aria-label="Adres" />
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <input className={`${inputClass} ${mark("postalCode")}`} value={draft.postalCode} onChange={(e) => set("postalCode")(e.target.value)} placeholder="Postcode" aria-label="Postcode" />
              <input className={`${inputClass} ${mark("city")}`} value={draft.city} onChange={(e) => set("city")(e.target.value)} placeholder="Plaats" aria-label="Plaats" />
            </div>
          </fieldset>
        ) : null}

        {order.amount !== undefined && !business ? (
          <label className="grid max-w-[12rem] gap-1 text-sm">
            <span className={fieldLabel}>Bedrag (€)</span>
            <input className={`${inputClass} ${mark("amount")}`} inputMode="decimal" value={draft.amount} onChange={(e) => set("amount")(e.target.value.replace(",", "."))} />
          </label>
        ) : null}

        {warnings.length > 0 ? (
          <Notice tone="warning">
            <ul className="grid gap-0.5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Notice>
        ) : null}
        {error ? <Notice tone="error">{error}</Notice> : null}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={primaryButton} disabled={busy || changes.length === 0} onClick={() => void save()}>
            {busy ? "Opslaan…" : changes.length ? `Opslaan (${changes.length} ${changes.length === 1 ? "wijziging" : "wijzigingen"})` : "Opslaan"}
          </button>
          <button type="button" className={ghostButton} disabled={busy} onClick={onClose}>
            Annuleren
          </button>
        </div>
      </div>
    </Card>
  );
}

/** The change history of one order, newest first. */
export function OrderHistory({ state, orderId }: { state: DashboardState; orderId: string }) {
  const [all, setAll] = useState(false);
  const list = changesFor(state, orderId);
  const shown = all ? list : list.slice(0, 8);
  return (
    <Card>
      <SectionTitle title="Wijzigingen" subtitle="Wie wat heeft aangepast, nieuwste bovenaan." action={list.length ? <Badge tone="zacht">{list.length}</Badge> : undefined} />
      {list.length === 0 ? (
        <p className="text-sm text-muted">Nog niets aangepast sinds de bestelling binnenkwam.</p>
      ) : (
        <ol className="grid">
          {shown.map((c, i) => (
            <li key={`${c.at}-${c.field}-${i}`} className="grid gap-0.5 border-b border-lijn py-2 text-sm last:border-0 sm:grid-cols-[7.5rem_1fr] sm:gap-3">
              <span className="text-xs tabular-nums text-muted">
                {formatChangeTime(c.at)}
                <br className="hidden sm:block" />
                <span className="sm:hidden"> · </span>
                {c.by || "onbekend"}
              </span>
              <span className="text-krent">
                <b>{changeLabel[c.field] ?? c.field}</b>
                {c.from || c.to ? (
                  <>
                    : <span className="text-muted line-through decoration-muted/60">{formatChangeValue(c.field, c.from)}</span> → {formatChangeValue(c.field, c.to)}
                  </>
                ) : (
                  <span className="text-muted"> aangepast</span>
                )}
                {c.note ? <span className="text-xs text-muted"> ({c.note})</span> : null}
              </span>
            </li>
          ))}
        </ol>
      )}
      {list.length > shown.length ? (
        <button type="button" className={`${ghostButton} mt-2`} onClick={() => setAll(true)}>
          Toon alle {list.length}
        </button>
      ) : null}
    </Card>
  );
}
