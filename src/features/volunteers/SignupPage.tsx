import { useEffect, useState } from "react";
import { backend, type SignupCounts } from "../../data/backend";
import { countFor, labelQuietOptions, optionKey, shortOptions, staffingStatus, suggestOptions, targetFor } from "../../utils/staffing";
import type { RoleAvailability, VolunteerRole } from "../../types/dashboard";
import { VOLUNTEER_ROLES } from "../../types/dashboard";
import { Card, Notice, SectionTitle, inputClass, primaryButton, secondaryButton } from "../../components/ui";
import { CONTACT_EMAIL, OPTION_TIMES, SIGNUP_HINTS, SIGNUP_OPTIONS, applyAgenda } from "../../config";
import { volunteerRoleLabel } from "../../types/dashboard";

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
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [counts, setCounts] = useState<SignupCounts | null>(null);
  const [loaded, setLoaded] = useState(false);
  /** Suggested quiet options shown in the pop-up before sending; null = pop-up closed. */
  const [suggestions, setSuggestions] = useState<Array<{ role: VolunteerRole; option: string }> | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [suggested, setSuggested] = useState(false);

  useEffect(() => {
    // The agenda decides which days and dagdelen can be chosen; until it arrives the defaults show.
    backend
      .getSignupInfo()
      .then((info) => {
        applyAgenda(info.agenda);
        setCounts(info.counts);
      })
      .catch(() => setCounts(null))
      .finally(() => setLoaded(true));
  }, []);
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

  async function send(finalRoles: Record<VolunteerRole, RoleAvailability>) {
    setBusy(true);
    setError(null);
    try {
      await backend.registerVolunteer({ name, address, city, phone, email, roles: finalRoles, cargoBike, remark, consent });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aanmelden mislukt.");
    } finally {
      setBusy(false);
    }
  }

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
    // Once, before sending: suggest quiet days for the chosen tasks that the volunteer did not tick.
    if (counts && !suggested) {
      const ideas = chosen.flatMap((role) => suggestOptions(counts, role, roles[role].days).map((option) => ({ role, option })));
      if (ideas.length > 0) {
        setSuggested(true);
        setPicked([]);
        setSuggestions(ideas.slice(0, 4));
        return;
      }
    }
    await send(roles);
  }

  async function confirmSuggestions() {
    const next = { ...roles };
    for (const s of suggestions ?? []) {
      if (!picked.includes(`${s.role}|${s.option}`)) continue;
      const days = new Set([...next[s.role].days, s.option]);
      next[s.role] = { wants: true, days: SIGNUP_OPTIONS[s.role].filter((d) => days.has(d)) };
    }
    setRoles(next);
    setSuggestions(null);
    await send(next);
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
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Adres</span>
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="Straat en huisnummer" />
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
              {counts && shortOptions(counts, role).length > 0 ? (
                <p className="text-xs font-semibold text-red-800">
                  {labelQuietOptions(counts, role)
                    ? 'Gemarkeerd met "nog nodig": daar hebben we nog weinig aanmeldingen.'
                    : "We hebben op bijna alle momenten nog mensen nodig. Alles wat je kunt is welkom!"}
                </p>
              ) : null}
              {loaded && SIGNUP_OPTIONS[role].length === 0 ? <p className="text-sm text-stone-600">Hiervoor staan nog geen momenten in de agenda.</p> : null}
              <div className="flex flex-wrap gap-2">
                {SIGNUP_OPTIONS[role].map((day) => {
                  const checked = roles[role].days.includes(day);
                  const needed = counts ? labelQuietOptions(counts, role) && staffingStatus(countFor(counts, role, day), targetFor(role, day)) === "weinig" : false;
                  const time = OPTION_TIMES[optionKey(day)];
                  return (
                    <label
                      key={day}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${checked ? "border-coby-500 bg-coby-100 text-coby-900" : "border-stone-200 bg-white text-stone-700"}`}
                    >
                      <input type="checkbox" className="accent-coby-600" checked={checked} onChange={() => toggleDay(role, day)} />
                      {day}
                      {time ? <span className="text-xs text-stone-500">{time}</span> : null}
                      {needed ? <span className="rounded bg-red-100 px-1.5 text-[10px] font-semibold text-red-800">nog nodig</span> : null}
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

      {suggestions ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="suggest-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 id="suggest-title" className="text-lg font-semibold text-stone-900">
              Kun je misschien ook op een van deze momenten?
            </h2>
            <p className="mt-1 text-sm text-stone-600">Hier hebben we nog weinig vrijwilligers. Vink aan wat je erbij kunt doen, of verstuur zoals je het had.</p>
            <div className="mt-3 grid gap-2">
              {suggestions.map((s) => {
                const key = `${s.role}|${s.option}`;
                const n = counts ? countFor(counts, s.role, s.option) : 0;
                return (
                  <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 p-3 text-sm hover:border-coby-300">
                    <input type="checkbox" className="h-4 w-4 accent-coby-600" checked={picked.includes(key)} onChange={() => setPicked((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]))} />
                    <span className="flex-1">
                      <span className="font-semibold text-stone-900">{s.option}</span>
                      <span className="block text-xs text-stone-600">
                        {volunteerRoleLabel[s.role]} · {n === 0 ? "nog niemand" : `pas ${n} ${n === 1 ? "aanmelding" : "aanmeldingen"}`}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className={secondaryButton} disabled={busy} onClick={() => { setSuggestions(null); void send(roles); }}>
                Nee, verstuur zo
              </button>
              <button type="button" className={primaryButton} disabled={busy || picked.length === 0} onClick={() => void confirmSuggestions()}>
                Ja, voeg toe en verstuur
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
