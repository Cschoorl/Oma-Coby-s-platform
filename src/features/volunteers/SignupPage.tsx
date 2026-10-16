import { useState } from "react";
import { backend } from "../../data/backend";
import type { Transport } from "../../types/dashboard";
import { Card, Notice, SectionTitle, inputClass, primaryButton } from "../../components/ui";
import { CONTACT_EMAIL, SIGNUP_DAYS, SIGNUP_PARTS } from "../../config";

/** Standalone page (no login) where volunteers sign up. */
export function SignupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [transport, setTransport] = useState<Transport[]>([]);
  const [remark, setRemark] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (availability.length === 0) {
      setError("Kies minstens één dagdeel waarop je kunt helpen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await backend.registerVolunteer({ name, phone, email, availability, transport, remark, consent });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aanmelden mislukt.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card>
        <SectionTitle title={`Bedankt, ${name.split(" ")[0]}!`} subtitle="Je aanmelding is binnen. We nemen contact met je op over de planning." />
        <p className="text-sm text-stone-700">
          Vragen of iets wijzigen? Mail naar{" "}
          <a className="font-semibold text-coby-700 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Card>
        <SectionTitle title="Aanmelden als vrijwilliger" subtitle="Help mee met bakken, inpakken of bezorgen. Vul je gegevens in en kies wanneer je kunt." />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Naam *</span>
            <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Telefoon (WhatsApp)</span>
            <input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">E-mail</span>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
        </div>
        <p className="mt-2 text-xs text-stone-500">Vul minimaal een telefoonnummer of e-mailadres in.</p>
      </Card>

      <Card>
        <SectionTitle title="Beschikbaarheid *" subtitle="Vink alle dagdelen aan waarop je kunt." />
        <div className="grid gap-2">
          {SIGNUP_DAYS.map((day) => (
            <div key={day} className="flex flex-wrap items-center gap-2">
              <span className="w-32 text-sm font-semibold text-stone-800">{day}</span>
              {SIGNUP_PARTS.map((part) => {
                const value = `${day} ${part}`;
                const checked = availability.includes(value);
                return (
                  <label
                    key={part}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${checked ? "border-coby-500 bg-coby-100 text-coby-900" : "border-stone-200 bg-white text-stone-700"}`}
                  >
                    <input type="checkbox" className="accent-coby-600" checked={checked} onChange={() => setAvailability((list) => toggle(list, value))} />
                    {part}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Vervoer" subtitle="Kun je bezorgen? Kies waarmee." />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["fiets", "Ik kan bezorgen op de fiets"],
              ["auto", "Ik kan bezorgen met de auto"]
            ] as Array<[Transport, string]>
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${transport.includes(value) ? "border-coby-500 bg-coby-100 text-coby-900" : "border-stone-200 bg-white text-stone-700"}`}
            >
              <input type="checkbox" className="accent-coby-600" checked={transport.includes(value)} onChange={() => setTransport((list) => toggle(list, value))} />
              {label}
            </label>
          ))}
        </div>
        <label className="mt-3 grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Opmerking</span>
          <textarea className={`${inputClass} min-h-[70px]`} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Bijv. liefst inpakken, of alleen tot 14:00" />
        </label>
      </Card>

      <Card>
        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input type="checkbox" className="mt-1 accent-coby-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          Ik geef toestemming om mijn gegevens te bewaren voor de planning van deze oliebollenactie. Na de actie worden ze verwijderd.
        </label>
        {error ? (
          <div className="mt-3">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
        <button type="submit" className={`${primaryButton} mt-3`} disabled={busy}>
          {busy ? "Versturen…" : "Aanmelden"}
        </button>
      </Card>
    </form>
  );
}
