import { useMemo, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { BakeShare, BakedCount, DashboardState } from "../../types/dashboard";
import type { Patch } from "../../lib/useDashboard";
import { Badge, Bollenteller, Card, Icon, Notice, SectionTitle, Segmented, formatDayLabel, formatNumber, ghostButton, primaryButton, secondaryButton, toast } from "../../components/ui";
import { formatChangeTime } from "../../lib/orderChanges";
import { patches } from "../../lib/patches";
import { changedDays, channelLabel, diffSince, mailLink, shareText, sharesFor, signed, whatsappLink, type BakeCounts, type ShareChannel } from "../../lib/bakeShare";

interface BakeryPanelProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>, patch?: Patch) => Promise<void>;
  date: string;
  /** What has to be baked for this day: all orders, pop-up stock included. */
  counts: BakeCounts;
  baked: BakedCount;
  /** Switch to another delivery day (for "also changed: …"). */
  onDateChange: (date: string) => void;
}

/** The phone's own share menu, where there is one (phones and tablets). */
function nativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Inpakken › Bakkerij: the counts of one delivery day, shared via WhatsApp, e-mail or the share
 * menu. Each share is saved; when the counts change afterwards, a warning shows the difference.
 */
export function BakeryPanel({ state, session, run, date, counts, baked, onDateChange }: BakeryPanelProps) {
  const [scope, setScope] = useState<"dag" | "alle">("dag");
  const [error, setError] = useState<string | null>(null);
  const shares = useMemo(() => sharesFor(state, date), [state, date]);
  const last = shares[0];
  const diff = last ? diffSince(last, counts) : null;
  const text = shareText(date, counts, last);
  const subject = `Bakken voor ${formatDayLabel(date)}: ${counts.withRaisins + counts.withoutRaisins} oliebollen`;
  const total = counts.withRaisins + counts.withoutRaisins;
  const phoneMenu = nativeShare();
  const history = scope === "dag" ? shares : state.bakeShares ?? [];
  const otherChanged = useMemo(() => changedDays(state).filter((d) => d !== date), [state, date]);

  function record(channel: ShareChannel) {
    const share = { date, withRaisins: counts.withRaisins, withoutRaisins: counts.withoutRaisins, channel };
    setError(null);
    run(() => backend.logBakeShare(session, share), patches.bakeShare(share, session.name)).then(
      () => toast(`Doorgegeven via ${channelLabel[channel]}.`),
      (err) => setError(err instanceof Error ? `Gedeeld, maar niet vastgelegd: ${err.message}` : "Gedeeld, maar niet vastgelegd.")
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

  const buttons = (again: boolean) => (
    <div className="flex flex-wrap gap-2">
      {phoneMenu ? (
        <button type="button" className={primaryButton} onClick={() => void viaMenu()}>
          <Icon name="share" />
          {again ? "Opnieuw delen" : "Delen"}
        </button>
      ) : null}
      <button type="button" className={phoneMenu ? secondaryButton : primaryButton} onClick={viaWhatsApp}>
        <Icon name="share" />
        {again && !phoneMenu ? "Opnieuw via WhatsApp" : "Via WhatsApp"}
      </button>
      <button type="button" className={phoneMenu ? ghostButton : secondaryButton} onClick={viaMail}>
        <Icon name="mail" />
        {again && !phoneMenu ? "Opnieuw per e-mail" : "Per e-mail"}
      </button>
    </div>
  );

  return (
    <div className="grid gap-4">
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
          title={`Bakken voor ${formatDayLabel(date)}`}
          subtitle="Alle bestellingen van deze leverdag, pop-upvoorraad inbegrepen."
          action={!last ? <Badge tone="zacht">Nog niet doorgegeven</Badge> : diff?.changed ? <Badge tone="probleem">Gewijzigd sinds doorgeven</Badge> : <Badge tone="klaar">Doorgegeven</Badge>}
        />
        <Bollenteller
          cells={[
            { label: "Met", value: counts.withRaisins, sub: <span className="text-muted">{formatNumber(baked.withRaisins)} gebakken</span> },
            { label: "Zonder", value: counts.withoutRaisins, sub: <span className="text-muted">{formatNumber(baked.withoutRaisins)} gebakken</span> },
            { label: "Totaal", value: total, sub: <span className="text-muted">{formatNumber(baked.withRaisins + baked.withoutRaisins)} gebakken</span> }
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
            <p className="text-sm text-muted">Deze aantallen zijn nog niet aan de bakkerij doorgegeven.</p>
          )}

          {last && diff?.changed ? (
            <div className="grid gap-3 rounded-kaart bg-feest-50 p-3.5" role="alert">
              <p className="font-bold text-feest-ink">De aantallen zijn veranderd sinds je ze doorgaf. Geef ze opnieuw door.</p>
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
              {buttons(true)}
            </div>
          ) : (
            buttons(Boolean(last))
          )}
          {error ? <Notice tone="error">{error}</Notice> : null}
          {!state.bakery?.phone && !state.bakery?.email ? (
            <p className="text-xs text-muted">Tip: zet in het tabblad Instellingen van de Sheet <code>bakkerij_whatsapp</code> en <code>bakkerij_email</code>, dan gaat het bericht meteen naar de bakkerij.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Bericht" subtitle="Zo komt het bij de bakkerij aan." />
        <pre className="whitespace-pre-wrap rounded-lg bg-vul p-3 font-sans text-sm text-krent">{text}</pre>
      </Card>

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

const shortChannel: Record<string, string> = { whatsapp: "WhatsApp", email: "E-mail", deelmenu: "Deelmenu" };

function ShareHistory({ list, showDay }: { list: BakeShare[]; showDay: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-lijn-2 text-left text-xs text-muted">
            <th className="pb-1.5 font-bold">Gedeeld</th>
            {showDay ? <th className="pb-1.5 font-bold">Leverdag</th> : null}
            <th className="pb-1.5 text-right font-bold">Met</th>
            <th className="pb-1.5 text-right font-bold">Zonder</th>
            <th className="pb-1.5 text-right font-bold">Totaal</th>
            <th className="pb-1.5 pl-3 font-bold">Via</th>
            <th className="pb-1.5 font-bold">Door</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
