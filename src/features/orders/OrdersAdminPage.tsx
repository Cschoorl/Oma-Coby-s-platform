import { useEffect, useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState, OrderMeta } from "../../types/dashboard";
import { emptyMeta } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { Badge, Card, Notice, SectionTitle, formatDayLabel, inputClass, primaryButton, secondaryButton } from "../../components/ui";
import { confirmationSubject, defaultConfirmation } from "../../utils/confirmation";
import { effectiveNote } from "../../utils/orderUtils";

interface OrdersAdminPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
}

type Filter = "review" | "confirm" | "all";

export function OrdersAdminPage({ state, session, run }: OrdersAdminPageProps) {
  const [filter, setFilter] = useState<Filter>("review");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const metaOf = (id: string): OrderMeta => state.meta[id] ?? emptyMeta;

  const orders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...state.orders]
      .sort((a, b) => (a.deliveryDate + a.plannedTime).localeCompare(b.deliveryDate + b.plannedTime))
      .filter((order) => {
        const meta = state.meta[order.id] ?? emptyMeta;
        if (filter === "review" && !(order.extras && meta.noteStatus !== "beoordeeld")) return false;
        if (filter === "confirm" && meta.confirmationStatus === "verzonden") return false;
        if (!q) return true;
        return [order.id, order.locationName, order.contactPerson, order.city, order.email ?? ""].some((v) => v.toLowerCase().includes(q));
      });
  }, [state.orders, state.meta, filter, query]);

  const counts = useMemo(() => {
    let review = 0;
    let confirm = 0;
    for (const order of state.orders) {
      const meta = state.meta[order.id] ?? emptyMeta;
      if (order.extras && meta.noteStatus !== "beoordeeld") review += 1;
      if (meta.confirmationStatus !== "verzonden") confirm += 1;
    }
    return { review, confirm };
  }, [state.orders, state.meta]);

  // Keep the open order selected after it drops out of the filter (e.g. once reviewed).
  useEffect(() => {
    if (!selectedId && orders[0]) setSelectedId(orders[0].id);
  }, [selectedId, orders]);
  const selected = state.orders.find((o) => o.id === selectedId) ?? orders[0] ?? null;

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["review", `Opmerkingen beoordelen (${counts.review})`],
                ["confirm", `Bevestiging nog niet verzonden (${counts.confirm})`],
                ["all", `Alle orders (${state.orders.length})`]
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
          <input className={`${inputClass} max-w-xs`} type="search" placeholder="Zoek op naam, plaats of order" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-3">
          <div className="grid max-h-[70vh] gap-2 overflow-y-auto">
            {orders.map((order) => {
              const meta = metaOf(order.id);
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className={`grid gap-1 rounded-xl border p-3 text-left transition ${
                    selected?.id === order.id ? "border-coby-500 bg-coby-50" : "border-stone-200 bg-white hover:border-coby-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-stone-900">{order.locationName || order.contactPerson}</span>
                    <span className="text-xs text-stone-500">{order.id}</span>
                  </div>
                  <span className="text-xs text-stone-600">{formatDayLabel(order.deliveryDate)} · {order.withRaisins + order.withoutRaisins} oliebollen</span>
                  <span className="flex flex-wrap gap-1">
                    {order.extras ? meta.noteStatus === "beoordeeld" ? <Badge tone="green">Opmerking beoordeeld</Badge> : <Badge tone="amber">Opmerking nieuw</Badge> : null}
                    {meta.confirmationStatus === "verzonden" ? <Badge tone="green">Bevestigd</Badge> : meta.confirmationStatus === "concept" ? <Badge tone="coby">Concept klaar</Badge> : null}
                  </span>
                </button>
              );
            })}
            {orders.length === 0 ? <p className="p-3 text-sm text-stone-600">Niets te doen in deze selectie.</p> : null}
          </div>
        </Card>

        {selected ? <OrderEditor key={selected.id} order={selected} meta={metaOf(selected.id)} session={session} run={run} /> : null}
      </section>
    </div>
  );
}

interface OrderEditorProps {
  order: Order;
  meta: OrderMeta;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
}

function OrderEditor({ order, meta, session, run }: OrderEditorProps) {
  const [note, setNote] = useState(meta.noteOverride || order.extras || "");
  const [text, setText] = useState(meta.confirmationText || defaultConfirmation(order, effectiveNote(order, meta)));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  // Pick up edits made by someone else, unless this user is typing in the field.
  const [noteDirty, setNoteDirty] = useState(false);
  const [textDirty, setTextDirty] = useState(false);
  useEffect(() => {
    if (!noteDirty) setNote(meta.noteOverride || order.extras || "");
  }, [meta.noteOverride, order.extras, noteDirty]);
  // Until a draft is saved or typed, the default text follows the latest reviewed remark.
  useEffect(() => {
    if (textDirty) return;
    setText(meta.confirmationText || defaultConfirmation(order, effectiveNote(order, meta)));
  }, [meta, order, textDirty]);

  const sent = meta.confirmationStatus === "verzonden";

  async function act(key: string, change: () => Promise<unknown>, success: string) {
    setBusy(key);
    setMessage(null);
    try {
      await run(change);
      setMessage({ tone: "success", text: success });
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Er ging iets mis." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function saveNote(reviewed: boolean) {
    const ok = await act("note", () => backend.updateNote(session, order.id, note.trim() === (order.extras ?? "").trim() ? "" : note, reviewed), reviewed ? "Opmerking beoordeeld." : "Opmerking opgeslagen.");
    if (ok) setNoteDirty(false);
  }

  async function sendConfirmation() {
    if (!order.email) return;
    if (!window.confirm(`Bevestiging versturen naar ${order.email}?`)) return;
    const ok = await act("send", () => backend.sendConfirmation(session, order.id, confirmationSubject(order), text), `Bevestiging verzonden naar ${order.email}.`);
    if (ok) setTextDirty(false);
  }

  return (
    <div className="grid content-start gap-4">
      <Card>
        <SectionTitle title={order.locationName || order.contactPerson} subtitle={`${order.id} · ${formatDayLabel(order.deliveryDate)} ${order.plannedTime}`} />
        <dl className="grid gap-1 text-sm text-stone-700 sm:grid-cols-2">
          <div>Contact: {order.contactPerson || "–"}</div>
          <div>Telefoon: {order.phone || "–"}</div>
          <div>E-mail: {order.email || <span className="text-amber-800">geen e-mailadres</span>}</div>
          <div>Klant: {order.customerType === "onbekend" ? "type onbekend" : order.customerType}</div>
          <div>MET: {order.withRaisins} · ZONDER: {order.withoutRaisins}</div>
          <div>Bezorger: {order.supplierName}</div>
        </dl>
      </Card>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <Card>
        <SectionTitle
          title="Opmerking"
          subtitle="Pas de opmerking aan als dat nodig is. Inpakkers en bezorgers zien direct de beoordeelde versie."
          action={meta.noteStatus === "beoordeeld" ? <Badge tone="green">Beoordeeld{meta.updatedBy ? ` door ${meta.updatedBy}` : ""}</Badge> : <Badge tone="amber">Nog niet beoordeeld</Badge>}
        />
        {order.extras ? <p className="mb-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">Origineel uit de Sheet: {order.extras}</p> : null}
        <textarea
          className={`${inputClass} min-h-[90px]`}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setNoteDirty(true);
          }}
          placeholder="Geen opmerking"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={primaryButton} disabled={busy !== null} onClick={() => void saveNote(true)}>
            Opslaan en markeren als beoordeeld
          </button>
          <button type="button" className={secondaryButton} disabled={busy !== null} onClick={() => void saveNote(false)}>
            Alleen opslaan
          </button>
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Klantbevestiging"
          subtitle="Controleer en pas de tekst aan voordat je verstuurt. Dit is een bevestiging, geen factuur."
          action={
            sent ? <Badge tone="green">Verzonden {meta.confirmationSentAt}</Badge> : meta.confirmationStatus === "concept" ? <Badge tone="coby">Concept opgeslagen</Badge> : <Badge>Nog niet klaargezet</Badge>
          }
        />
        <p className="mb-2 text-xs text-stone-600">Onderwerp: {confirmationSubject(order)}</p>
        <textarea
          className={`${inputClass} min-h-[320px] font-mono text-[13px] leading-relaxed`}
          value={text}
          disabled={sent}
          onChange={(e) => {
            setText(e.target.value);
            setTextDirty(true);
          }}
        />
        {!order.email ? (
          <div className="mt-2">
            <Notice tone="warning">Deze order heeft geen e-mailadres in de Sheet. Je kunt de bevestiging wel klaarzetten en kopiëren.</Notice>
          </div>
        ) : null}
        {!sent ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButton}
              disabled={busy !== null}
              onClick={async () => {
                const ok = await act("save", () => backend.saveConfirmation(session, order.id, text), "Concept opgeslagen.");
                if (ok) setTextDirty(false);
              }}
            >
              Concept opslaan
            </button>
            <button
              type="button"
              className={secondaryButton}
              disabled={busy !== null}
              onClick={() => {
                setText(defaultConfirmation(order, effectiveNote(order, meta)));
                setTextDirty(true);
              }}
            >
              Standaardtekst herstellen
            </button>
            <button type="button" className={secondaryButton} onClick={() => void navigator.clipboard?.writeText(text)}>
              Kopiëren
            </button>
            <button type="button" className={primaryButton} disabled={busy !== null || !order.email} onClick={() => void sendConfirmation()}>
              {busy === "send" ? "Versturen…" : "Versturen per e-mail"}
            </button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
