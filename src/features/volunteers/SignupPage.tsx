import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { backend, type SignupCounts } from "../../data/backend";
import { countFor, dayKey, labelQuietOptions, staffingStatus, suggestOptions, targetFor } from "../../utils/staffing";
import type { MaxShifts, ReminderChannel, VolunteerRole } from "../../types/dashboard";
import { VOLUNTEER_ROLES, maxShiftsLabel, volunteerRoleLabel } from "../../types/dashboard";
import { Card, Notice, OliebolLoader, Sticker, fieldLabel, ghostButton, inputClass, primaryButton, rollOliebol, textAction } from "../../components/ui";
import omaUrl from "../../assets/oma-coby.jpg";
import { CONTACT_EMAIL, OPTION_TIMES, SIGNUP_OPTIONS, applyAgenda } from "../../config";
import { emptyAnswers, labelQuietDays, neediestFor, optionPart, optionsFor, partsOn, quietDays, rolesOnDays, seasonDays, toRoles, type Answers, type Part } from "./signupFlow";

/*
 * The signup as a short conversation: Oma asks one question at a time, answers are buttons,
 * and earlier answers stay visible above like a chat, each with "Wijzig".
 * Three ways in: a task in mind, a day in mind, or "put me where you are needed".
 */

type StepId = "mode" | "roles" | `picks-${VolunteerRole}` | "suggest" | "days" | "parts" | "dayroles" | "flexible" | "max" | "reminder" | "contact" | "check";

const roleBlurb: Record<VolunteerRole, string> = {
  inpakken: "Oliebollen in zakken en dozen, vanaf 07:30 in Aalsmeer.",
  fietskoerier: "Bestellingen rondbrengen in Amsterdam, hooguit 3 uurtjes.",
  autokoerier: "Rondbrengen met je eigen of een geleende auto.",
  oliebollenbar: "Achter de bar bij een evenement."
};

const partLabel: Record<Part, string> = { ochtend: "Ochtend", middag: "Middag", avond: "Avond" };

/** "Dinsdag 15 december" → "di 15 dec". */
function shortDay(label: string): string {
  const [weekday, day, month] = label.split(" ");
  return `${weekday.slice(0, 2).toLowerCase()} ${day} ${month.slice(0, 3)}`;
}

function shortOption(option: string): string {
  const part = optionPart(option);
  const location = option.match(/\(([^)]+)\)/)?.[1];
  return [shortDay(option.split(/[:(]/)[0].trim()), part, location].filter(Boolean).join(" ");
}

function listOrCount(items: string[], noun: [string, string]): string {
  if (items.length <= 3) return items.join(", ");
  return `${items.length} ${noun[1]}`;
}

type Suggestion = { role: VolunteerRole; option: string };

function stepIds(a: Answers, suggestions: Suggestion[]): StepId[] {
  const ids: StepId[] = ["mode"];
  if (!a.mode) return ids;
  if (a.mode === "taak") {
    ids.push("roles", ...VOLUNTEER_ROLES.filter((r) => a.roles.includes(r)).map((r) => `picks-${r}` as StepId));
    if (suggestions.length > 0) ids.push("suggest");
  } else {
    ids.push("days");
    // Only a question when there is something to choose: one dagdeel (or none) needs no answer.
    if (partsOn(a.days).length > 1) ids.push("parts");
    ids.push("dayroles");
  }
  // "Maakt niet uit" already says: put me where you need me.
  if (a.mode !== "flexibel") ids.push("flexible");
  ids.push("max", "reminder", "contact", "check");
  return ids;
}

/** Standalone signup page (no login). Saved to the same tab as the Google Form, plus the planning columns. */
export function SignupPage() {
  const [counts, setCounts] = useState<SignupCounts | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [a, setA] = useState<Answers>(emptyAnswers);
  /** Quiet moments the volunteer added when we asked, as "role|option". */
  const [extra, setExtra] = useState<string[]>([]);
  const [at, setAt] = useState<StepId>("mode");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [remark, setRemark] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);

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

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!counts || a.mode !== "taak") return [];
    return a.roles.flatMap((role) => suggestOptions(counts, role, a.picks[role]).map((option) => ({ role, option }))).slice(0, 4);
  }, [counts, a.mode, a.roles, a.picks]);

  const ids = stepIds(a, suggestions);
  const index = Math.max(0, ids.indexOf(at));
  const current = ids[index];

  // Move focus to each new question, so keyboard and screen reader users follow the conversation.
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    questionRef.current?.focus({ preventScroll: true });
    questionRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [current]);

  const update = (next: Partial<Answers>) => setA((prev) => ({ ...prev, ...next }));

  /** Next step, worked out from the answers as they will be after this change. */
  function advance(next: Partial<Answers> = {}) {
    const after = { ...a, ...next };
    // "Maakt niet uit": open to every task on their days, unless they untick one.
    if (after.mode === "flexibel" && after.roles.length === 0 && after.days.length > 0) after.roles = rolesOnDays(after.days);
    setA(after);
    setError(null);
    const list = stepIds(after, suggestions);
    setAt(list[Math.min(list.indexOf(current) + 1, list.length - 1)]);
  }

  function back() {
    setError(null);
    if (index > 0) setAt(ids[index - 1]);
  }

  const roles = useMemo(() => {
    const base = toRoles(a);
    for (const key of extra) {
      const [role, option] = key.split("|") as [VolunteerRole, string];
      const days = new Set([...base[role].days, option]);
      base[role] = { wants: true, days: SIGNUP_OPTIONS[role].filter((o) => days.has(o)) };
    }
    return base;
  }, [a, extra]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!a.mode || (a.flexible === null && a.mode !== "flexibel") || !a.maxShifts || !a.reminder) return;
    setBusy(true);
    setError(null);
    try {
      await backend.registerVolunteer({
        name,
        address,
        city,
        phone,
        email,
        roles,
        cargoBike: a.cargoBike,
        remark,
        consent,
        planning: { mode: a.mode, flexible: a.mode === "flexibel" || a.flexible === true, maxShifts: a.maxShifts, reminder: a.reminder }
      });
      setDone(true);
      rollOliebol();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aanmelden mislukt.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const firstName = name.trim().split(" ")[0];
    return (
      <section className="grid overflow-hidden rounded-kaart bg-papier shadow-zacht sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        {/* Portrait card: the photo of Oma Coby is 4:5, so the card follows it instead of cropping her to a strip. */}
        <div className="relative">
          <img src={omaUrl} alt="Oma Coby met een bord oliebollen" className="aspect-[4/5] h-full w-full object-cover object-top" />
          <Sticker slap className="absolute bottom-4 right-4">Bedankt!</Sticker>
        </div>
        <div className="grid content-center gap-2 p-5 sm:p-7">
          <h1 className="font-display text-4xl uppercase leading-none tracking-wide text-krent">Bedankt, {firstName}!</h1>
          <p className="text-krent">Je bent nu officieel Oma's hulpje. We maken het rooster zodra we weten hoeveel bestellingen er zijn, en laten je weten waar en wanneer we je verwachten.</p>
          {a.reminder && a.reminder !== "geen" ? (
            <p className="text-sm text-krent">Een dag van tevoren krijg je nog een herinnering via {a.reminder === "whatsapp" ? "WhatsApp" : "mail"}.</p>
          ) : null}
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

  const days = seasonDays();
  const dayLabel = (key: string) => shortDay(days.find((d) => d.key === key)?.label ?? key);

  /** What Oma asks, and how the answer reads back in the conversation. */
  const step: Record<StepId, { ask: string; hint?: string; answer: () => string }> = {
    mode: {
      ask: "Fijn dat je wilt helpen! Heb je al iets in gedachten?",
      answer: () => (a.mode === "taak" ? "Ik weet al wat ik wil doen" : a.mode === "dag" ? "Ik weet al wanneer ik kan" : "Maakt niet uit, zet me in waar het nodig is")
    },
    roles: { ask: "Wat zou je het liefst doen?", hint: "Meer dan één mag.", answer: () => a.roles.map((r) => volunteerRoleLabel[r]).join(", ") },
    ...(Object.fromEntries(
      VOLUNTEER_ROLES.map((r) => [
        `picks-${r}`,
        {
          ask: `Wanneer kun je ${r === "inpakken" ? "inpakken" : r === "oliebollenbar" ? "in de Oliebollenbar staan" : `als ${volunteerRoleLabel[r].toLowerCase()} rijden`}?`,
          hint: "Kies alles wat kan. Wij delen je in waar we je het hardst nodig hebben.",
          answer: () => listOrCount(a.picks[r].map(shortOption), ["moment", "momenten"])
        }
      ])
    ) as Record<`picks-${VolunteerRole}`, { ask: string; hint: string; answer: () => string }>),
    suggest: {
      ask: "Op deze momenten zitten we nog krap. Kun je er misschien ook een?",
      hint: "Helemaal goed als het niet uitkomt.",
      answer: () => (extra.length ? `Ja: ${extra.map((k) => shortOption(k.split("|")[1])).join(", ")}` : "Nee, zo is het goed")
    },
    days: {
      ask: a.mode === "dag" ? "Op welke dag of dagen kun je?" : "Welke dagen ben je beschikbaar?",
      hint: a.mode === "flexibel" ? "Kies alles wat kan. Hoe meer dagen, hoe makkelijker we je ergens kwijt kunnen." : "Meer dan één mag.",
      answer: () => listOrCount(a.days.map(dayLabel), ["dag", "dagen"])
    },
    parts: {
      ask: "Hoe laat kun je dan?",
      hint: "Inpakken en de bar zijn hele dagen; dit geldt voor het bezorgen.",
      answer: () => (a.parts.length === 0 || a.parts.length === partsOn(a.days).length ? "Hele dag" : a.parts.map((p) => partLabel[p]).join(" en "))
    },
    dayroles:
      a.mode === "dag"
        ? { ask: "En wat wil je die dag doen?", hint: "Meer dan één mag.", answer: () => (a.roles.length === rolesOnDays(a.days).length ? "Maakt niet uit" : a.roles.map((r) => volunteerRoleLabel[r]).join(", ")) }
        : { ask: "Is er iets wat je níet kunt of wilt?", hint: "Vink uit wat niet past. Geen auto? Dan haal je autokoerier weg.", answer: () => a.roles.map((r) => volunteerRoleLabel[r]).join(", ") },
    flexible: {
      ask: "Mogen we je ook ergens anders indelen als het daar drukker is?",
      answer: () => (a.flexible ? "Ja, zet me in waar het nodig is" : "Liever alleen wat ik koos")
    },
    max: { ask: "Hoe vaak wil je maximaal helpen dit seizoen?", answer: () => (a.maxShifts ? maxShiftsLabel[a.maxShifts] : "") },
    reminder: {
      ask: "Zullen we je een dag van tevoren een herinnering sturen?",
      answer: () => (a.reminder === "whatsapp" ? "Ja, via WhatsApp" : a.reminder === "mail" ? "Ja, via mail" : "Nee, hoeft niet")
    },
    contact: { ask: "Bijna klaar! Hoe heet je en hoe kunnen we je bereiken?", answer: () => name.trim() },
    check: { ask: "Klopt dit zo?", answer: () => "" }
  };

  const contactProblem = !name.trim()
    ? "Vul je naam in."
    : a.reminder === "whatsapp" && !phone.trim()
      ? "Vul je telefoonnummer in voor de herinnering via WhatsApp."
      : a.reminder === "mail" && !email.trim()
        ? "Vul je e-mailadres in voor de herinnering via mail."
        : !phone.trim() && !email.trim()
          ? "Vul een telefoonnummer of e-mailadres in."
          : null;

  const quietDayMarks = counts && labelQuietDays(counts) ? quietDays(counts) : [];

  function body(id: StepId): { content: ReactNode; next?: { ready: boolean; label?: string } } {
    switch (id) {
      case "mode":
        return {
          content: (
            <Choices
              value={a.mode}
              onPick={(mode) => advance({ mode, flexible: mode === "flexibel" ? true : a.flexible })}
              options={[
                ["taak", "Ik weet al wat ik wil doen", "Inpakken, bezorgen of achter de bar."],
                ["dag", "Ik weet al wanneer ik kan", "Je kiest een dag, wij laten zien wat er die dag te doen is."],
                ["flexibel", "Maakt niet uit, zet me in waar het nodig is", "Je geeft je beschikbaarheid, wij kijken waar we je het hardst nodig hebben."]
              ]}
            />
          )
        };
      case "roles":
        return {
          content: <RolePicker roles={VOLUNTEER_ROLES} value={a.roles} onChange={(change) => setA((prev) => ({ ...prev, roles: change(prev.roles) }))} />,
          next: { ready: a.roles.length > 0 }
        };
      case "suggest":
        return {
          content: (
            <div className="grid gap-1.5">
              {suggestions.map((s) => {
                const key = `${s.role}|${s.option}`;
                const n = counts ? countFor(counts, s.role, s.option) : 0;
                const on = extra.includes(key);
                return (
                  <Toggle key={key} on={on} onClick={() => setExtra((x) => (on ? x.filter((k) => k !== key) : [...x, key]))}>
                    <span className="font-bold">{shortOption(s.option)}</span>
                    <span className={`block text-xs ${on ? "text-meel/80" : "text-muted"}`}>
                      {volunteerRoleLabel[s.role]} · {n === 0 ? "nog niemand" : `pas ${n} ${n === 1 ? "aanmelding" : "aanmeldingen"}`}
                    </span>
                  </Toggle>
                );
              })}
            </div>
          ),
          next: { ready: true, label: extra.length ? "Voeg toe" : "Nee, zo is het goed" }
        };
      case "days":
        return {
          content: (
            <div className="grid gap-2">
              <ChipGrid
                items={days.map((d) => ({ key: d.key, label: shortDay(d.label), mark: quietDayMarks.includes(d.key) }))}
                value={a.days}
                onChange={(change) =>
                  setA((prev) => {
                    const next = change(prev.days);
                    return { ...prev, days: days.map((d) => d.key).filter((k) => next.includes(k)), roles: prev.mode === "flexibel" ? [] : prev.roles };
                  })
                }
              />
              {quietDayMarks.length > 0 ? <MarkLegend /> : null}
            </div>
          ),
          next: { ready: a.days.length > 0 }
        };
      case "parts": {
        const options = partsOn(a.days);
        return {
          content: (
            <ChipGrid
              items={options.map((p) => ({ key: p, label: partLabel[p], sub: p === "ochtend" ? "vanaf 9:00" : p === "middag" ? "vanaf 12:00" : undefined }))}
              value={a.parts}
              onChange={(change) =>
                setA((prev) => {
                  const next = change(prev.parts);
                  return { ...prev, parts: options.filter((p) => next.includes(p)) };
                })
              }
              columns="grid-cols-2 sm:grid-cols-3"
            />
          ),
          next: { ready: a.parts.length > 0 }
        };
      }
      case "dayroles": {
        const available = rolesOnDays(a.days);
        return {
          content: (
            <div className="grid gap-2">
              <RolePicker roles={available} value={a.roles} onChange={(change) => setA((prev) => ({ ...prev, roles: change(prev.roles) }))} cargoBike={a.cargoBike} onCargoBike={(v) => update({ cargoBike: v })} />
              {a.mode === "dag" && a.roles.length < available.length ? (
                <button type="button" className={`${textAction} justify-self-start text-sm`} onClick={() => advance({ roles: available })}>
                  Maakt niet uit, alles is goed
                </button>
              ) : null}
            </div>
          ),
          next: { ready: a.roles.length > 0 && a.roles.some((r) => optionsFor(r, a.days, a.parts).length > 0) }
        };
      }
      case "flexible":
        return {
          content: (
            <Choices
              value={a.flexible === null ? null : a.flexible ? "ja" : "nee"}
              onPick={(v) => advance({ flexible: v === "ja" })}
              options={[
                ["ja", "Ja, zet me in waar het nodig is", "Dan kunnen we het rooster het best rond krijgen."],
                ["nee", "Liever alleen wat ik koos", "Ook goed! Dan houden we ons daaraan."]
              ]}
            />
          )
        };
      case "max":
        return {
          content: (
            <Choices<MaxShifts>
              value={a.maxShifts}
              onPick={(maxShifts) => advance({ maxShifts })}
              options={[
                ["1", "1 keer", "Eén dag of dagdeel."],
                ["2-3", "2 à 3 keer", ""],
                ["vaker", "Zo vaak als nodig", "Je kunt altijd nog nee zeggen."]
              ]}
            />
          )
        };
      case "reminder":
        return {
          content: (
            <Choices<ReminderChannel>
              value={a.reminder}
              onPick={(reminder) => advance({ reminder })}
              options={[
                ["whatsapp", "Ja, via WhatsApp", "24 uur van tevoren: waar, hoe laat en met wie."],
                ["mail", "Ja, via mail", "24 uur van tevoren: waar, hoe laat en met wie."],
                ["geen", "Nee, hoeft niet", "Je rooster krijg je sowieso."]
              ]}
            />
          )
        };
      default:
        if (id.startsWith("picks-")) {
          const role = id.slice(6) as VolunteerRole;
          return {
            content: (
              <div className="grid gap-2">
                {role === "fietskoerier" ? <CargoBike value={a.cargoBike} onChange={(v) => update({ cargoBike: v })} /> : null}
                {loaded && SIGNUP_OPTIONS[role].length === 0 ? <p className="text-sm text-muted">Hiervoor staan nog geen momenten in de agenda.</p> : null}
                <OptionGrid role={role} counts={counts} value={a.picks[role]} onChange={(change) => setA((prev) => ({ ...prev, picks: { ...prev.picks, [role]: change(prev.picks[role]) } }))} />
              </div>
            ),
            next: { ready: a.picks[role].length > 0 }
          };
        }
        return { content: null };
    }
  }

  const contactStep = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Naam + achternaam *" value={name} onChange={setName} autoComplete="name" />
      <Field label={`Telefoonnummer${a.reminder === "whatsapp" ? " *" : ""}`} value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
      <Field label={`E-mailadres${a.reminder === "mail" ? " *" : ""}`} value={email} onChange={setEmail} type="email" autoComplete="email" />
      <Field label="Woonplaats" value={city} onChange={setCity} autoComplete="address-level2" />
      {roles.fietskoerier.wants || roles.autokoerier.wants ? (
        <div className="sm:col-span-2">
          <Field label="Adres" value={address} onChange={setAddress} autoComplete="street-address" placeholder="Straat en huisnummer" />
          <p className="mt-1 text-xs text-muted">Handig voor bezorgers: dan plannen we een route bij jou in de buurt.</p>
        </div>
      ) : null}
    </div>
  );

  const neediest = counts && a.mode === "flexibel" ? neediestFor(counts, a) : [];
  const checkStep = (
    <div className="grid gap-3">
      <dl className="grid gap-1.5 text-sm">
        {VOLUNTEER_ROLES.filter((r) => roles[r].wants).map((r) => (
          <div key={r} className="grid gap-0.5 sm:grid-cols-[130px_minmax(0,1fr)]">
            <dt className="font-bold text-krent">{volunteerRoleLabel[r]}</dt>
            <dd className="text-krent">{roles[r].days.map(shortOption).join(", ")}</dd>
          </div>
        ))}
        <div className="grid gap-0.5 sm:grid-cols-[130px_minmax(0,1fr)]">
          <dt className="font-bold text-krent">Planning</dt>
          <dd className="text-krent">
            {a.mode === "flexibel" || a.flexible ? "Mag ingedeeld worden waar het nodig is" : "Alleen wat ik koos"} · maximaal {a.maxShifts ? maxShiftsLabel[a.maxShifts].toLowerCase() : "–"}
          </dd>
        </div>
      </dl>
      {neediest.length > 0 ? (
        <p className="text-sm text-muted">
          Hier hebben we je nu het hardst nodig: <span className="text-krent">{neediest.map((n) => `${shortOption(n.option)} (${volunteerRoleLabel[n.role].toLowerCase()})`).join(", ")}</span>.
        </p>
      ) : null}
      <label className="grid gap-1 text-sm">
        <span className={fieldLabel}>Wil je nog iets kwijt?</span>
        <textarea className={`${inputClass} min-h-[70px]`} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Vragen, ideeën, of met wie je graag samen wilt" />
      </label>
      <label className="flex items-start gap-2 text-sm text-krent">
        <input type="checkbox" className="mt-1 accent-[#69873c]" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        Ik geef toestemming om mijn gegevens te bewaren voor de planning van deze oliebollenactie. Na de actie worden ze verwijderd.
      </label>
    </div>
  );

  const view: { content: ReactNode; next?: { ready: boolean; label?: string } } =
    current === "contact"
      ? { content: contactStep, next: { ready: !contactProblem } }
      : current === "check"
        ? { content: checkStep, next: undefined }
        : body(current);

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-1">
        <p className={fieldLabel}>Vrijwilligers gezocht</p>
        <h1 className="font-display text-[44px] uppercase leading-none tracking-wide text-krent">
          Help je <span className="text-feest">mee</span>?
        </h1>
        <p className="text-oliebol">Een paar korte vragen, dan weten we waar we je kunnen inzetten. Duurt een minuutje of twee.</p>
      </div>

      {!loaded ? <OliebolLoader /> : null}

      {/* The conversation so far. */}
      {ids.slice(0, index).map((id) => (
        <div key={id} className="grid gap-1.5">
          <div className="flex items-end gap-2">
            <Avatar />
            <p className="max-w-[85%] rounded-kaart rounded-bl-sm bg-papier px-3 py-2 text-sm text-krent shadow-zacht">{step[id].ask}</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" className={`${textAction} text-xs`} onClick={() => setAt(id)}>
              Wijzig
            </button>
            <p className="max-w-[80%] rounded-kaart rounded-br-sm bg-krent px-3 py-2 text-sm text-meel">{step[id].answer()}</p>
          </div>
        </div>
      ))}

      {/* The current question. */}
      <Card>
        <div className="mb-3 flex items-start gap-3">
          <Avatar large />
          <div className="grid gap-0.5">
            <p className={fieldLabel}>
              {/* Until the first answer the length of the conversation is unknown. */}
              Vraag {index + 1}
              {ids.length > 1 ? ` van ${ids.length}` : ""}
            </p>
            <h2 ref={questionRef} tabIndex={-1} className="font-serif text-xl font-bold leading-tight text-krent outline-none" aria-live="polite">
              {step[current].ask}
            </h2>
            {step[current].hint ? <p className="text-sm text-muted">{step[current].hint}</p> : null}
          </div>
        </div>
        {view.content}
        {error ? (
          <div className="mt-3">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
        {current === "contact" && contactProblem && (name || phone || email) ? <p className="mt-2 text-xs text-muted">{contactProblem}</p> : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {index > 0 ? (
            <button type="button" className={ghostButton} onClick={back}>
              Terug
            </button>
          ) : (
            <span />
          )}
          {current === "check" ? (
            <button type="submit" className={primaryButton} disabled={busy || !consent}>
              {busy ? "Versturen…" : "Aanmelden"}
            </button>
          ) : view.next ? (
            <button type="button" className={primaryButton} disabled={!view.next.ready} onClick={() => advance()}>
              {view.next.label ?? "Verder"}
            </button>
          ) : null}
        </div>
      </Card>
    </form>
  );
}

function Avatar({ large = false }: { large?: boolean }) {
  return <img src={omaUrl} alt="" className={`${large ? "h-10 w-10" : "h-7 w-7"} flex-none rounded-full object-cover object-top`} />;
}

/** One answer from a short list: picking it answers the question straight away. */
function Choices<T extends string>({ value, options, onPick }: { value: T | null; options: Array<[T, string, string]>; onPick: (value: T) => void }) {
  return (
    <div className="grid gap-1.5">
      {options.map(([key, title, sub]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onPick(key)}
          className={`rounded-lg px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krent ${
            value === key ? "bg-krent text-meel" : "bg-vul text-krent hover:bg-vul-2"
          }`}
        >
          <span className="block font-bold">{title}</span>
          {sub ? <span className={`block text-sm ${value === key ? "text-meel/80" : "text-muted"}`}>{sub}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krent ${
        on ? "bg-krent text-meel" : "bg-vul text-krent hover:bg-vul-2"
      }`}
    >
      <Check on={on} />
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`grid h-5 w-5 flex-none place-items-center rounded ${on ? "bg-meel text-krent" : "bg-papier"}`}>
      {on ? (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      ) : null}
    </span>
  );
}

function RolePicker({
  roles,
  value,
  onChange,
  cargoBike,
  onCargoBike
}: {
  roles: VolunteerRole[];
  value: VolunteerRole[];
  onChange: (change: (prev: VolunteerRole[]) => VolunteerRole[]) => void;
  cargoBike?: boolean;
  onCargoBike?: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-1.5">
      {roles.map((role) => {
        const on = value.includes(role);
        return (
          <div key={role} className="grid gap-1.5">
            <Toggle on={on} onClick={() => onChange((prev) => VOLUNTEER_ROLES.filter((r) => (r === role ? !prev.includes(r) : prev.includes(r))))}>
              <span className="font-bold">{volunteerRoleLabel[role]}</span>
              <span className={`block text-xs ${on ? "text-meel/80" : "text-muted"}`}>{roleBlurb[role]}</span>
            </Toggle>
            {role === "fietskoerier" && on && onCargoBike ? (
              <div className="pl-4">
                <CargoBike value={!!cargoBike} onChange={onCargoBike} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CargoBike({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-krent">
      <input type="checkbox" className="accent-[#69873c]" checked={value} onChange={(e) => onChange(e.target.checked)} />
      Ik kan een bakfiets lenen van iemand
    </label>
  );
}

function ChipGrid({
  items,
  value,
  onChange,
  columns = "grid-cols-3 sm:grid-cols-5"
}: {
  items: Array<{ key: string; label: string; sub?: string; mark?: boolean }>;
  value: string[];
  onChange: (change: (prev: string[]) => string[]) => void;
  columns?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${columns}`}>
      {items.map((item) => {
        const on = value.includes(item.key);
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange((prev) => (prev.includes(item.key) ? prev.filter((k) => k !== item.key) : [...prev, item.key]))}
            className={`relative min-h-[44px] rounded-lg px-2 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krent ${
              on ? "bg-krent font-bold text-meel" : "bg-vul text-krent hover:bg-vul-2"
            }`}
          >
            {item.label}
            {item.sub ? <span className={`block text-[11px] font-normal ${on ? "text-meel/80" : "text-muted"}`}>{item.sub}</span> : null}
            {item.mark ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-feest" aria-label="nog nodig" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function MarkLegend() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted">
      <span className="h-2 w-2 rounded-full bg-feest" aria-hidden="true" /> Daar hebben we nog weinig mensen.
    </p>
  );
}

/**
 * The options of one task as a table: a row per day, a column per dagdeel.
 * Thirty checkboxes in a row were hard to scan; this reads like a rooster.
 */
function OptionGrid({ role, counts, value, onChange }: { role: VolunteerRole; counts: SignupCounts | null; value: string[]; onChange: (change: (prev: string[]) => string[]) => void }) {
  const options = SIGNUP_OPTIONS[role];
  const rows: Array<{ day: string; label: string; options: string[] }> = [];
  for (const option of options) {
    const day = dayKey(option);
    const row = rows.find((r) => r.day === day);
    if (row) row.options.push(option);
    else rows.push({ day, label: shortDay(option.split(/[:(]/)[0].trim()), options: [option] });
  }
  const label = counts ? labelQuietOptions(counts, role) : false;
  const quiet = (o: string) => !!counts && label && staffingStatus(countFor(counts, role, o), targetFor(role, o)) === "weinig";
  // Keep the agenda order, so the sheet reads the same as a Google Form answer.
  const toggle = (o: string) => onChange((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : options.filter((x) => x === o || prev.includes(x))));
  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        {rows.map((r) => (
          <div key={r.day} className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-2">
            <button
              type="button"
              className="text-left text-sm font-bold text-krent hover:underline"
              title={r.options.length > 1 ? "Hele dag aan of uit" : undefined}
              onClick={() => onChange((prev) => (r.options.every((o) => prev.includes(o)) ? prev.filter((v) => !r.options.includes(v)) : options.filter((x) => prev.includes(x) || r.options.includes(x))))}
            >
              {r.label}
            </button>
            <div className="flex flex-wrap gap-1.5">
              {r.options.map((o) => {
                const on = value.includes(o);
                const part = optionPart(o);
                const text = o.match(/\(([^)]+)\)/)?.[1] ?? (part ? partLabel[part] : "Hele dag");
                const time = OPTION_TIMES[o.trim().toLowerCase()];
                return (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${o}${quiet(o) ? ", nog nodig" : ""}`}
                    onClick={() => toggle(o)}
                    className={`relative min-h-[40px] min-w-[96px] rounded-lg px-3 py-1.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krent ${
                      on ? "bg-krent font-bold text-meel" : "bg-vul text-krent hover:bg-vul-2"
                    }`}
                  >
                    {text}
                    {time ? <span className={`block text-[11px] font-normal ${on ? "text-meel/80" : "text-muted"}`}>{time}</span> : null}
                    {quiet(o) ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-feest" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {options.some(quiet) ? <MarkLegend /> : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className={fieldLabel}>{label}</span>
      <input className={inputClass} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} />
    </label>
  );
}
