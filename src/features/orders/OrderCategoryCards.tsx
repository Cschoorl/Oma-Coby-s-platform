import { useEffect, useMemo, useState } from "react";
import { backend, type NewOrderInput, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { Badge, Bollenteller, Card, Notice, SectionTitle, Segmented, fieldLabel, formatEuro, ghostButton, inputClass, primaryButton, toast } from "../../components/ui";
import { OrderFilters } from "./OrderFilters";
import { TYPE_CHOICES, popupLeft } from "../../lib/categories";

type Run = (change: () => Promise<unknown>) => Promise<void>;

/**
 * A new order or extra pop-up stock, added by beheer. It becomes a row in Totaal_lijst bestellingen
 * (column Type: Zakelijk, Barter, Particulier or Pop-up) and a line in the change log.
 */
export function NewOrderCard({ state, session, run, onDone, initialType = "Pop-up" }: { state: DashboardState; session: Session; run: Run; onDone: (id: string | null) => void; initialType?: string }) {
  const dates = useMemo(
    () => Array.from(new Set([...state.orders.map((o) => o.deliveryDate), ...state.agenda.map((a) => a.date)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort(),
    [state.orders, state.agenda]
  );
  const [type, setType] = useState(initialType);
  const [form, setForm] = useState({ locationName: "", deliveryDate: dates[0] ?? "", withRaisins: "", withoutRaisins: "", fulfilment: "bezorgen" as "bezorgen" | "afhalen", contactPerson: "", phone: "", email: "", address: "", postalCode: "", city: "", pickupLocation: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popup = type === "Pop-up";
  const set = (field: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [field]: value }));
  const total = (Number(form.withRaisins) || 0) + (Number(form.withoutRaisins) || 0);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      let id: string | null = null;
      const input: NewOrderInput = {
        ...form,
        type,
        withRaisins: Number(form.withRaisins) || 0,
        withoutRaisins: Number(form.withoutRaisins) || 0,
        fulfilment: popup ? "afhalen" : form.fulfilment
      };
      await run(async () => {
        id = (await backend.createOrder(session, input)).id;
      });
      toast(popup ? `Pop-upvoorraad ${id} aangemaakt.` : `Bestelling ${id} aangemaakt.`);
      onDone(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aanmaken is mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle
        title={popup ? "Extra pop-upvoorraad" : "Nieuwe bestelling"}
        subtitle={
          popup
            ? "Voorraad die mee gaat naar een pop-up, zonder vaste koper. Telt volledig mee voor het bakken; in de tussenstand pas als het verkocht is."
            : "Komt als nieuwe regel in de Sheet (Totaal_lijst bestellingen)."
        }
      />
      <div className="grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className={fieldLabel}>Soort</span>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_CHOICES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className={fieldLabel}>{popup ? "Pop-up (naam of plek)" : type === "Particulier" ? "Naam klant" : "Naam onderneming"}</span>
          <input className={inputClass} value={form.locationName} onChange={(e) => set("locationName")(e.target.value)} placeholder={popup ? "bijv. Pop-up Schaatsbaan" : ""} />
        </label>
        <OrderFilters label={popup ? "Dag van de pop-up" : "Leverdag"} selectedDate={form.deliveryDate} availableDates={dates} onDateChange={set("deliveryDate")} />
        <div className="grid grid-cols-3 gap-2">
          <label className="grid gap-1 text-sm">
            <span className="text-muted">MET krenten</span>
            <input className={inputClass} inputMode="numeric" value={form.withRaisins} onChange={(e) => set("withRaisins")(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">ZONDER krenten</span>
            <input className={inputClass} inputMode="numeric" value={form.withoutRaisins} onChange={(e) => set("withoutRaisins")(e.target.value.replace(/\D/g, ""))} />
          </label>
          <div className="grid gap-1 text-sm">
            <span className="text-muted">TOTAAL</span>
            <p className="flex min-h-[40px] items-center font-serif text-xl font-bold tabular-nums text-krent">{total}</p>
          </div>
        </div>
        {!popup ? (
          <>
            <Segmented
              label="Bezorgen of afhalen"
              value={form.fulfilment}
              onChange={(v) => setForm((f) => ({ ...f, fulfilment: v }))}
              options={[
                ["bezorgen", "Bezorgen"],
                ["afhalen", "Afhalen"]
              ]}
            />
            {form.fulfilment === "bezorgen" ? (
              <div className="grid gap-2">
                <input className={inputClass} value={form.address} onChange={(e) => set("address")(e.target.value)} placeholder="Straat en huisnummer" aria-label="Adres" />
                <div className="grid grid-cols-[8rem_1fr] gap-2">
                  <input className={inputClass} value={form.postalCode} onChange={(e) => set("postalCode")(e.target.value)} placeholder="Postcode" aria-label="Postcode" />
                  <input className={inputClass} value={form.city} onChange={(e) => set("city")(e.target.value)} placeholder="Plaats" aria-label="Plaats" />
                </div>
              </div>
            ) : (
              <input className={inputClass} value={form.pickupLocation} onChange={(e) => set("pickupLocation")(e.target.value)} placeholder="Afhaallocatie" aria-label="Afhaallocatie" />
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              <input className={inputClass} value={form.contactPerson} onChange={(e) => set("contactPerson")(e.target.value)} placeholder="Contactpersoon" aria-label="Contactpersoon" />
              <input className={inputClass} value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="Telefoon" aria-label="Telefoon" />
              <input className={inputClass} value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="E-mail" aria-label="E-mail" />
            </div>
          </>
        ) : null}
        <label className="grid gap-1 text-sm">
          <span className={fieldLabel}>Opmerking</span>
          <input className={inputClass} value={form.note} onChange={(e) => set("note")(e.target.value)} />
        </label>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButton} disabled={busy} onClick={() => void save()}>
            {busy ? "Opslaan…" : popup ? "Pop-upvoorraad aanmaken" : "Bestelling aanmaken"}
          </button>
          <button type="button" className={ghostButton} disabled={busy} onClick={() => onDone(null)}>
            Annuleren
          </button>
        </div>
      </div>
    </Card>
  );
}

/** Pop-up stock: what went along, what was sold so far (counts in the tussenstand) and what is left. */
export function PopupSalesCard({ order, state, session, run }: { order: Order; state: DashboardState; session: Session; run: Run }) {
  const sold = state.popupSales[order.id];
  const [met, setMet] = useState(String(sold?.withRaisins ?? 0));
  const [zonder, setZonder] = useState(String(sold?.withoutRaisins ?? 0));
  const [amount, setAmount] = useState(sold?.amount == null ? "" : String(sold.amount));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Follow a change made elsewhere, as long as this form is untouched.
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (dirty) return;
    setMet(String(sold?.withRaisins ?? 0));
    setZonder(String(sold?.withoutRaisins ?? 0));
    setAmount(sold?.amount == null ? "" : String(sold.amount));
  }, [sold, dirty]);

  const left = popupLeft(order, state);
  const soldPieces = (sold?.withRaisins ?? 0) + (sold?.withoutRaisins ?? 0);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await run(() => backend.setPopupSales(session, order.id, { withRaisins: Number(met) || 0, withoutRaisins: Number(zonder) || 0, amount: amount.trim() === "" ? null : Number(amount.replace(",", ".")) }));
      setDirty(false);
      toast("Verkoop opgeslagen. De tussenstand telt mee.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan is mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle
        title="Verkocht op de pop-up"
        subtitle="Vul in hoeveel er tot nu toe verkocht is. Alleen dit telt mee in de tussenstand en de omzet; de hele voorraad telt mee voor het bakken."
        action={<Badge tone={soldPieces ? "klaar" : "zacht"}>{soldPieces ? `${soldPieces} verkocht` : "nog niets verkocht"}</Badge>}
      />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Verkocht MET (van {order.withRaisins})</span>
              <input className={inputClass} inputMode="numeric" value={met} onChange={(e) => { setMet(e.target.value.replace(/\D/g, "")); setDirty(true); }} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Verkocht ZONDER (van {order.withoutRaisins})</span>
              <input className={inputClass} inputMode="numeric" value={zonder} onChange={(e) => { setZonder(e.target.value.replace(/\D/g, "")); setDirty(true); }} />
            </label>
          </div>
          <label className="grid max-w-[14rem] gap-1 text-sm">
            <span className="text-muted">Opbrengst (€, mag leeg)</span>
            <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setDirty(true); }} placeholder={state.pricePerPiece ? `schatting: ${formatEuro(soldPieces * state.pricePerPiece)}` : ""} />
          </label>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={primaryButton} disabled={busy || !dirty} onClick={() => void save()}>
              {busy ? "Opslaan…" : "Verkoop opslaan"}
            </button>
            {sold?.updatedBy ? <span className="text-xs text-muted">Laatst bijgewerkt door {sold.updatedBy}, {sold.updatedAt.slice(5, 16)}</span> : null}
          </div>
        </div>
        <Bollenteller
          compact
          cells={[
            { label: "Mee", value: order.withRaisins + order.withoutRaisins },
            { label: "Verkocht", value: soldPieces },
            { label: "Over", value: left.withRaisins + left.withoutRaisins }
          ]}
        />
      </div>
    </Card>
  );
}
