import { useEffect, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { Badge, Card, Notice, SectionTitle, fieldLabel, ghostButton, inputClass, primaryButton, toast } from "../../components/ui";
import { DeliveryContactLine } from "../../components/DeliveryContactLine";
import { deliveryContact } from "../../lib/deliveryContact";

type Run = (change: () => Promise<unknown>) => Promise<void>;

/**
 * Contact on the delivery address for this delivery. Starts as the customer's contact from the order;
 * a change here holds for this delivery only and goes into the change log.
 */
export function DeliveryContactCard({ order, state, session, run }: { order: Order; state: DashboardState; session: Session; run: Run }) {
  const current = deliveryContact(order, state.meta[order.id]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: current.name, phone: current.phone, note: current.note });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Another order, or a change saved elsewhere: show that, unless someone is typing.
  useEffect(() => {
    if (!editing) setForm({ name: current.name, phone: current.phone, note: current.note });
  }, [order.id, current.name, current.phone, current.note, editing]);

  async function save(reset: boolean) {
    setBusy(true);
    setError(null);
    try {
      await run(() =>
        backend.setDeliveryContact(session, order.id, {
          contactName: form.name,
          phone: form.phone,
          note: form.note,
          reset,
          from: { name: current.name, phone: current.phone, note: current.note }
        })
      );
      setEditing(false);
      toast(reset ? "Weer het contact van de klant." : "Contact voor deze bezorging opgeslagen.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan is mislukt.");
    } finally {
      setBusy(false);
    }
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const customer = order.contactPerson || order.phone ? [order.contactPerson, order.phone].filter(Boolean).join(", ") : "";

  return (
    <Card>
      <SectionTitle
        title="Contact bij aflevering"
        subtitle="Wie de bezorger op het adres kan bellen. Inpakkers en bezorgers zien dit bij de bestelling."
        action={current.custom ? <Badge tone="aandacht">Aangepast voor deze bezorging</Badge> : <Badge tone="zacht">Contact van de klant</Badge>}
      />
      {!editing ? (
        <div className="grid gap-3">
          {current.name || current.phone || current.note ? <DeliveryContactLine contact={current} /> : <p className="text-sm text-muted">Nog geen contactpersoon bekend.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghostButton} onClick={() => setEditing(true)}>
              {current.name || current.phone ? "Aanpassen" : "Contact invullen"}
            </button>
            {current.custom ? (
              <button type="button" className={ghostButton} disabled={busy} onClick={() => void save(true)}>
                Terug naar contact van de klant{customer ? ` (${customer})` : ""}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className={fieldLabel}>Naam</span>
              <input className={inputClass} value={form.name} onChange={set("name")} aria-label="Naam contactpersoon" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className={fieldLabel}>Telefoon</span>
              <input className={inputClass} type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="06 12345678" aria-label="Telefoon contactpersoon" />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className={fieldLabel}>Opmerking (mag leeg)</span>
            <input className={inputClass} value={form.note} onChange={set("note")} placeholder="bijv. bel bij aankomst" aria-label="Opmerking contact" />
          </label>
          {customer && !current.custom ? <p className="text-xs text-muted">Contact van de klant: {customer}. Wat je hier aanpast, geldt alleen voor deze bezorging.</p> : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButton} disabled={busy} onClick={() => void save(false)}>
              {busy ? "Opslaan…" : "Opslaan"}
            </button>
            <button type="button" className={ghostButton} disabled={busy} onClick={() => setEditing(false)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
