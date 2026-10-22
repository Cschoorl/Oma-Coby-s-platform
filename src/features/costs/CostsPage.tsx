import { useMemo, useState } from "react";
import { backend, isValidIban, normaliseIban, type Session } from "../../data/backend";
import type { CostEntry, CostStatus, DashboardState, ReceiptFields } from "../../types/dashboard";
import { Badge, Card, ConfirmPanel, CopyButton, EmptyState, Icon, Notice, OliebolLoader, SectionTitle, Segmented, StatStrip, StatusTrack, fieldLabel, formatEuro, formatNumber, ghostButton, inputClass, primaryButton, secondaryButton, textAction, todayIso } from "../../components/ui";

interface CostsPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
}

const MAX_SIDE = 1600;

/** Scales the photo down and re-encodes it as JPEG, so uploads stay small on mobile data. */
async function photoToJpeg(file: File): Promise<{ base64: string; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Deze foto kan niet worden gelezen. Probeer een JPG of PNG."));
      image.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL("image/jpeg", 0.82);
    return { base64: preview.split(",")[1], preview };
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Draft {
  date: string;
  amount: string;
  supplier: string;
  description: string;
  photoUrl: string;
  iban: string;
}

const IBAN_KEY = "omacoby-iban";

/** The IBAN is remembered on this device only, so the next declaration is quicker. */
function rememberedIban(): string {
  try {
    return localStorage.getItem(IBAN_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberIban(iban: string) {
  try {
    localStorage.setItem(IBAN_KEY, iban);
  } catch {
    // Private mode: nothing to remember.
  }
}

const emptyDraft = (): Draft => ({ date: todayIso(), amount: "", supplier: "", description: "", photoUrl: "", iban: rememberedIban() });

function fromFields(fields: ReceiptFields, photoUrl: string): Draft {
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(fields.date) ? fields.date : todayIso(),
    amount: fields.amount !== null ? fields.amount.toFixed(2).replace(".", ",") : "",
    supplier: fields.supplier,
    description: fields.description,
    photoUrl,
    iban: rememberedIban()
  };
}

const STEPS = ["Ingediend", "Goedgekeurd", "Uitbetaald"];
const stepOf: Record<CostStatus, number> = { ingediend: 0, goedgekeurd: 1, uitbetaald: 2, afgekeurd: -1 };
const stepHint: Record<CostStatus, string> = { ingediend: "beheer kijkt ernaar", goedgekeurd: "uitbetaling volgt", uitbetaald: "", afgekeurd: "" };

export function CostsPage({ state, session, run }: CostsPageProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<"read" | "save" | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "warning"; text: string } | null>(null);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy("read");
    setMessage(null);
    try {
      const { base64, preview: img } = await photoToJpeg(file);
      setPreview(img);
      const result = await backend.extractReceipt(session, base64, "image/jpeg");
      setDraft(fromFields(result.fields, result.photoUrl));
      setMessage(result.warning ? { tone: "warning", text: result.warning } : { tone: "success", text: "Bon uitgelezen. Controleer de gegevens en dien in." });
    } catch (err) {
      setDraft((d) => d ?? emptyDraft());
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Uitlezen mislukt. Vul de gegevens zelf in." });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!draft) return;
    const amount = Number(draft.amount.replace(/\./g, "").replace(",", "."));
    if (!isValidIban(draft.iban)) {
      setMessage({ tone: "error", text: "Vul een geldig IBAN in, bijvoorbeeld NL91ABNA0417164300." });
      return;
    }
    setBusy("save");
    setMessage(null);
    try {
      const iban = normaliseIban(draft.iban);
      await run(() => backend.saveCost(session, { date: draft.date, amount, supplier: draft.supplier, description: draft.description, photoUrl: draft.photoUrl, iban }));
      rememberIban(iban);
      setDraft(null);
      setPreview(null);
      setMessage({ tone: "success", text: "Declaratie ingediend. Je ziet hieronder wanneer hij is goedgekeurd en uitbetaald." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Opslaan mislukt." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <SectionTitle title="Kosten declareren" subtitle="Maak een foto van je bon. Datum, bedrag, leverancier en omschrijving worden automatisch uitgelezen; jij controleert, vult je IBAN in en dient in." />
        <div className="flex flex-wrap gap-2">
          <label className={`${primaryButton} min-h-[48px] cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
            <Icon name="camera" />
            {busy === "read" ? "Bon wordt uitgelezen…" : "Foto van bon maken of kiezen"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                void onPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {!draft ? (
            <button type="button" className={ghostButton} onClick={() => setDraft(emptyDraft())}>
              Zonder foto invullen
            </button>
          ) : null}
        </div>
        {/* Reading a receipt takes a few seconds: a real wait, so the loader shows. */}
        {busy === "read" ? <OliebolLoader label="We lezen je bon uit…" delay={600} /> : null}
      </Card>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      {draft ? (
        <Card>
          <SectionTitle title="Controleer de gegevens" subtitle={`Wordt ingediend op naam van ${session.name}.`} />
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            {preview ? <img src={preview} alt="Foto van de bon" className="max-h-80 w-full rounded-kaart bg-vul object-contain" /> : <div className="hidden md:block" />}
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className={fieldLabel}>Datum</span>
                  <input type="date" className={inputClass} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className={fieldLabel}>Bedrag (€)</span>
                  <input inputMode="decimal" className={inputClass} placeholder="0,00" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                <span className={fieldLabel}>Leverancier</span>
                <input className={inputClass} value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className={fieldLabel}>Omschrijving</span>
                <textarea className={`${inputClass} min-h-[70px]`} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className={fieldLabel}>IBAN voor de terugbetaling</span>
                <input className={`${inputClass} font-mono uppercase`} placeholder="NL00 BANK 0123 4567 89" value={draft.iban} onChange={(e) => setDraft({ ...draft, iban: e.target.value })} autoComplete="off" />
                <span className="text-xs text-muted">Alleen beheer ziet je volledige IBAN. Dit apparaat onthoudt hem voor de volgende keer.</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryButton} disabled={busy !== null} onClick={() => void save()}>
                  {busy === "save" ? "Indienen…" : "Declaratie indienen"}
                </button>
                <button
                  type="button"
                  className={ghostButton}
                  disabled={busy !== null}
                  onClick={() => {
                    setDraft(null);
                    setPreview(null);
                  }}
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {session.role === "beheer" ? <AdminCosts state={state} session={session} run={run} /> : <MyCosts costs={state.costs} />}
    </div>
  );
}

/** Three dots and one word; a rejected declaration shows the reason instead. */
function StatusLine({ cost }: { cost: CostEntry }) {
  if (cost.status === "afgekeurd") {
    return (
      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone="probleem">Afgekeurd</Badge>
        {cost.reason ? <span>Reden: {cost.reason}</span> : null}
      </p>
    );
  }
  const hint = cost.status === "uitbetaald" && cost.paidAt ? `op ${cost.paidAt}` : stepHint[cost.status];
  return <StatusTrack step={stepOf[cost.status]} labels={STEPS} hint={hint || undefined} />;
}

/** A volunteer sees only their own declarations and where they are in the process. */
function MyCosts({ costs }: { costs: CostEntry[] }) {
  const open = costs.filter((c) => c.status === "ingediend" || c.status === "goedgekeurd").reduce((sum, c) => sum + c.amount, 0);
  return (
    <Card>
      <SectionTitle title="Mijn declaraties" subtitle={costs.length ? <>nog te ontvangen <b className="tabular-nums text-krent">{formatEuro(open)}</b></> : undefined} />
      {costs.length === 0 ? <EmptyState title="Nog niets gedeclareerd." text="Iets voorgeschoten voor de actie? Maak een foto van de bon hierboven." /> : null}
      <div className="grid">
        {[...costs].reverse().map((c) => (
          <div key={c.id} className="border-b border-lijn py-3.5 text-sm first:pt-0 last:border-0 last:pb-0">
            <p>
              <span className="font-serif text-xl font-bold tabular-nums text-krent">{formatEuro(c.amount)}</span> <b className="text-krent">{c.supplier}</b>
            </p>
            <p className="text-xs text-muted">
              {c.date}
              {c.description ? ` · ${c.description}` : ""}
            </p>
            <StatusLine cost={c} />
          </div>
        ))}
      </div>
    </Card>
  );
}

type AdminFilter = "ingediend" | "goedgekeurd" | "alles";

function AdminCosts({ state, session, run }: CostsPageProps) {
  const [filter, setFilter] = useState<AdminFilter>("ingediend");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Rejecting asks for a reason and paying for a date, in the row itself instead of a browser prompt.
  const [asking, setAsking] = useState<{ id: string; kind: "afkeuren" | "uitbetalen"; value: string } | null>(null);

  const sum = (status: CostStatus) => state.costs.filter((c) => c.status === status).reduce((s, c) => s + c.amount, 0);
  const count = (status: CostStatus) => state.costs.filter((c) => c.status === status).length;
  const visible = [...state.costs].reverse().filter((c) => filter === "alles" || c.status === filter);
  const n = (k: number) => `${k} ${k === 1 ? "declaratie" : "declaraties"}`;

  async function act(id: string, change: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await run(change);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setBusy(null);
    }
  }

  function confirmAsk(c: CostEntry) {
    if (!asking) return;
    const value = asking.value.trim();
    if (asking.kind === "afkeuren") {
      if (!value) {
        setError("Geef een reden, dan weet de vrijwilliger waarom.");
        return;
      }
      void act(c.id, () => backend.reviewCost(session, c.id, "afgekeurd", value));
    } else {
      void act(c.id, () => backend.payCost(session, c.id, true, value || todayIso()));
    }
    setAsking(null);
  }

  return (
    <>
      <StatStrip
        items={[
          { label: "Te beoordelen", value: formatEuro(sum("ingediend")), hint: n(count("ingediend")) },
          { label: "Nog uit te betalen", value: formatEuro(sum("goedgekeurd")), hint: `${count("goedgekeurd")} goedgekeurd` },
          { label: "Uitbetaald", value: formatEuro(sum("uitbetaald")), hint: n(count("uitbetaald")) }
        ]}
      />
      <Card>
        <SectionTitle
          title="Declaraties"
          subtitle="Keur goed of af (met reden) en markeer als uitbetaald. Alleen beheer kan de status wijzigen."
          action={
            <Segmented
              label="Filter"
              value={filter}
              onChange={setFilter}
              options={[
                ["ingediend", "Te beoordelen", count("ingediend")],
                ["goedgekeurd", "Uit te betalen", count("goedgekeurd")],
                ["alles", "Alles", state.costs.length]
              ]}
            />
          }
        />
        {error ? (
          <div className="mb-3">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
        <div className="grid">
          {visible.map((c) => (
            <div key={c.id} className="grid gap-2 border-b border-lijn py-3.5 text-sm first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <p>
                  <span className="font-serif text-xl font-bold tabular-nums text-krent">{formatEuro(c.amount)}</span> <b className="text-krent">{c.supplier}</b>{" "}
                  <span className="text-muted">door {c.createdBy || "–"}</span>
                </p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>
                    {c.date}
                    {c.description ? ` · ${c.description}` : ""}
                  </span>
                  {c.iban ? (
                    <CopyButton text={c.iban} label={<span className="font-mono">{c.iban}</span>} done="IBAN gekopieerd" className={textAction} icon={false} />
                  ) : (
                    <span className="text-gouwe-ink">geen IBAN</span>
                  )}
                  {c.photoUrl ? (
                    <a className={textAction} href={c.photoUrl} target="_blank" rel="noreferrer">
                      bon bekijken
                    </a>
                  ) : null}
                </p>
                <StatusLine cost={c} />
                {asking?.id === c.id ? (
                  <div className="mt-3 max-w-md">
                    <ConfirmPanel
                      confirmLabel={asking.kind === "afkeuren" ? "Afkeuren" : "Markeer uitbetaald"}
                      busy={busy === c.id}
                      onCancel={() => setAsking(null)}
                      onConfirm={() => confirmAsk(c)}
                    >
                      <label className="grid gap-1">
                        <span className={fieldLabel}>
                          {asking.kind === "afkeuren" ? `Waarom keur je dit af? ${c.createdBy} ziet de reden.` : `Datum van uitbetaling aan ${c.createdBy}`}
                        </span>
                        <input
                          className={inputClass}
                          type={asking.kind === "afkeuren" ? "text" : "date"}
                          autoFocus
                          value={asking.value}
                          placeholder={asking.kind === "afkeuren" ? "Bijv. bon is onleesbaar" : undefined}
                          onChange={(e) => setAsking({ ...asking, value: e.target.value })}
                        />
                      </label>
                    </ConfirmPanel>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-start justify-start gap-1.5 sm:justify-end">
                {c.status === "ingediend" ? (
                  <>
                    <button type="button" className={primaryButton} disabled={busy !== null} onClick={() => void act(c.id, () => backend.reviewCost(session, c.id, "goedgekeurd", ""))}>
                      Goedkeuren
                    </button>
                    <button type="button" className={secondaryButton} disabled={busy !== null} onClick={() => setAsking({ id: c.id, kind: "afkeuren", value: "" })}>
                      Afkeuren
                    </button>
                  </>
                ) : null}
                {c.status === "goedgekeurd" ? (
                  <>
                    <button type="button" className={primaryButton} disabled={busy !== null} onClick={() => setAsking({ id: c.id, kind: "uitbetalen", value: todayIso() })}>
                      Uitbetaald
                    </button>
                    <button type="button" className={ghostButton} disabled={busy !== null} onClick={() => void act(c.id, () => backend.reviewCost(session, c.id, "ingediend", ""))}>
                      Terug naar beoordelen
                    </button>
                  </>
                ) : null}
                {c.status === "afgekeurd" ? (
                  <button type="button" className={ghostButton} disabled={busy !== null} onClick={() => void act(c.id, () => backend.reviewCost(session, c.id, "ingediend", ""))}>
                    Opnieuw beoordelen
                  </button>
                ) : null}
                {c.status === "uitbetaald" ? (
                  <button type="button" className={ghostButton} disabled={busy !== null} onClick={() => void act(c.id, () => backend.payCost(session, c.id, false, ""))}>
                    Uitbetaling ongedaan maken
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {visible.length === 0 ? <EmptyState title="Niets in deze selectie." text="Alles is beoordeeld en uitbetaald." /> : null}
        </div>
      </Card>
      <MileageCard state={state} />
    </>
  );
}

/** Kilometres per courier from the computed routes, with the allowance when a rate is set in Instellingen. */
function MileageCard({ state }: { state: DashboardState }) {
  const rows = useMemo(() => {
    const byCourier = new Map<string, { km: number; routes: number }>();
    for (const r of Object.values(state.routes)) {
      const row = byCourier.get(r.courier) ?? { km: 0, routes: 0 };
      row.km += r.km;
      row.routes += 1;
      byCourier.set(r.courier, row);
    }
    return Array.from(byCourier.entries())
      .map(([courier, v]) => ({ courier, km: Math.round(v.km * 10) / 10, routes: v.routes }))
      .sort((a, b) => b.km - a.km);
  }, [state.routes]);

  return (
    <Card>
      <SectionTitle
        title="Km-vergoeding"
        subtitle={
          state.kmRate
            ? `Berekende routekilometers per bezorger × ${formatEuro(state.kmRate)} per km.`
            : "Berekende routekilometers per bezorger. Zet km_vergoeding (bijv. 0,23) in het tabblad Instellingen om ook het bedrag te zien."
        }
      />
      {rows.length === 0 ? <p className="text-sm text-muted">Nog geen routes berekend.</p> : null}
      {rows.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-lijn-2 text-left text-[11px] uppercase tracking-[0.12em] text-muted">
              <th className="py-2 pr-3 font-bold">Bezorger</th>
              <th className="py-2 pr-3 text-right font-bold">Routes</th>
              <th className="py-2 pr-3 text-right font-bold">Km</th>
              {state.kmRate ? <th className="py-2 text-right font-bold">Vergoeding</th> : null}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr key={r.courier} className="border-b border-lijn last:border-0">
                <td className="py-2 pr-3 text-krent">{r.courier}</td>
                <td className="py-2 pr-3 text-right">{r.routes}</td>
                <td className="py-2 pr-3 text-right">{formatNumber(r.km)}</td>
                {state.kmRate ? <td className="py-2 text-right">{formatEuro(r.km * state.kmRate)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Card>
  );
}
