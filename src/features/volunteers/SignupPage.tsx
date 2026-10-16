import { useState } from "react";
import { backend } from "../../data/backend";
import type { RoleAvailability, VolunteerRole } from "../../types/dashboard";
import { VOLUNTEER_ROLES } from "../../types/dashboard";
import { Card, Notice, SectionTitle, inputClass, primaryButton } from "../../components/ui";
import { CONTACT_EMAIL, SIGNUP_HINTS, SIGNUP_OPTIONS } from "../../config";

const questions: Record<VolunteerRole, { ask: string; days: string }> = {
  inpakken: { ask: "Wil je helpen inpakken?", days: "Op welke dag(en) wil je helpen inpakken?" },
  fietskoerier: { ask: "Wil je helpen als fietskoerier?", days: "Op welke dag(en) kan je helpen als fietskoerier?" },
  autokoerier: { ask: "Wil je helpen als autokoerier?", days: "Op welke dag(en) wil je helpen als autokoerier?" },
  oliebollenbar: { ask: "Wil je helpen in de Oliebollenbar?", days: "Op welke dag(en) wil je helpen in de Oliebollenbar?" }
};

const emptyRoles = (): Record<VolunteerRole, RoleAvailability> => ({
  inpakken: { wants: false, days: [] },
  fietskoerier: { wants: false, days: [] },
  autokoerier: { wants: false, days: [] },
  oliebollenbar: { wants: false, days: [] }
});

/** Standalone signup page (no login). Same questions as the Google Form, saved to the same tab. */
export function SignupPage() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState(emptyRoles);
  const [cargoBike, setCargoBike] = useState(false);
  const [remark, setRemark] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setRole = (role: VolunteerRole, next: Partial<RoleAvailability>) => setRoles((r) => ({ ...r, [role]: { ...r[role], ...next } }));
  const toggleDay = (role: VolunteerRole, day: string) => {
    const days = roles[role].days;
    // Keep the form order, so the sheet reads the same as a Google Form answer.
    const next = days.includes(day) ? days.filter((d) => d !== day) : SIGNUP_OPTIONS[role].filter((d) => d === day || days.includes(d));
    setRole(role, { days: next });
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const chosen = VOLUNTEER_ROLES.filter((r) => roles[r].wants);
    if (chosen.length === 0) {
      setError("Kies minstens één taak waarmee je wilt helpen.");
      return;
    }
    const missing = chosen.find((r) => roles[r].days.length === 0);
    if (missing) {
      setError(`Kies bij "${questions[missing].ask}" minstens één dag.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await backend.registerVolunteer({ name, city, phone, email, roles, cargoBike, remark, consent });
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
        <SectionTitle title={`Bedankt, ${name.split(" ")[0]}!`} subtitle="Je aanmelding is binnen. We delen je in waar we je het hardst nodig hebben en nemen contact met je op." />
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
        <SectionTitle title="Aanmelden als vrijwilliger" subtitle="Help mee met inpakken, bezorgen of in de Oliebollenbar. Kies wat je wilt doen en wanneer je kunt." />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Naam + achternaam *</span>
            <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Woonplaats</span>
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Telefoonnummer</span>
            <input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">E-mailadres</span>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
        </div>
        <p className="mt-2 text-xs text-stone-500">Vul minimaal een telefoonnummer of e-mailadres in.</p>
      </Card>

      {VOLUNTEER_ROLES.map((role) => (
        <Card key={role}>
          <fieldset>
            <legend className="text-base font-semibold text-stone-900">{questions[role].ask}</legend>
            <div className="mt-2 flex gap-2">
              {[true, false].map((value) => (
                <label
                  key={String(value)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-1.5 text-sm ${
                    roles[role].wants === value ? "border-coby-500 bg-coby-100 text-coby-900" : "border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  <input type="radio" name={role} className="accent-coby-600" checked={roles[role].wants === value} onChange={() => setRole(role, { wants: value, days: value ? roles[role].days : [] })} />
                  {value ? "Ja" : "Nee"}
                </label>
              ))}
            </div>
          </fieldset>

          {roles[role].wants ? (
            <div className="mt-3 grid gap-2">
              {role === "fietskoerier" ? (
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input type="checkbox" className="accent-coby-600" checked={cargoBike} onChange={(e) => setCargoBike(e.target.checked)} />
                  Ik kan een bakfiets lenen van iemand
                </label>
              ) : null}
              <p className="text-sm font-semibold text-stone-800">{questions[role].days}</p>
              <p className="text-xs text-stone-600">{SIGNUP_HINTS[role]}</p>
              <div className="flex flex-wrap gap-2">
                {SIGNUP_OPTIONS[role].map((day) => {
                  const checked = roles[role].days.includes(day);
                  return (
                    <label
                      key={day}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${checked ? "border-coby-500 bg-coby-100 text-coby-900" : "border-stone-200 bg-white text-stone-700"}`}
                    >
                      <input type="checkbox" className="accent-coby-600" checked={checked} onChange={() => toggleDay(role, day)} />
                      {day}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </Card>
      ))}

      <Card>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Wil je nog iets kwijt? Opmerkingen, vragen, ideeën, suggesties?</span>
          <textarea className={`${inputClass} min-h-[70px]`} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </label>
        <label className="mt-3 flex items-start gap-2 text-sm text-stone-700">
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
