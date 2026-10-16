import { useState } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState, ReceiptFields } from "../../types/dashboard";
import { Card, Notice, SectionTitle, formatEuro, inputClass, primaryButton, secondaryButton, todayIso } from "../../components/ui";

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
}

const emptyDraft = (): Draft => ({ date: todayIso(), amount: "", supplier: "", description: "", photoUrl: "" });

function fromFields(fields: ReceiptFields, photoUrl: string): Draft {
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(fields.date) ? fields.date : todayIso(),
    amount: fields.amount !== null ? fields.amount.toFixed(2).replace(".", ",") : "",
    supplier: fields.supplier,
    description: fields.description,
    photoUrl
  };
}

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
      setMessage(result.warning ? { tone: "warning", text: result.warning } : { tone: "success", text: "Bon uitgelezen. Controleer de gegevens en sla op." });
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
    setBusy("save");
    setMessage(null);
    try {
      await run(() => backend.saveCost(session, { date: draft.date, amount, supplier: draft.supplier, description: draft.description, photoUrl: draft.photoUrl }));
      setDraft(null);
      setPreview(null);
      setMessage({ tone: "success", text: "Opgeslagen in de Sheet. Bedankt!" });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Opslaan mislukt." });
    } finally {
      setBusy(null);
    }
  }

  const total = state.costs.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="grid gap-4">
      <Card>
        <SectionTitle title="Kosten onderweg" subtitle="Maak een foto van je bon. Datum, bedrag, leverancier en omschrijving worden automatisch uitgelezen; jij controleert en slaat op." />
        <div className="flex flex-wrap gap-2">
          <label className={`${primaryButton} cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
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
            <button type="button" className={secondaryButton} onClick={() => setDraft(emptyDraft())}>
              Zonder foto invullen
            </button>
          ) : null}
        </div>
      </Card>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      {draft ? (
        <Card>
          <SectionTitle title="Controleer de gegevens" subtitle={`Wordt opgeslagen op naam van ${session.name}.`} />
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            {preview ? <img src={preview} alt="Foto van de bon" className="max-h-80 w-full rounded-xl border border-stone-200 object-contain" /> : <div className="hidden md:block" />}
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Datum</span>
                <input type="date" className={inputClass} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Bedrag (€)</span>
                <input inputMode="decimal" className={inputClass} placeholder="0,00" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Leverancier</span>
                <input className={inputClass} value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Omschrijving</span>
                <textarea className={`${inputClass} min-h-[70px]`} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryButton} disabled={busy !== null} onClick={() => void save()}>
                  {busy === "save" ? "Opslaan…" : "Opslaan in Sheet"}
                </button>
                <button
                  type="button"
                  className={secondaryButton}
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

      {session.role === "beheer" ? (
        <Card>
          <SectionTitle title="Ingevoerde kosten" subtitle={`${state.costs.length} bonnen · totaal ${formatEuro(total)}`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="py-2 pr-3 font-semibold">Datum</th>
                  <th className="py-2 pr-3 font-semibold">Leverancier</th>
                  <th className="py-2 pr-3 font-semibold">Omschrijving</th>
                  <th className="py-2 pr-3 font-semibold">Door</th>
                  <th className="py-2 pr-3 text-right font-semibold">Bedrag</th>
                  <th className="py-2 font-semibold">Bon</th>
                </tr>
              </thead>
              <tbody>
                {[...state.costs].reverse().map((c) => (
                  <tr key={c.id} className="border-t border-stone-100">
                    <td className="py-2 pr-3">{c.date}</td>
                    <td className="py-2 pr-3">{c.supplier}</td>
                    <td className="py-2 pr-3 text-stone-600">{c.description}</td>
                    <td className="py-2 pr-3 text-stone-600">{c.createdBy}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatEuro(c.amount)}</td>
                    <td className="py-2">
                      {c.photoUrl ? (
                        <a className="text-coby-700 underline" href={c.photoUrl} target="_blank" rel="noreferrer">
                          foto
                        </a>
                      ) : (
                        "–"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {state.costs.length === 0 ? <p className="py-3 text-sm text-stone-600">Nog geen kosten ingevoerd.</p> : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
