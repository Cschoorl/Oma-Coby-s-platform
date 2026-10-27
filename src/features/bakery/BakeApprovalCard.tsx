import { useEffect, useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { BakeApproval, DashboardState } from "../../types/dashboard";
import type { Patch } from "../../lib/useDashboard";
import { Badge, Card, ConfirmPanel, Notice, SectionTitle, fieldLabel, formatNumber, ghostButton, inputClass, primaryButton, toast } from "../../components/ui";
import { formatChangeTime } from "../../lib/orderChanges";
import { signed, type BakeCounts } from "../../lib/bakeShare";

interface BakeApprovalCardProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>, patch?: Patch) => Promise<void>;
  date: string;
  /** What the orders of this day need now. */
  needed: BakeCounts;
}

const kindLabel: Record<BakeApproval["kind"], string> = { goedkeuring: "Goedgekeurd", correctie: "Gecorrigeerd", overgenomen: "Overgenomen van Inpakken" };

/** "−10 te weinig", "+5 over" or "klopt". */
function diffText(baked: number, needed: number): string {
  const d = baked - needed;
  return d === 0 ? "klopt" : d < 0 ? `${signed(d)} te weinig` : `${signed(d)} over`;
}

/**
 * Beheer › Bakkerij: what was actually baked for a day, approved on name. After approval it is
 * locked; a correction is a new approval with a reason, so the history stays.
 */
export function BakeApprovalCard({ state, session, run, date, needed }: BakeApprovalCardProps) {
  const approvals = (state.bakeApprovals ?? []).filter((a) => a.date === date);
  const latest = approvals[0];
  const locked = Boolean(latest) && latest.kind !== "overgenomen";
  const [editing, setEditing] = useState(false);
  const [met, setMet] = useState("");
  const [zonder, setZonder] = useState("");
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A new day or a new approval: start from what is approved, or from what is needed.
  useEffect(() => {
    setMet(String(latest ? latest.withRaisins : needed.withRaisins));
    setZonder(String(latest ? latest.withoutRaisins : needed.withoutRaisins));
    setNote("");
    setEditing(false);
    setAsking(false);
    setError(null);
    // Only on a new day or a new approval, not on every change in the orders.
  }, [date, latest?.id]);

  const open = !locked || editing;
  const baked = open ? { withRaisins: Number(met) || 0, withoutRaisins: Number(zonder) || 0 } : { withRaisins: latest!.withRaisins, withoutRaisins: latest!.withoutRaisins };
  const correcting = locked && editing;
  const rows = [
    ["Met krenten", needed.withRaisins, baked.withRaisins],
    ["Zonder krenten", needed.withoutRaisins, baked.withoutRaisins],
    ["Totaal", needed.withRaisins + needed.withoutRaisins, baked.withRaisins + baked.withoutRaisins]
  ] as const;
  const allMatch = rows.every(([, n, b]) => n === b);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      await run(() =>
        backend.approveBaked(session, {
          date,
          withRaisins: baked.withRaisins,
          withoutRaisins: baked.withoutRaisins,
          neededWithRaisins: needed.withRaisins,
          neededWithoutRaisins: needed.withoutRaisins,
          note,
          after: latest?.id ?? ""
        })
      );
      toast(correcting ? "Correctie goedgekeurd." : "Gebakken aantallen goedgekeurd.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Goedkeuren is mislukt.");
    } finally {
      setBusy(false);
      setAsking(false);
    }
  }

  return (
    <Card>
      <SectionTitle
        title="Gebakken en goedkeuren"
        subtitle="Vul in hoeveel er echt gebakken is en keur het goed. Daarna ligt het vast; inpakkers zien het als 'gebakken'."
        action={
          latest ? (
            <Badge tone={latest.kind === "overgenomen" ? "aandacht" : "klaar"}>
              {latest.kind === "overgenomen" ? "Nog niet op naam goedgekeurd" : `${kindLabel[latest.kind]} door ${latest.by}`}
            </Badge>
          ) : (
            <Badge tone="zacht">Nog niet goedgekeurd</Badge>
          )
        }
      />

      {latest && !open ? (
        <p className="mb-3 text-sm text-krent">
          <b>
            {kindLabel[latest.kind]} door {latest.by} om {formatChangeTime(latest.at)}
          </b>
          {latest.note ? <span className="text-muted"> – {latest.note}</span> : null}
        </p>
      ) : null}
      {latest?.kind === "overgenomen" ? (
        <div className="mb-3">
          <Notice tone="warning">
            Deze aantallen ({formatNumber(latest.withRaisins)} met, {formatNumber(latest.withoutRaisins)} zonder) zijn op het oude inpakscherm ingevuld, zonder naam. Controleer ze en keur ze op naam goed.
          </Notice>
        </div>
      ) : null}

      <table className="w-full max-w-xl text-sm tabular-nums">
        <thead>
          <tr className={`border-b border-lijn-2 text-left ${fieldLabel}`}>
            <th className="pb-1.5 font-bold"> </th>
            <th className="pb-1.5 text-right font-bold">Benodigd</th>
            <th className="pb-1.5 text-right font-bold">Gebakken</th>
            <th className="pb-1.5 text-right font-bold">Verschil</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, n, b], i) => {
            const d = b - n;
            return (
              <tr key={label} className="border-b border-lijn last:border-0">
                <td className={`py-2 ${i === 2 ? "font-bold" : ""} text-krent`}>{label}</td>
                <td className="py-2 text-right text-muted">{formatNumber(n)}</td>
                <td className="py-2 text-right">
                  {open && i < 2 ? (
                    <input
                      className={`${inputClass} ml-auto w-24 text-right`}
                      inputMode="numeric"
                      aria-label={`Gebakken ${label.toLowerCase()}`}
                      value={i === 0 ? met : zonder}
                      onChange={(e) => (i === 0 ? setMet : setZonder)(e.target.value.replace(/\D/g, ""))}
                    />
                  ) : (
                    <span className="font-bold text-krent">{formatNumber(b)}</span>
                  )}
                </td>
                <td className={`py-2 text-right font-bold ${d === 0 ? "text-kerst-ink" : d < 0 ? "text-feest-ink" : "text-gouwe-ink"}`}>{diffText(b, n)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!allMatch ? (
        <p className="mt-2 text-xs text-muted">Te weinig: er moet nog bij gebakken worden. Over: er is meer gebakken dan besteld.</p>
      ) : null}

      <div className="mt-4 grid gap-3">
        {correcting ? (
          <label className="grid gap-1 text-sm">
            <span className={fieldLabel}>Waarom corrigeer je? (verplicht)</span>
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="bijv. 20 met krenten bijgebakken" />
          </label>
        ) : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {open ? (
          asking ? (
            <ConfirmPanel confirmLabel={correcting ? "Ja, correctie goedkeuren" : "Ja, goedkeuren"} busy={busy} onConfirm={() => void approve()} onCancel={() => setAsking(false)}>
              <p>
                {formatNumber(baked.withRaisins)} met en {formatNumber(baked.withoutRaisins)} zonder goedkeuren als gebakken voor deze dag, op naam van <b>{session.name}</b>? Daarna ligt het vast.
              </p>
            </ConfirmPanel>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={primaryButton} disabled={busy || (correcting && !note.trim())} onClick={() => setAsking(true)}>
                {correcting ? "Correctie goedkeuren" : latest?.kind === "overgenomen" ? "Op naam goedkeuren" : "Goedkeuren"}
              </button>
              {correcting ? (
                <button type="button" className={ghostButton} onClick={() => setEditing(false)}>
                  Annuleren
                </button>
              ) : null}
            </div>
          )
        ) : (
          <div>
            <button type="button" className={ghostButton} onClick={() => setEditing(true)}>
              Corrigeren
            </button>
          </div>
        )}
      </div>

      {approvals.length ? (
        <div className="mt-5">
          <p className={`mb-1.5 ${fieldLabel}`}>Geschiedenis</p>
          <ol className="grid">
            {approvals.map((a) => (
              <li key={a.id} className="grid gap-0.5 border-b border-lijn py-2 text-sm last:border-0 sm:grid-cols-[9rem_1fr] sm:gap-3">
                <span className="text-xs tabular-nums text-muted">
                  {a.at ? formatChangeTime(a.at) : "eerder"}
                  <br className="hidden sm:block" />
                  <span className="sm:hidden"> · </span>
                  {a.by}
                </span>
                <span className="text-krent">
                  <b>{kindLabel[a.kind]}</b>: met {formatNumber(a.withRaisins)} · zonder {formatNumber(a.withoutRaisins)} · totaal {formatNumber(a.total)}
                  {a.neededWithRaisins !== null && a.neededWithoutRaisins !== null ? (
                    <span className="text-muted">
                      {" "}
                      (benodigd toen {formatNumber(a.neededWithRaisins)} / {formatNumber(a.neededWithoutRaisins)})
                    </span>
                  ) : null}
                  {a.note ? <span className="text-muted"> – {a.note}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Card>
  );
}
