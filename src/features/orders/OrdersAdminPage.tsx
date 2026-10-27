import { useEffect, useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState, OrderMeta } from "../../types/dashboard";
import { emptyMeta } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { Badge, Bollenteller, Card, ConfirmPanel, CopyButton, EmptyState, Icon, Notice, SectionTitle, Segmented, formatDayLabel, ghostButton, inputClass, primaryButton, toast } from "../../components/ui";
import { confirmationSubject, defaultConfirmation } from "../../utils/confirmation";
import { effectiveNote } from "../../utils/orderUtils";
import { OrderEditCard, OrderHistory } from "./OrderEditCard";
import { changesFor, formatChangeTime } from "../../lib/orderChanges";
import { NewOrderCard, PopupSalesCard } from "./OrderCategoryCards";
import { categoryLabel } from "../../lib/categories";
import type { OrderCategory } from "../../types/order";

interface OrdersAdminPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
}

type Filter = "review" | "confirm" | "confirmed" | "all";

/** Bevestigd: the confirmation mail really went out (set only after a successful send). */
const isSent = (meta: OrderMeta) => meta.confirmationStatus === "verzonden";
/** The last attempt failed and nothing went out yet. */
const sendFailed = (meta: OrderMeta) => !isSent(meta) && Boolean(meta.confirmationError);
type Kind = "alle" | OrderCategory;

export function OrdersAdminPage({ state, session, run }: OrdersAdminPageProps) {
  const [filter, setFilter] = useState<Filter>("review");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("alle");
  // "Nieuw": the right column shows the form for a new order or pop-up stock.
  const [creating, setCreating] = useState<string | null>(null);

  const metaOf = (id: string): OrderMeta => state.meta[id] ?? emptyMeta;

  const orders = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sentAt = (o: Order) => (state.meta[o.id] ?? emptyMeta).confirmationSentAt ?? "";
    return [...state.orders]
      // Bevestigd: most recently sent first; elsewhere by delivery day.
      .sort((a, b) => (filter === "confirmed" ? sentAt(b).localeCompare(sentAt(a)) : (a.deliveryDate + a.plannedTime).localeCompare(b.deliveryDate + b.plannedTime)))
      .filter((order) => {
        const meta = state.meta[order.id] ?? emptyMeta;
        if (kind !== "alle" && order.category !== kind) return false;
        if (filter === "review" && !(order.extras && meta.noteStatus !== "beoordeeld")) return false;
        // Pop-up stock has no buyer to confirm to.
        if (filter === "confirm" && (isSent(meta) || order.category === "popup")) return false;
        if (filter === "confirmed" && !isSent(meta)) return false;
        if (!q) return true;
        return [order.id, order.locationName, order.contactPerson, order.city, order.email ?? ""].some((v) => v.toLowerCase().includes(q));
      });
  }, [state.orders, state.meta, filter, query, kind]);

  const counts = useMemo(() => {
    let review = 0;
    let confirm = 0;
    let confirmed = 0;
    for (const order of state.orders) {
      const meta = state.meta[order.id] ?? emptyMeta;
      if (order.extras && meta.noteStatus !== "beoordeeld") review += 1;
      if (!isSent(meta) && order.category !== "popup") confirm += 1;
      if (isSent(meta)) confirmed += 1;
    }
    const byKind = { regulier: 0, particulier: 0, popup: 0 };
    for (const order of state.orders) byKind[order.category] += 1;
    return { review, confirm, confirmed, byKind };
  }, [state.orders, state.meta]);

  // Keep the open order selected after it drops out of the filter (e.g. once reviewed).
  useEffect(() => {
    if (!selectedId && orders[0]) setSelectedId(orders[0].id);
  }, [selectedId, orders]);
  const selected = state.orders.find((o) => o.id === selectedId) ?? orders[0] ?? null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Filter"
          value={filter}
          onChange={setFilter}
          options={[
            ["review", "Opmerking beoordelen", counts.review],
            ["confirm", "Nog bevestigen", counts.confirm],
            ["confirmed", "Bevestigd", counts.confirmed],
            ["all", "Alle", state.orders.length]
          ]}
        />
        <Segmented
          label="Soort"
          value={kind}
          onChange={setKind}
          options={[
            ["alle", "Alle soorten"],
            ["regulier", "Regulier", counts.byKind.regulier],
            ["particulier", "Particulier", counts.byKind.particulier],
            ["popup", "Pop-up", counts.byKind.popup]
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ghostButton} onClick={() => setCreating("Particulier")}>
            + Bestelling
          </button>
          <button type="button" className={ghostButton} onClick={() => setCreating("Pop-up")}>
            + Pop-upvoorraad
          </button>
        </div>
        <label className="relative w-full sm:max-w-xs">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className={`${inputClass} pl-9`} type="search" placeholder="Zoek op naam, plaats of order" aria-label="Zoek bestellingen" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-1.5 sm:p-1.5">
          <div className="grid max-h-[70vh] gap-0.5 overflow-y-auto" role="listbox" aria-label="Bestellingen">
            {orders.map((order) => {
              const meta = metaOf(order.id);
              return (
                <button
                  key={order.id}
                  type="button"
                  role="option"
                  aria-selected={selected?.id === order.id}
                  onClick={() => setSelectedId(order.id)}
                  className={`grid gap-1 rounded-lg px-3 py-2.5 text-left transition ${selected?.id === order.id ? "bg-gouwe-50 ring-1 ring-inset ring-gouwe/70" : "hover:bg-vul"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-krent">{order.locationName || order.contactPerson}</span>
                    <span className="text-xs tabular-nums text-muted">{order.id}</span>
                  </div>
                  <span className="text-xs text-muted">{formatDayLabel(order.deliveryDate)} · {order.withRaisins + order.withoutRaisins} oliebollen</span>
                  <span className="flex flex-wrap gap-1">
                    {order.extras ? meta.noteStatus === "beoordeeld" ? <Badge tone="klaar">Opmerking beoordeeld</Badge> : <Badge tone="aandacht">Opmerking nieuw</Badge> : null}
                    {isSent(meta) ? (
                      <Badge tone="klaar">Bevestigd{meta.confirmationSentAt ? ` · ${formatChangeTime(meta.confirmationSentAt)}` : ""}</Badge>
                    ) : sendFailed(meta) ? (
                      <Badge tone="probleem">Mail mislukt</Badge>
                    ) : meta.confirmationStatus === "concept" ? (
                      <Badge>Concept klaar</Badge>
                    ) : null}
                    {order.category !== "regulier" ? <Badge tone={order.category === "popup" ? "aandacht" : "zacht"}>{categoryLabel[order.category]}</Badge> : null}
                    {changesFor(state, order.id).length ? <Badge tone="zacht">Gewijzigd</Badge> : null}
                  </span>
                </button>
              );
            })}
            {orders.length === 0 ? (
              filter === "confirmed" ? (
                <EmptyState title="Nog niets bevestigd." text="Hier komt een bestelling zodra de bevestigingsmail echt is verstuurd." />
              ) : (
                <EmptyState title="Niets te doen." text="Alle opmerkingen en bevestigingen in deze selectie zijn afgehandeld. Héééél netjes." />
              )
            ) : null}
          </div>
        </Card>

        {creating ? (
          <NewOrderCard
            key={creating}
            state={state}
            session={session}
            run={run}
            initialType={creating}
            onDone={(id) => {
              setCreating(null);
              if (id) {
                setFilter("all");
                setKind("alle");
                setSelectedId(id);
              }
            }}
          />
        ) : selected ? (
          <OrderEditor key={selected.id} order={selected} meta={metaOf(selected.id)} state={state} session={session} run={run} />
        ) : null}
      </section>
    </div>
  );
}

interface OrderEditorProps {
  order: Order;
  meta: OrderMeta;
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
}

function OrderEditor({ order, meta, state, session, run }: OrderEditorProps) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(meta.noteOverride || order.extras || "");
  const [text, setText] = useState(meta.confirmationText || defaultConfirmation(order, effectiveNote(order, meta)));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [askSend, setAskSend] = useState(false);

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

  const sent = isSent(meta);

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
    setAskSend(false);
    const ok = await act("send", () => backend.sendConfirmation(session, order.id, confirmationSubject(order), text), `Bevestiging verzonden naar ${order.email}.`);
    if (ok) {
      setTextDirty(false);
      toast("Bevestiging is de deur uit.");
    }
  }

  return (
    <div className="grid content-start gap-4">
      {editing ? <OrderEditCard order={order} state={state} session={session} run={run} onClose={() => setEditing(false)} /> : null}
      <Card className={editing ? "hidden" : ""}>
        <SectionTitle
          title={order.locationName || order.contactPerson}
          subtitle={`${order.id} · ${formatDayLabel(order.deliveryDate)} ${order.plannedTime}`}
          action={
            <button type="button" className={ghostButton} onClick={() => setEditing(true)}>
              Bewerken
            </button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <dl className="grid content-start gap-1 text-sm text-krent sm:grid-cols-2">
            <div><span className="text-muted">Contact:</span> {order.contactPerson || "–"}</div>
            <div><span className="text-muted">Telefoon:</span> {order.phone || "–"}</div>
            <div><span className="text-muted">E-mail:</span> {order.email || <span className="text-gouwe-ink">geen e-mailadres</span>}</div>
            <div>
              <span className="text-muted">Soort:</span> {categoryLabel[order.category]}
              {order.category === "regulier" ? <span className="text-muted"> ({order.customerType === "onbekend" ? "type onbekend" : order.customerType})</span> : null}
            </div>
            <div><span className="text-muted">Bezorger:</span> {meta.courier || order.supplierName || "–"}</div>
            <div className="sm:col-span-2">
              <span className="text-muted">{order.fulfilment === "afhalen" ? "Afhalen:" : "Bezorgen:"}</span>{" "}
              {order.fulfilment === "afhalen" ? order.pickupLocation || "–" : [order.address, [order.postalCode, order.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "–"}
              {order.deliveryMoment ? <span className="text-muted"> · {order.deliveryMoment}</span> : null}
            </div>
            {order.amount !== undefined ? (
              <div>
                <span className="text-muted">Bedrag:</span> € {order.amount.toFixed(2).replace(".", ",")}
              </div>
            ) : null}
          </dl>
          <Bollenteller
            compact
            cells={[
              { label: "Met", value: order.withRaisins },
              { label: "Zonder", value: order.withoutRaisins },
              { label: "Totaal", value: order.withRaisins + order.withoutRaisins }
            ]}
          />
        </div>
      </Card>

      {order.category === "popup" ? <PopupSalesCard order={order} state={state} session={session} run={run} /> : null}

      <OrderHistory state={state} orderId={order.id} />

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <Card>
        <SectionTitle
          title="Opmerking"
          subtitle="Pas de opmerking aan als dat nodig is. Inpakkers en bezorgers zien direct de beoordeelde versie."
          action={meta.noteStatus === "beoordeeld" ? <Badge tone="klaar">Beoordeeld{meta.updatedBy ? ` door ${meta.updatedBy}` : ""}</Badge> : <Badge tone="aandacht">Nog niet beoordeeld</Badge>}
        />
        {order.extras ? <p className="mb-2 text-xs text-muted">Origineel uit de Sheet: {order.extras}</p> : null}
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
          <button type="button" className={ghostButton} disabled={busy !== null} onClick={() => void saveNote(false)}>
            Alleen opslaan
          </button>
        </div>
      </Card>

      {/* Pop-up stock has no buyer: no confirmation. */}
      {order.category !== "popup" ? (
        <Card>
          <SectionTitle
            title="Klantbevestiging"
            subtitle="Controleer en pas de tekst aan voordat je verstuurt. Dit is een bevestiging, geen factuur."
            action={
              sent ? (
                <Badge tone="klaar">Verzonden {formatChangeTime(meta.confirmationSentAt)}</Badge>
              ) : sendFailed(meta) ? (
                <Badge tone="probleem">Versturen mislukt</Badge>
              ) : meta.confirmationStatus === "concept" ? (
                <Badge>Concept opgeslagen</Badge>
              ) : (
                <Badge tone="zacht">Nog niet klaargezet</Badge>
              )
            }
          />
          {sent ? (
            <p className="mb-2 text-sm text-kerst-ink">
              Verstuurd op {formatChangeTime(meta.confirmationSentAt)}
              {meta.confirmationSentTo ? ` naar ${meta.confirmationSentTo}` : ""}.
            </p>
          ) : null}
          {sendFailed(meta) ? (
            <div className="mb-3">
              <Notice tone="error">
                Versturen is mislukt{meta.confirmationAttemptAt ? ` (${formatChangeTime(meta.confirmationAttemptAt)})` : ""}: {meta.confirmationError}. Deze bestelling staat daarom nog niet bij Bevestigd. Controleer het e-mailadres en probeer het opnieuw.
              </Notice>
            </div>
          ) : null}
          <p className="mb-2 text-xs text-muted">Onderwerp: {confirmationSubject(order)}</p>
          <textarea
            className={`${inputClass} min-h-[320px] text-[13px] leading-relaxed`}
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
            askSend ? (
              <div className="mt-3">
                <ConfirmPanel confirmLabel="Ja, versturen" busy={busy === "send"} onConfirm={() => void sendConfirmation()} onCancel={() => setAskSend(false)}>
                  <p>
                    Bevestiging versturen naar <b>{order.email}</b>?
                  </p>
                </ConfirmPanel>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" className={primaryButton} disabled={busy !== null || !order.email} onClick={() => setAskSend(true)}>
                  <Icon name="mail" />
                  {busy === "send" ? "Versturen…" : sendFailed(meta) ? "Opnieuw versturen" : "Versturen per e-mail"}
                </button>
                <button
                  type="button"
                  className={ghostButton}
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
                  className={ghostButton}
                  disabled={busy !== null}
                  onClick={() => {
                    setText(defaultConfirmation(order, effectiveNote(order, meta)));
                    setTextDirty(true);
                  }}
                >
                  Standaardtekst
                </button>
                <CopyButton text={text} label="Kopiëren" className={ghostButton} />
              </div>
            )
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
