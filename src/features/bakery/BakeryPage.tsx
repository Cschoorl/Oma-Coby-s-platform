import { useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { BakeShare, DashboardState } from "../../types/dashboard";
import type { Patch } from "../../lib/useDashboard";
import { Badge, Bollenteller, Card, CopyButton, Icon, Notice, SectionTitle, Segmented, fieldLabel, formatDayLabel, formatNumber, inputClass, primaryButton, secondaryButton, toast, todayIso } from "../../components/ui";
import { OrderFilters } from "../orders/OrderFilters";
import { BakeApprovalCard } from "./BakeApprovalCard";
import { formatChangeTime } from "../../lib/orderChanges";
import { patches } from "../../lib/patches";
import { BAKE_NOTE_MAX, addDays, bakeCounts, changedDays, channelLabel, diffSince, mailLink, shareText, sharesFor, signed, whatsappLink, type ShareChannel } from "../../lib/bakeShare";

interface BakeryPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>, patch?: Patch) => Promise<void>;
}

/** The phone's own share menu, where there is one (phones and tablets). */
function nativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Bakkerij (beheer): the order list for the bakers, one day ahead. Opens on tomorrow; the counts are
 * shared via WhatsApp, e-mail or the share menu, or copied and pasted into a chat. A remark for the
 * baker goes along in the message. Each share is saved; when the counts change afterwards, a warning
 * shows the difference per product.
 */
export function BakeryPage({ state, session, run }: BakeryPageProps) {
  const today = todayIso();
  const tomorrow = addDays(today, 1);
  const [date, onDateChange] = useState(tomorrow);
  const dates = useMemo(() => Array.from(new Set([tomorrow, ...state.orders.map((o) => o.deliveryDate).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))])).sort(), [state.orders, tomorrow]);
  const counts = useMemo(() => bakeCounts(state, date), [state, date]);
  const orderCount = state.orders.filter((o) => o.deliveryDate === date).length;
  const [scope, setScope] = useState<"dag" | "alle">("dag");
  const [error, setError] = useState<string | null>(null);
  const shares = useMemo(() => sharesFor(state, date), [state, date]);
  const last = shares[0];
  const diff = last ? diffSince(last, counts) : null;
  // The remark per delivery day; it starts as what last went along, so sharing again keeps it.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const note = notes[date] ?? last?.note ?? "";
  // After copying: the day whose message is on the clipboard, until it is saved as passed on.
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const text = shareText(date, counts, last, today, note);
  const subject = `Bestellijst ${date === tomorrow ? "voor morgen, " : ""}${formatDayLabel(date)}: ${counts.withRaisins + counts.withoutRaisins} oliebollen`;
  const total = counts.withRaisins + counts.withoutRaisins;
  const phoneMenu = nativeShare();
  const history = scope === "dag" ? shares : state.bakeShares ?? [];
  const otherChanged = useMemo(() => changedDays(state).filter((d) => d !== date), [state, date]);

  function record(channel: ShareChannel) {
    const share = { date, withRaisins: counts.withRaisins, withoutRaisins: counts.withoutRaisins, channel, note: note.trim() };
    setError(null);
    setCopiedFor(null);
    run(() => backend.logBakeShare(session, share), patches.bakeShare(share, session.name)).then(
      () => toast(`Doorgegeven via ${channelLabel[channel]}.`),
      (err) => setError(err instanceof Error ? `Het doorgeven is niet vastgelegd: ${err.message}` : "Het doorgeven is niet vastgelegd.")
    );
  }

  // WhatsApp and e-mail open right away (a pop-up blocker would stop a later open); saving follows.
  function viaWhatsApp() {
    window.open(whatsappLink(text, state.bakery?.phone), "_blank", "noopener");
    record("whatsapp");
  }
  function viaMail() {
    window.location.href = mailLink(text, subject, state.bakery?.email);
    record("email");
  }
  async function viaMenu() {
    try {
      await navigator.share({ title: subject, text });
      record("deelmenu");
    } catch (err) {
      // Closed the menu without sharing: nothing passed on, nothing saved.
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Delen via het deelmenu lukte niet. Probeer WhatsApp of e-mail.");
    }
  }

  const tall = "min-h-[44px]";
  const buttons = (again: boolean) => (
    <div className="flex flex-wrap gap-2">
      {phoneMenu ? (
        <button type="button" className={`${primaryButton} ${tall}`} onClick={() => void viaMenu()}>
          <Icon name="share" />
          {again ? "Opnieuw delen" : "Delen"}
        </button>
      ) : null}
      <button type="button" className={`${phoneMenu ? secondaryButton : primaryButton} ${tall}`} onClick={viaWhatsApp}>
        <Icon name="whatsapp" />
        {again && !phoneMenu ? "Opnieuw via WhatsApp" : "Via WhatsApp"}
      </button>
      <button type="button" className={`${secondaryButton} ${tall}`} onClick={viaMail}>
        <Icon name="mail" />
        {again && !phoneMenu ? "Opnieuw per e-mail" : "Per e-mail"}
      </button>
      <CopyButton text={text} label="Kopieer bericht" done="Bericht gekopieerd" className={`${secondaryButton} ${tall}`} onCopied={() => setCopiedFor(date)} />
    </div>
  );

  return (
    <div className="grid gap-4">
      <OrderFilters selectedDate={date} availableDates={dates} onDateChange={onDateChange} />
      {date !== tomorrow ? (
        <p className="text-sm text-muted">
          Je kijkt naar {formatDayLabel(date)}.{" "}
          <button type="button" className="font-bold text-krent underline" onClick={() => onDateChange(tomorrow)}>
            Terug naar morgen ({formatDayLabel(tomorrow)})
          </button>
        </p>
      ) : null}
      {otherChanged.length ? (
        <Notice tone="warning">
          Ook veranderd sinds het doorgeven:{" "}
          {otherChanged.map((d, i) => (
            <span key={d}>
              {i ? ", " : ""}
              <button type="button" className="font-bold underline" onClick={() => onDateChange(d)}>
                {formatDayLabel(d)}
              </button>
            </span>
          ))}
          .
        </Notice>
      ) : null}
      <Card>
        <SectionTitle
          title={date === tomorrow ? `Morgen bakken: ${formatDayLabel(date)}` : `Bakken voor ${formatDayLabel(date)}`}
          subtitle={`${orderCount} ${orderCount === 1 ? "bestelling" : "bestellingen"} op deze leverdag, pop-upvoorraad inbegrepen. Zet de lijst een dag van tevoren klaar en stuur hem naar de bakker.`}
          action={!last ? <Badge tone="zacht">Nog niet doorgegeven</Badge> : diff?.changed ? <Badge tone="probleem">Gewijzigd sinds doorgeven</Badge> : <Badge tone="klaar">Doorgegeven</Badge>}
        />
        <Bollenteller
          cells={[
            { label: "Met", value: counts.withRaisins },
            { label: "Zonder", value: counts.withoutRaisins },
            { label: "Totaal", value: total }
          ]}
        />

        <div className="mt-4 grid gap-3">
          {last ? (
            <p className="text-sm text-krent">
              <b>Laatst doorgegeven op {formatChangeTime(last.at)}</b>
              <span className="text-muted">
                {" "}
                via {channelLabel[last.channel]} door {last.by}:
              </span>{" "}
              met {formatNumber(last.withRaisins)} · zonder {formatNumber(last.withoutRaisins)} · totaal {formatNumber(last.total)}
            </p>
          ) : (
            <p className="text-sm text-muted">Deze lijst is nog niet naar de bakker gestuurd.</p>
          )}

          {last?.note ? (
            <p className="-mt-2 text-sm text-muted">
              Opmerking erbij: <span className="text-krent">{last.note}</span>
            </p>
          ) : null}

          {last && diff?.changed ? (
            <div className="grid gap-3 rounded-kaart bg-feest-50 p-3.5" role="alert">
              <p className="font-bold text-feest-ink">! De aantallen zijn veranderd sinds je ze doorgaf. Geef ze opnieuw door.</p>
              <table className="w-full max-w-md text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-1 font-bold"> </th>
                    <th className="pb-1 text-right font-bold">Doorgegeven</th>
                    <th className="pb-1 text-right font-bold">Nu</th>
                    <th className="pb-1 text-right font-bold">Verschil</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["Met krenten", last.withRaisins, counts.withRaisins, diff.withRaisins],
                      ["Zonder krenten", last.withoutRaisins, counts.withoutRaisins, diff.withoutRaisins],
                      ["Totaal", last.total, total, diff.total]
                    ] as const
                  ).map(([label, before, now, d]) => (
                    <tr key={label} className="border-t border-lijn">
                      <td className="py-1.5 text-krent">{label}</td>
                      <td className="py-1.5 text-right text-muted">{formatNumber(before)}</td>
                      <td className="py-1.5 text-right text-krent">{formatNumber(now)}</td>
                      <td className={`py-1.5 text-right font-bold ${d === 0 ? "text-muted" : "text-feest-ink"}`}>{signed(d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {total === 0 ? (
            <Notice tone="info">Geen bestellingen op deze leverdag, dus niets door te geven.</Notice>
          ) : (
            // The message itself: remark, what goes out, and the ways to send it. One hairline sets it apart.
            <div className="grid gap-3 border-t border-lijn pt-4">
              <label className="grid gap-1.5">
                <span className={fieldLabel}>Opmerking voor de bakker</span>
                <textarea
                  className={`${inputClass} min-h-[72px] resize-y text-base sm:text-sm`}
                  rows={2}
                  maxLength={BAKE_NOTE_MAX}
                  placeholder="Bijvoorbeeld: graag om 6:30 klaar."
                  value={note}
                  onChange={(e) => setNotes((n) => ({ ...n, [date]: e.target.value }))}
                />
              </label>
              <div className="grid gap-1.5">
                <p className={fieldLabel}>Bericht</p>
                <pre className="select-all whitespace-pre-wrap rounded-md bg-vul p-3 font-sans text-sm text-krent">{text}</pre>
              </div>
              {buttons(Boolean(last))}
              {copiedFor === date ? (
                <Notice tone="success">
                  Het bericht is gekopieerd: plak het in je chat met de bakker.{" "}
                  <button type="button" className="font-bold underline underline-offset-4" onClick={() => record("gekopieerd")}>
                    Verstuurd? Leg vast als doorgegeven
                  </button>
                </Notice>
              ) : null}
            </div>
          )}
          {error ? <Notice tone="error">{error}</Notice> : null}
          {!state.bakery?.phone && !state.bakery?.email ? (
            <p className="text-xs text-muted">Tip: zet in het tabblad Instellingen van de Sheet <code>bakkerij_whatsapp</code> en <code>bakkerij_email</code>, dan gaat het bericht meteen naar de bakkerij.</p>
          ) : null}
        </div>
      </Card>

      <BakeApprovalCard state={state} session={session} run={run} date={date} needed={counts} />

      <Card>
        <SectionTitle
          title="Eerder doorgegeven"
          subtitle="Elke keer dat er gedeeld is, nieuwste bovenaan."
          action={
            <Segmented
              label="Welke leverdagen"
              value={scope}
              onChange={setScope}
              options={[
                ["dag", "Deze dag", shares.length],
                ["alle", "Alle dagen", state.bakeShares?.length ?? 0]
              ]}
            />
          }
        />
        {history.length === 0 ? <p className="text-sm text-muted">Nog niets gedeeld.</p> : <ShareHistory list={history} showDay={scope === "alle"} />}
      </Card>
    </div>
  );
}

const shortChannel: Record<string, string> = { whatsapp: "WhatsApp", email: "E-mail", deelmenu: "Deelmenu", gekopieerd: "Gekopieerd" };

function ShareHistory({ list, showDay }: { list: BakeShare[]; showDay: boolean }) {
  // The remark column only when a remark ever went along.
  const showNote = list.some((s) => s.note);
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm tabular-nums ${showNote ? "min-w-[560px]" : ""}`}>
        <thead>
          <tr className="border-b border-lijn-2 text-left text-xs text-muted">
            <th className="pb-1.5 font-bold">Gedeeld</th>
            {showDay ? <th className="pb-1.5 font-bold">Leverdag</th> : null}
            <th className="pb-1.5 text-right font-bold">Met</th>
            <th className="pb-1.5 text-right font-bold">Zonder</th>
            <th className="pb-1.5 text-right font-bold">Totaal</th>
            <th className="pb-1.5 pl-3 font-bold">Via</th>
            <th className="pb-1.5 font-bold">Door</th>
            {showNote ? <th className="pb-1.5 pl-3 font-bold">Opmerking</th> : null}
          </tr>
        </thead>
        <tbody>
          {list.map((s, i) => (
            <tr key={`${s.id}-${i}`} className="border-b border-lijn last:border-0">
              <td className="py-1.5 text-krent">{formatChangeTime(s.at)}</td>
              {showDay ? <td className="py-1.5">{formatDayLabel(s.date)}</td> : null}
              <td className="py-1.5 text-right">{formatNumber(s.withRaisins)}</td>
              <td className="py-1.5 text-right">{formatNumber(s.withoutRaisins)}</td>
              <td className="py-1.5 text-right font-bold">{formatNumber(s.total)}</td>
              <td className="py-1.5 pl-3">{shortChannel[s.channel] ?? s.channel}</td>
              <td className="py-1.5">{s.by}</td>
              {showNote ? <td className="min-w-[160px] py-1.5 pl-3 text-oliebol">{s.note}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
