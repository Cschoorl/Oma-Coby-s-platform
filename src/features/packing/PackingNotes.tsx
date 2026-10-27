import { useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import type { Patch } from "../../lib/useDashboard";
import { Badge, EmptyState, Notice, Segmented, formatDayLabel } from "../../components/ui";
import { fieldLabel as changeLabel, formatChangeTime, formatChangeValue } from "../../lib/orderChanges";
import { packNoteItems, type PackNoteItem } from "../../lib/packNotes";
import { patches } from "../../lib/patches";

type Show = "open" | "verwerkt";
type Days = "alle" | "dag";

/**
 * Inpakken › Opmerkingen: changes to orders and remarks that matter for packing. Tick an item off
 * once it is handled; a later change to the same order comes back as a new open item.
 */
export function PackingNotes({ state, session, run, date }: { state: DashboardState; session: Session; run: (change: () => Promise<unknown>, patch?: Patch) => Promise<void>; date: string }) {
  const [show, setShow] = useState<Show>("open");
  const [days, setDays] = useState<Days>("alle");
  const [error, setError] = useState<string | null>(null);

  const all = useMemo(() => packNoteItems(state), [state]);
  const inDays = all.filter((i) => days === "alle" || i.order.deliveryDate === date);
  const open = inDays.filter((i) => !i.done);
  const done = inDays.filter((i) => i.done).sort((a, b) => (b.done?.at ?? "").localeCompare(a.done?.at ?? ""));
  const list = show === "open" ? open : done;

  async function toggle(item: PackNoteItem, value: boolean) {
    setError(null);
    try {
      await run(() => backend.setPackNoteDone(session, item.id, item.orderId, value), patches.packNote(item.id, session.name, value));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan is mislukt.");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Opmerkingen tonen"
          value={show}
          onChange={setShow}
          options={[
            ["open", "Open", open.length],
            ["verwerkt", "Verwerkt", done.length]
          ]}
        />
        <Segmented
          label="Leverdagen"
          value={days}
          onChange={setDays}
          options={[
            ["alle", "Alle leverdagen"],
            ["dag", `Alleen ${formatDayLabel(date)}`]
          ]}
        />
      </div>
      <p className="text-sm text-muted">Wijzigingen in bestellingen en opmerkingen voor het inpakken. Vink af wat je verwerkt hebt; komt er later iets bij, dan staat het weer open.</p>
      {error ? <Notice tone="error">{error}</Notice> : null}

      {list.length === 0 ? (
        show === "open" ? (
          <EmptyState title="Alles verwerkt." text="Geen nieuwe wijzigingen of opmerkingen. Inpakken maar." />
        ) : (
          <EmptyState title="Nog niets afgevinkt." text="Wat je als verwerkt afvinkt, komt hier te staan." />
        )
      ) : (
        <ol className="grid gap-2.5" aria-label={show === "open" ? "Open opmerkingen" : "Verwerkte opmerkingen"}>
          {list.map((item) => (
            <PackNoteRow key={item.id} item={item} onToggle={(value) => void toggle(item, value)} />
          ))}
        </ol>
      )}
    </div>
  );
}

function PackNoteRow({ item, onToggle }: { item: PackNoteItem; onToggle: (done: boolean) => void }) {
  const { order } = item;
  const name = order.locationName || order.contactPerson || order.id;
  const created = item.changes.some((c) => c.field === "created");
  return (
    <li className={`grid gap-3 rounded-kaart bg-papier p-3.5 shadow-zacht sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start ${item.done ? "opacity-75" : ""}`}>
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={item.kind === "opmerking" ? "aandacht" : created ? "klaar" : "probleem"}>{item.kind === "opmerking" ? "Opmerking" : created ? "Nieuwe bestelling" : "Gewijzigd"}</Badge>
          <span className="font-bold text-krent">{name}</span>
          <span className="text-xs tabular-nums text-muted">
            {order.id} · {formatDayLabel(order.deliveryDate)}
          </span>
        </div>
        {item.kind === "opmerking" ? (
          <p className="whitespace-pre-line text-sm text-krent">{item.text}</p>
        ) : null}
        {item.kind === "wijziging" || item.changes.length ? (
          <ul className="grid gap-0.5 text-sm text-krent">
            {item.changes.map((c, i) => (
              <li key={`${c.field}-${i}`}>
                {item.kind === "opmerking" ? <span className="text-muted">Aangepast, was: </span> : <b>{changeLabel[c.field] ?? c.field}: </b>}
                {item.kind === "opmerking" ? (
                  <span className="text-muted line-through decoration-muted/60">{c.from || "–"}</span>
                ) : c.from || c.to ? (
                  <>
                    <span className="text-muted line-through decoration-muted/60">{formatChangeValue(c.field, c.from)}</span> → {formatChangeValue(c.field, c.to)}
                  </>
                ) : (
                  <span className="text-muted">aangepast</span>
                )}
                {c.note ? <span className="text-xs text-muted"> ({c.note})</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs tabular-nums text-muted">
          {item.at ? `${formatChangeTime(item.at)}${item.by ? ` · ${item.by}` : ""}` : "Uit de bestelling"}
          {item.done ? ` · verwerkt door ${item.done.by}, ${formatChangeTime(item.done.at)}` : ""}
        </p>
      </div>
      <button
        type="button"
        role="checkbox"
        aria-checked={Boolean(item.done)}
        aria-label={`Verwerkt: ${name}`}
        onClick={() => onToggle(!item.done)}
        className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition active:scale-[0.97] ${
          item.done ? "bg-kerst-50 text-kerst-ink hover:bg-vul" : "bg-vul text-krent hover:bg-vul-2"
        }`}
      >
        {item.done ? "✓ Verwerkt" : "Verwerkt"}
      </button>
    </li>
  );
}
