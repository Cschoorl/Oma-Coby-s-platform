import { useEffect, useState } from "react";
import { backend, type SignupCounts } from "../../data/backend";
import { countFor, labelQuietOptions, optionKey, shortOptions, staffingStatus, suggestOptions, targetFor } from "../../utils/staffing";
import type { RoleAvailability, VolunteerRole } from "../../types/dashboard";
import { VOLUNTEER_ROLES } from "../../types/dashboard";
import { Card, Notice, SectionTitle, Sticker, fieldLabel, ghostButton, inputClass, primaryButton, rollOliebol, textAction } from "../../components/ui";
import omaUrl from "../../assets/oma-coby.jpg";
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
      rollOliebol();
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
      <section className="grid overflow-hidden rounded-kaart bg-papier shadow-zacht sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        {/* Portrait card: the photo of Oma Coby is 4:5, so the card follows it instead of cropping her to a strip. */}
        <div className="relative">
          <img src={omaUrl} alt="Oma Coby met een bord oliebollen" className="aspect-[4/5] h-full w-full object-cover object-top" />
          <Sticker slap className="absolute bottom-4 right-4">Bedankt!</Sticker>
        </div>
        <div className="grid content-center gap-2 p-5 sm:p-7">
          <h1 className="font-display text-4xl uppercase leading-none tracking-wide text-krent">Bedankt, {name.split(" ")[0]}!</h1>
          <p className="text-krent">Je bent nu officieel Oma's hulpje. We delen je in waar we je het hardst nodig hebben en sturen je een berichtje.</p>
          <p className="text-sm text-muted">
            Vragen of iets wijzigen? Mail naar{" "}
            <a className={textAction} href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <p className="text-xs text-muted">Met 10 oliebollen laat je 1 oudje rock en rollen.</p>
        </div>
      </section>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-1">
        <p className={fieldLabel}>Vrijwilligers gezocht</p>
        <h1 className="font-display text-[44px] uppercase leading-none tracking-wide text-krent">
          Help je <span className="text-feest">mee</span>?
        </h1>
        <p className="text-oliebol">Inpakken, bezorgen of achter de bar: kies wat je wilt doen en wanneer je kunt.</p>
      </div>
      <Card>
        <SectionTitle title="Over jou" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className={fieldLabel}>Naam + achternaam *</span>
            <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className={fieldLabel}>Adres</span>
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="Straat en huisnummer" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className={fieldLabel}>Woonplaats</span>
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className={fieldLabel}>Telefoonnummer</span>
            <input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className={fieldLabel}>E-mailadres</span>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">Vul minimaal een telefoonnummer of e-mailadres in.</p>
      </Card>

      {VOLUNTEER_ROLES.map((role) => (
        <Card key={role}>
          <fieldset>
            <legend className="font-serif text-lg font-bold text-krent">{questions[role].ask}</legend>
            <div className="mt-2 inline-flex gap-0.5 rounded-lg bg-vul p-[3px]">
              {[true, false].map((value) => (
                <label
                  key={String(value)}
                  className={`flex min-h-[36px] cursor-pointer items-center rounded-md px-5 py-1.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-krent ${
                    roles[role].wants === value ? "bg-krent font-bold text-meel" : "text-krent hover:bg-vul"
                  }`}
                >
                  <input type="radio" name={role} className="sr-only" checked={roles[role].wants === value} onChange={() => setRole(role, { wants: value, days: value ? roles[role].days : [] })} />
                  {value ? "Ja" : "Nee"}
                </label>
              ))}
            </div>
          </fieldset>

          {roles[role].wants ? (
            <div className="mt-3 grid gap-2">
              {role === "fietskoerier" ? (
                <label className="flex items-center gap-2 text-sm text-krent">
                  <input type="checkbox" className="accent-[#69873c]" checked={cargoBike} onChange={(e) => setCargoBike(e.target.checked)} />
                  Ik kan een bakfiets lenen van iemand
                </label>
              ) : null}
              <p className="text-sm font-bold text-krent">{questions[role].days}</p>
              <p className="text-xs text-muted">{SIGNUP_HINTS[role]}</p>
              {counts && shortOptions(counts, role).length > 0 ? (
                <p className="text-xs font-bold text-feest-ink">
                  {labelQuietOptions(counts, role)
                    ? 'Gemarkeerd met "nog nodig": daar hebben we nog weinig aanmeldingen.'
                    : "We hebben op bijna alle momenten nog mensen nodig. Alles wat je kunt is welkom!"}
                </p>
              ) : null}
              {loaded && SIGNUP_OPTIONS[role].length === 0 ? <p className="text-sm text-muted">Hiervoor staan nog geen momenten in de agenda.</p> : null}
              <div className="flex flex-wrap gap-1.5">
                {SIGNUP_OPTIONS[role].map((day) => {
                  const checked = roles[role].days.includes(day);
                  const needed = counts ? labelQuietOptions(counts, role) && staffingStatus(countFor(counts, role, day), targetFor(role, day)) === "weinig" : false;
                  const time = OPTION_TIMES[optionKey(day)];
                  return (
                    <label
                      key={day}
                      className={`flex min-h-[38px] cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${checked ? "bg-kerst-50 font-bold text-kerst-ink" : "bg-vul text-krent hover:bg-vul-2"}`}
                    >
                      <input type="checkbox" className="accent-[#69873c]" checked={checked} onChange={() => toggleDay(role, day)} />
                      {day}
                      {time ? <span className="text-xs font-normal text-muted">{time}</span> : null}
                      {needed ? <span className="rounded bg-feest-50 px-1.5 text-[10px] font-bold text-feest-ink">nog nodig</span> : null}
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
          <span className={fieldLabel}>Wil je nog iets kwijt? Opmerkingen, vragen, ideeën, suggesties?</span>
          <textarea className={`${inputClass} min-h-[70px]`} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </label>
        <label className="mt-3 flex items-start gap-2 text-sm text-krent">
          <input type="checkbox" className="mt-1 accent-[#69873c]" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-krent/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="suggest-title">
          <div className="w-full max-w-md rounded-kaart bg-papier p-5 shadow-zwevend">
            <h2 id="suggest-title" className="font-serif text-xl font-bold text-krent">
              Kun je misschien ook op een van deze momenten?
            </h2>
            <p className="mt-1 text-sm text-muted">Hier hebben we nog weinig vrijwilligers. Vink aan wat je erbij kunt doen, of verstuur zoals je het had.</p>
            <div className="mt-3 grid gap-1">
              {suggestions.map((s) => {
                const key = `${s.role}|${s.option}`;
                const n = counts ? countFor(counts, s.role, s.option) : 0;
                return (
                  <label key={key} className="flex cursor-pointer items-center gap-3 rounded-md p-3 text-sm hover:bg-vul">
                    <input type="checkbox" className="h-4 w-4 accent-[#69873c]" checked={picked.includes(key)} onChange={() => setPicked((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]))} />
                    <span className="flex-1">
                      <span className="font-bold text-krent">{s.option}</span>
                      <span className="block text-xs text-muted">
                        {volunteerRoleLabel[s.role]} · {n === 0 ? "nog niemand" : `pas ${n} ${n === 1 ? "aanmelding" : "aanmeldingen"}`}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className={ghostButton} disabled={busy} onClick={() => { setSuggestions(null); void send(roles); }}>
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
