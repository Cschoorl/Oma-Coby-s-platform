import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { backend, type SignupCounts } from "../../data/backend";
import { countFor, dayKey, labelQuietOptions, staffingStatus, suggestOptions, targetFor } from "../../utils/staffing";
import type { ReminderChannel, VolunteerRole } from "../../types/dashboard";
import { ACTIVE_ROLES, VOLUNTEER_ROLES, drivingLabel, maxShiftsLabel, volunteerRoleLabel } from "../../types/dashboard";
import { Card, Notice, Sticker, fieldLabel, ghostButton, inputClass, primaryButton, rollOliebol, textAction } from "../../components/ui";
import omaUrl from "../../assets/oma-coby.jpg";
import { CONTACT_EMAIL, OPTION_TIMES, SIGNUP_OPTIONS, applyAgenda } from "../../config";
import { daysWithChoice, emptyAnswers, labelQuietDays, neediestFor, optionPart, optionsFor, partsOnDay, quietDays, rolesOnDays, seasonDays, toRoles, type Answers, type Part } from "./signupFlow";

/*
 * The signup as a conversation with Oma Coby. She introduces herself, asks one thing at a time,
 * reacts briefly to each answer, and earlier answers stay visible above like a chat, each with "Wijzig".
 * Answers are buttons (quick replies), never free text: then we know exactly what goes into the sheet.
 *
 * Persona: Oma Coby, warm and a bit cheeky, short sentences, je/jij, the volunteer's first name.
 * She never makes promises about the rooster; that comes later.
 */

type StepId = "mode" | "roles" | "license" | `picks-${VolunteerRole}` | "suggest" | "days" | "parts" | "dayroles" | "flexible" | "max" | "reminder" | "contact" | "check";

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

function listOrCount(items: string[], plural: string): string {
  return items.length <= 3 ? items.join(", ") : `${items.length} ${plural}`;
}

/** The shift time of a task when all its moments share one ("6:30–12:00"), else "". */
function sharedTime(role: VolunteerRole): string {
  const times = new Set(SIGNUP_OPTIONS[role].map((o) => OPTION_TIMES[o.trim().toLowerCase()] ?? ""));
  return times.size === 1 ? [...times][0] : "";
}

function roleBlurb(role: VolunteerRole): string {
  const time = sharedTime(role).replace("–", " tot ");
  if (role === "inpakken") return time ? `Van ${time} in Aalsmeer, met koffie.` : "Oliebollen in zakken en dozen in Aalsmeer.";
  if (role === "autokoerier") return time ? `Rondbrengen met de auto, van ${time}.` : "Rondbrengen met je eigen of een geleende auto.";
  return "Achter de bar bij een evenement.";
}

/** True when a task has more than one shift on some day: then its moments need a dagdeel column. */
function hasParts(role: VolunteerRole): boolean {
  const days = SIGNUP_OPTIONS[role].map(dayKey);
  return new Set(days).size < days.length;
}

type Suggestion = { role: VolunteerRole; option: string };

/** The answers as per-task moments, with the quiet moments they added when Oma asked ("role|option"). */
function withExtra(a: Answers, extra: string[]) {
  const base = toRoles(a);
  for (const key of extra) {
    const [role, option] = key.split("|") as [VolunteerRole, string];
    const days = new Set([...base[role].days, option]);
    base[role] = { wants: true, days: SIGNUP_OPTIONS[role].filter((o) => days.has(o)) };
  }
  return base;
}

/** Different days they can, over all tasks: inpakken and the bar on one day is still one day. */
function countDays(roles: ReturnType<typeof toRoles>): number {
  return new Set(ACTIVE_ROLES.flatMap((r) => roles[r].days.map(dayKey))).size;
}

function stepIds(a: Answers, suggestions: Suggestion[], chosenDays: number): StepId[] {
  const ids: StepId[] = ["mode"];
  if (!a.mode) return ids;
  // Bezorgen needs a driving licence: asked straight after choosing it, before any days for it.
  const license: StepId[] = a.roles.includes("autokoerier") ? ["license"] : [];
  if (a.mode === "taak") {
    ids.push("roles", ...license, ...ACTIVE_ROLES.filter((r) => a.roles.includes(r)).map((r) => `picks-${r}` as StepId));
    if (suggestions.length > 0) ids.push("suggest");
  } else {
    ids.push("days");
    // Only a question on days with more than one shift; with one morning shift there is nothing to ask.
    if (daysWithChoice(a.days).length > 0) ids.push("parts");
    ids.push("dayroles", ...license);
  }
  // "Zet me maar in waar het nodig is" already answers this one.
  if (a.mode !== "flexibel") ids.push("flexible");
  // With one day the maximum is that day; no need to ask.
  if (chosenDays > 1) ids.push("max");
  ids.push("reminder", "contact", "check");
  return ids;
}

/** How long Oma "types" before her message: a short beat, so it reads as a reply and never as waiting. */
const typingMs = (text: string) => 350 + Math.min(text.length * 5, 350);

/** Her reaction to the last answer and the next question as one message, not two: fewer bubbles, less chatter. */
function joinLines(reaction: string | undefined, say: string[]): string[] {
  if (!reaction) return say;
  return [`${reaction} ${say[0]}`, ...say.slice(1)];
}

/** Standalone signup page (no login). Saved to the same tab as the Google Form, plus the planning columns. */
export function SignupPage() {
  const [counts, setCounts] = useState<SignupCounts | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [a, setA] = useState<Answers>(emptyAnswers);
  /** Quiet moments the volunteer added when Oma asked, as "role|option". */
  const [extra, setExtra] = useState<string[]>([]);
  const [at, setAt] = useState<StepId>("mode");
  /** How many of Oma's messages for the current step are shown; the rest are still being "typed". */
  const [revealed, setRevealed] = useState(0);
  /** Going back with "Wijzig" shows the question at once: no typing a second time. */
  const instant = useRef(false);
  const opened = useRef(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [remark, setRemark] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);

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

  const roles = useMemo(() => withExtra(a, extra), [a, extra]);
  const chosenDays = countDays(roles);
  /** The maximum as it goes into the sheet: never more than the days they chose. */
  const maxShifts = Math.max(1, Math.min(a.maxShifts ?? chosenDays, chosenDays));

  const ids = stepIds(a, suggestions, chosenDays);
  const index = Math.max(0, ids.indexOf(at));
  const current = ids[index];
  const first = firstName.trim().split(" ")[0];
  /** "Zet me maar in" and "Maakt niet uit" offer every task on their days, but no bezorgen without a licence. */
  const offered = (list: string[]) => rolesOnDays(list).filter((r) => !(r === "autokoerier" && a.driving === "nee"));

  const days = seasonDays();
  const dayLabel = (key: string) => shortDay(days.find((d) => d.key === key)?.label ?? key);
  const pickedCount = (r: VolunteerRole) => a.picks[r].length;

  /*
   * What Oma says per step, how the answer reads back, and her reaction to it. A reaction is only
   * there when it adds something (warmth after a choice, a promise she keeps); it opens her next message.
   */
  const copy: Record<StepId, { say: string[]; answer: () => string; react?: () => string | undefined }> = {
    mode: {
      // Opening: who she is (and that she is digital), what this is, how long; then straight to the first question.
      say: ["Hoi! Oma Coby hier, nou ja, mijn digitale versie. Een paar korte vragen en ik weet waar ik je kan gebruiken.", "Weet je al wat je wilt doen, of wanneer je kunt?"],
      answer: () => (a.mode === "taak" ? "Ik weet wat ik wil doen" : a.mode === "dag" ? "Ik weet wanneer ik kan" : "Zet me maar in waar het nodig is"),
      react: () => (a.mode === "flexibel" ? "Daar word ik blij van!" : undefined)
    },
    roles: {
      say: ["Wat zou je het liefst doen? Meer dan één mag."],
      answer: () => a.roles.map((r) => volunteerRoleLabel[r]).join(", "),
      react: () => (a.roles.includes("inpakken") ? "Lekker, de koffie staat klaar." : undefined)
    },
    license: {
      say: ["Voor bezorgen heb je een rijbewijs nodig. Heb je dat, en kun je een auto gebruiken?"],
      answer: () => (a.driving === "auto" ? "Rijbewijs én auto" : a.driving === "rijbewijs" ? "Rijbewijs, geen auto" : "Geen rijbewijs"),
      react: () =>
        a.driving === "rijbewijs" ? "Genoteerd, daar houd ik rekening mee." : a.driving === "nee" ? "Geen probleem, dan laat ik bezorgen zitten." : undefined
    },
    ...(Object.fromEntries(
      VOLUNTEER_ROLES.map((r) => {
        const time = sharedTime(r).replace("–", " tot ");
        const ask =
          r === "inpakken"
            ? `${time ? `Inpakken doen we van ${time} in Aalsmeer. ` : ""}Welke dagen kun je?`
            : r === "autokoerier"
              ? `${time ? `Bezorgen is 's ochtends, van ${time}. ` : ""}Welke dagen kun je rijden?`
              : "Op welke dagen kun je in de Oliebollenbar staan?";
        return [
          `picks-${r}`,
          {
            say: [ask],
            answer: () => listOrCount(a.picks[r].map(shortOption), "dagen"),
            react: () => (pickedCount(r) >= 3 ? "Wat een toppertje." : undefined)
          }
        ];
      })
    ) as Record<`picks-${VolunteerRole}`, { say: string[]; answer: () => string; react: () => string | undefined }>),
    suggest: {
      say: ["Ik zit nog een beetje krap op een paar momenten. Kun je er misschien ook een? Helemaal goed als het niet uitkomt."],
      answer: () => (extra.length ? `Ja: ${extra.map((k) => shortOption(k.split("|")[1])).join(", ")}` : "Nee, zo is het goed"),
      react: () => (extra.length ? "Je bent een schat." : undefined)
    },
    days: {
      say: [a.mode === "dag" ? "Op welke dagen kun je?" : "Welke dagen ben je beschikbaar? Hoe meer dagen, hoe makkelijker ik je ergens kwijt kan."],
      answer: () => listOrCount(a.days.map(dayLabel), "dagen")
    },
    parts: {
      say: ["Op sommige dagen is er meer dan één dienst. Wanneer kun je dan?"],
      answer: () =>
        daysWithChoice(a.days)
          .map((d) => `${dayLabel(d)}: ${(a.parts[d] ?? []).map((p) => partLabel[p].toLowerCase()).join(" en ")}`)
          .join(", ")
    },
    dayroles: {
      say:
        a.mode === "dag"
          ? [a.days.length === 1 ? "En wat wil je die dag doen?" : "En wat wil je op die dagen doen?"]
          : ["Ik heb je bij alles ingevuld. Haal weg wat je niet kunt of wilt."],
      answer: () => (a.mode === "dag" && a.roles.length === offered(a.days).length ? "Maakt niet uit" : a.roles.map((r) => volunteerRoleLabel[r]).join(", "))
    },
    flexible: {
      say: ["Als het ergens anders drukker is, mag ik je daar dan ook neerzetten?"],
      answer: () => (a.flexible ? "Ja, prima" : "Liever niet"),
      react: () => (a.flexible ? "Fijn!" : "Afspraak is afspraak.")
    },
    max: {
      // She counts for them: the number of days they ticked, so nobody has to count their own.
      say: [`Je kunt op ${chosenDays} dagen. Op hoeveel daarvan wil je helpen?`],
      answer: () => (maxShifts === chosenDays ? `Alle ${chosenDays}` : maxShiftsLabel(maxShifts)),
      react: () => (maxShifts === chosenDays ? "Jij bent een kanjer." : `Afgesproken, hooguit ${maxShiftsLabel(maxShifts)}.`)
    },
    reminder: {
      say: ["Zal ik je de dag ervoor even herinneren? Dan weet je waar en hoe laat."],
      answer: () => (a.reminder === "whatsapp" ? "Ja, via WhatsApp" : a.reminder === "mail" ? "Ja, via mail" : "Hoeft niet"),
      react: () => (a.reminder === "whatsapp" ? "Komt goed, ik app je." : a.reminder === "mail" ? "Komt goed, je krijgt een mailtje." : "Prima, je rooster krijg je sowieso.")
    },
    contact: {
      say: ["Bijna klaar! Hoe heet je, en hoe kan ik je bereiken?"],
      answer: () => [`${firstName.trim()} ${lastName.trim()}`.trim(), phone || email].filter(Boolean).join(" · "),
      react: () => `Dankjewel, ${first}!`
    },
    check: { say: ["Ik zet het even op een rijtje. Klopt dit zo?"], answer: () => "" }
  };

  const lines = joinLines(index > 0 ? copy[ids[index - 1]].react?.() : undefined, copy[current].say);
  const typing = revealed < lines.length;

  // Oma "types" her messages one by one; with less motion, or after "Wijzig", they show at once.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || instant.current) {
      instant.current = false;
      setRevealed(lines.length);
      return;
    }
    // On opening the page her greeting is simply there; only the question after it gets the dots.
    let shown = current === "mode" && index === 0 && !opened.current ? 1 : 0;
    opened.current = true;
    setRevealed(shown);
    let timer = 0;
    const next = () => {
      timer = window.setTimeout(() => {
        shown += 1;
        setRevealed(shown);
        if (shown < lines.length) next();
      }, typingMs(lines[shown]));
    };
    if (shown < lines.length) next();
    return () => window.clearTimeout(timer);
    // Only when the step changes: answers given meanwhile must not restart the typing.
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once Oma has asked, bring the answer buttons into view and hand them the focus.
  useEffect(() => {
    if (typing) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    composerRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    // A text field focuses itself (autoFocus); otherwise the answers get the focus.
    if (!composerRef.current?.querySelector("input:not([type=checkbox])")) composerRef.current?.focus({ preventScroll: true });
  }, [typing, current]);

  /** Next step, worked out from the answers as they will be after this change. */
  function advance(next: Partial<Answers> = {}) {
    const after = { ...a, ...next };
    // "Zet me maar in": open to every task on their days, unless they untick one.
    if (after.mode === "flexibel" && after.roles.length === 0 && after.days.length > 0) after.roles = rolesOnDays(after.days).filter((r) => !(r === "autokoerier" && after.driving === "nee"));
    // Days with more than one shift start with all of them ticked; untick what does not fit.
    const open = daysWithChoice(after.days).filter((d) => !after.parts[d]);
    if (open.length) after.parts = { ...after.parts, ...Object.fromEntries(open.map((d) => [d, partsOnDay(d)])) };
    setA(after);
    setError(null);
    const list = stepIds(after, suggestions, countDays(withExtra(after, extra)));
    // No licence and bezorgen was their only task: back to choosing what they would like to do.
    if (after.roles.length === 0 && current === "license") {
      setAt(after.mode === "taak" ? "roles" : "dayroles");
      return;
    }
    // The licence step leaves the list once bezorgen is gone, so continue from where it stood.
    const from = current === "license" && !list.includes("license") ? list.indexOf(after.mode === "taak" ? "roles" : "dayroles") : list.indexOf(current);
    setAt(list[Math.min(from + 1, list.length - 1)]);
  }

  function goTo(id: StepId) {
    instant.current = true;
    setError(null);
    setAt(id);
  }

  const contactProblem = !firstName.trim()
    ? "Vul je voornaam in."
    : !lastName.trim()
    ? `Vul je achternaam in, dan verwar ik je niet met een andere ${first}.`
    : a.reminder === "whatsapp" && !phone.trim()
      ? "Vul je telefoonnummer in, dan kan ik je appen."
      : a.reminder === "mail" && !email.trim()
        ? "Vul je e-mailadres in, dan kan ik je mailen."
        : !phone.trim() && !email.trim()
          ? "Vul een telefoonnummer of e-mailadres in."
          : null;

  const quietDayMarks = counts && labelQuietDays(counts) ? quietDays(counts) : [];

  /** The answer controls for each step, and whether "Verder" can be pressed (none: a quick reply answers). */
  function composer(id: StepId): { content: ReactNode; next?: { ready: boolean; label?: string } } {
    switch (id) {
      case "mode":
        return {
          content: (
            <QuickReplies
              value={a.mode}
              onPick={(mode) => advance({ mode, flexible: mode === "flexibel" ? true : a.flexible })}
              options={[
                ["taak", "Ik weet wat ik wil doen"],
                ["dag", "Ik weet wanneer ik kan"],
                ["flexibel", "Zet me maar in waar het nodig is"]
              ]}
            />
          )
        };
      case "roles":
        return {
          content: <RolePicker roles={ACTIVE_ROLES} value={a.roles} onChange={(change) => setA((prev) => ({ ...prev, roles: change(prev.roles) }))} />,
          next: { ready: a.roles.length > 0 }
        };
      case "license":
        return {
          content: (
            <QuickReplies
              value={a.driving}
              onPick={(driving) => advance({ driving, roles: driving === "nee" ? a.roles.filter((r) => r !== "autokoerier") : a.roles })}
              options={[
                ["auto", "Rijbewijs én auto"],
                ["rijbewijs", "Rijbewijs, geen auto"],
                ["nee", "Geen rijbewijs"]
              ]}
            />
          )
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
                  <Toggle key={key} on={on} onClick={() => setExtra((x) => (x.includes(key) ? x.filter((k) => k !== key) : [...x, key]))}>
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
        const choice = daysWithChoice(a.days);
        return {
          content: (
            <div className="grid gap-1.5">
              {choice.map((day) => (
                <div key={day} className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-2">
                  <span className="text-sm font-bold text-krent">{dayLabel(day)}</span>
                  <ChipGrid
                    columns="grid-cols-3"
                    items={partsOnDay(day).map((p) => ({ key: p, label: partLabel[p] }))}
                    value={a.parts[day] ?? []}
                    onChange={(change) =>
                      setA((prev) => {
                        const next = change(prev.parts[day] ?? []);
                        return { ...prev, parts: { ...prev.parts, [day]: partsOnDay(day).filter((p) => next.includes(p)) } };
                      })
                    }
                  />
                </div>
              ))}
              <p className="text-xs text-muted">Kun je op een dag toch niet? Haal die dag dan weg bij de vorige vraag.</p>
            </div>
          ),
          next: { ready: choice.every((d) => (a.parts[d] ?? []).length > 0) }
        };
      }
      case "dayroles": {
        const available = offered(a.days);
        return {
          content: (
            <div className="grid gap-2">
              <RolePicker roles={available} value={a.roles} onChange={(change) => setA((prev) => ({ ...prev, roles: change(prev.roles) }))} />
              {a.mode === "dag" && a.roles.length < available.length ? (
                <button type="button" className={`${textAction} justify-self-start text-sm`} onClick={() => advance({ roles: available })}>
                  Maakt niet uit, alles is goed
                </button>
              ) : null}
            </div>
          ),
          next: { ready: a.roles.some((r) => optionsFor(r, a.days, a.parts).length > 0) }
        };
      }
      case "flexible":
        return {
          content: (
            <QuickReplies
              value={a.flexible === null ? null : a.flexible ? "ja" : "nee"}
              onPick={(v) => advance({ flexible: v === "ja" })}
              options={[
                ["ja", "Ja, prima"],
                ["nee", "Liever niet"]
              ]}
            />
          )
        };
      case "max":
        // Exact numbers where they matter for the rooster, then "all the days you chose".
        return {
          content: (
            <QuickReplies
              value={a.maxShifts === null ? null : String(maxShifts)}
              onPick={(n) => advance({ maxShifts: Number(n) })}
              options={[
                ...[1, 2, 3, 5].filter((n) => n < chosenDays).map((n): [string, string] => [String(n), maxShiftsLabel(n)]),
                [String(chosenDays), `Alle ${chosenDays}`]
              ]}
            />
          )
        };
      case "reminder":
        return {
          content: (
            <QuickReplies<ReminderChannel>
              value={a.reminder}
              onPick={(reminder) => advance({ reminder })}
              options={[
                ["whatsapp", "Ja, via WhatsApp"],
                ["mail", "Ja, via mail"],
                ["geen", "Hoeft niet"]
              ]}
            />
          )
        };
      case "contact":
        return {
          content: (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Voornaam *" value={firstName} onChange={setFirstName} autoComplete="given-name" autoFocus />
                <Field label="Achternaam *" value={lastName} onChange={setLastName} autoComplete="family-name" />
                <Field label={`Telefoonnummer${a.reminder === "whatsapp" ? " *" : ""}`} value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
                <Field label={`E-mailadres${a.reminder === "mail" ? " *" : ""}`} value={email} onChange={setEmail} type="email" autoComplete="email" />
                <Field label="Woonplaats" value={city} onChange={setCity} autoComplete="address-level2" />
                {roles.autokoerier.wants ? (
                  <div className="sm:col-span-2">
                    <Field label="Adres" value={address} onChange={setAddress} autoComplete="street-address" placeholder="Straat en huisnummer" />
                    <p className="mt-1 text-xs text-muted">Handig voor bezorgers: dan plan ik een route bij jou in de buurt.</p>
                  </div>
                ) : null}
              </div>
              {contactProblem && (firstName || lastName || phone || email) ? <p className="text-xs text-muted">{contactProblem}</p> : null}
            </div>
          ),
          next: { ready: !contactProblem }
        };
      case "check": {
        const neediest = counts && a.mode === "flexibel" ? neediestFor(counts, a) : [];
        return {
          content: (
            <div className="grid gap-3">
              <dl className="grid gap-1.5 text-sm">
                {ACTIVE_ROLES.filter((r) => roles[r].wants).map((r) => (
                  <div key={r} className="grid gap-0.5 sm:grid-cols-[130px_minmax(0,1fr)]">
                    <dt className="font-bold text-krent">{volunteerRoleLabel[r]}</dt>
                    <dd className="text-krent">{roles[r].days.map(shortOption).join(", ")}</dd>
                  </div>
                ))}
                {roles.autokoerier.wants && a.driving && a.driving !== "nee" ? (
                  <div className="grid gap-0.5 sm:grid-cols-[130px_minmax(0,1fr)]">
                    <dt className="font-bold text-krent">Rijbewijs</dt>
                    <dd className="text-krent">{drivingLabel[a.driving]}</dd>
                  </div>
                ) : null}
                <div className="grid gap-0.5 sm:grid-cols-[130px_minmax(0,1fr)]">
                  <dt className="font-bold text-krent">Planning</dt>
                  <dd className="text-krent">
                    {a.mode === "flexibel" || a.flexible ? "Mag ingedeeld worden waar het nodig is" : "Alleen wat ik koos"} · maximaal {maxShiftsLabel(maxShifts)}
                  </dd>
                </div>
              </dl>
              {neediest.length > 0 ? (
                <p className="text-sm text-muted">
                  Hier heb ik je nu het hardst nodig: <span className="text-krent">{neediest.map((n) => `${shortOption(n.option)} (${volunteerRoleLabel[n.role].toLowerCase()})`).join(", ")}</span>.
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
          )
        };
      }
      default: {
        const role = id.slice(6) as VolunteerRole;
        const quiet = (o: string) => !!counts && labelQuietOptions(counts, role) && staffingStatus(countFor(counts, role, o), targetFor(role, o)) === "weinig";
        const setPicks = (change: (prev: string[]) => string[]) => setA((prev) => ({ ...prev, picks: { ...prev.picks, [role]: change(prev.picks[role]) } }));
        return {
          content: (
            <div className="grid gap-2">
              {loaded && SIGNUP_OPTIONS[role].length === 0 ? <p className="text-sm text-muted">Hiervoor staan nog geen momenten in de agenda.</p> : null}
              {hasParts(role) ? (
                <OptionGrid role={role} quiet={quiet} value={a.picks[role]} onChange={setPicks} />
              ) : (
                // One shift a day: just the days, like a calendar.
                <ChipGrid
                  items={SIGNUP_OPTIONS[role].map((o) => ({ key: o, label: shortDay(o.split(/[:(]/)[0].trim()), sub: o.match(/\(([^)]+)\)/)?.[1], mark: quiet(o) }))}
                  value={a.picks[role]}
                  // Keep the agenda order, so the sheet reads the same as a Google Form answer.
                  onChange={(change) => setPicks((prev) => SIGNUP_OPTIONS[role].filter((o) => change(prev).includes(o)))}
                />
              )}
              {SIGNUP_OPTIONS[role].some(quiet) ? <MarkLegend /> : null}
            </div>
          ),
          next: { ready: a.picks[role].length > 0 }
        };
      }
    }
  }

  const view = composer(current);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // Enter in a text field means "Verder" until the last step.
    if (current !== "check") {
      if (view.next?.ready) advance();
      return;
    }
    if (!a.mode || (a.flexible === null && a.mode !== "flexibel") || !a.reminder) return;
    setBusy(true);
    setError(null);
    try {
      await backend.registerVolunteer({
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        address,
        city,
        phone,
        email,
        roles,
        cargoBike: false,
        remark,
        consent,
        planning: {
          mode: a.mode,
          flexible: a.mode === "flexibel" || a.flexible === true,
          maxShifts,
          reminder: a.reminder,
          driving: roles.autokoerier.wants && a.driving && a.driving !== "nee" ? a.driving : undefined
        }
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
    return (
      <section className="grid overflow-hidden rounded-kaart bg-papier shadow-zacht sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        {/* Portrait card: the photo of Oma Coby is 4:5, so the card follows it instead of cropping her to a strip. */}
        <div className="relative">
          <img src={omaUrl} alt="Oma Coby met een bord oliebollen" className="aspect-[4/5] h-full w-full object-cover object-top" />
          <Sticker slap className="absolute bottom-4 right-4">Bedankt!</Sticker>
        </div>
        <div className="grid content-center gap-2 p-5 sm:p-7">
          <h1 className="font-display text-4xl uppercase leading-none tracking-wide text-krent">Dankjewel, {first}!</h1>
          <p className="text-krent">Je bent nu officieel mijn hulpje. Zodra ik weet hoeveel bestellingen er zijn, maak ik het rooster en laat ik je weten waar en wanneer ik je verwacht.</p>
          {a.reminder && a.reminder !== "geen" ? (
            <p className="text-sm text-krent">De dag ervoor krijg je nog een herinnering via {a.reminder === "whatsapp" ? "WhatsApp" : "mail"}.</p>
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

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-0.5">
        <p className={fieldLabel}>Vrijwilligers gezocht</p>
        <h1 className="font-display text-[34px] uppercase leading-none tracking-wide text-krent">
          Help je <span className="text-feest">mee</span>?
        </h1>
      </div>

      <div className="grid gap-3" role="log" aria-live="polite" aria-label="Gesprek met Oma Coby">
        {/* The conversation so far. */}
        {ids.slice(0, index).map((id, k) => (
          <div key={id} className="grid gap-1.5">
            <OmaSays lines={joinLines(k > 0 ? copy[ids[k - 1]].react?.() : undefined, copy[id].say)} />
            <div className="flex items-center justify-end gap-2">
              <button type="button" className={`${textAction} text-xs`} onClick={() => goTo(id)}>
                Wijzig
              </button>
              <p className="max-w-[80%] rounded-kaart rounded-br-sm bg-krent px-3 py-2 text-sm text-meel">{copy[id].answer()}</p>
            </div>
          </div>
        ))}
        {/* What Oma says now, one message at a time. */}
        <OmaSays lines={lines.slice(0, revealed)} typing={typing} />
      </div>

      {!typing ? (
        // Focus lands here by script so the answers come next for keyboard users; no ring on a container.
        <div ref={composerRef} tabIndex={-1} className="focus:outline-none" aria-label={lines[lines.length - 1]}>
          <Card>
            {!view.next && current !== "check" ? (
              // Quick replies answer at once: they share one row with "Terug".
              <div className="flex flex-wrap items-center gap-2">
                {index > 0 ? (
                  <button type="button" className={ghostButton} onClick={() => goTo(ids[index - 1])}>
                    Terug
                  </button>
                ) : null}
                <div className="ml-auto">{view.content}</div>
              </div>
            ) : (
              view.content
            )}
            {error ? (
              <div className="mt-3">
                <Notice tone="error">{error}</Notice>
              </div>
            ) : null}
            {view.next || current === "check" ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                {index > 0 ? (
                  <button type="button" className={ghostButton} onClick={() => goTo(ids[index - 1])}>
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
            ) : null}
          </Card>
        </div>
      ) : null}
    </form>
  );
}

/** Oma's messages: her photo once beside the group, the newest at the bottom; "…" while she types. */
function OmaSays({ lines, typing = false }: { lines: string[]; typing?: boolean }) {
  if (lines.length === 0 && !typing) return null;
  return (
    <div className="flex items-end gap-2">
      <img src={omaUrl} alt="" className="h-8 w-8 flex-none rounded-full object-cover object-top" />
      <div className="grid max-w-[85%] justify-items-start gap-1">
        {lines.map((line, i) => (
          <p key={i} className="rounded-kaart rounded-bl-sm bg-papier px-3 py-2 text-sm text-krent shadow-zacht">
            {line}
          </p>
        ))}
        {typing ? (
          <p className="oc-typing rounded-kaart rounded-bl-sm bg-papier px-3 py-3 shadow-zacht" aria-label="Oma typt…">
            <span />
            <span />
            <span />
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Short answers as buttons; picking one answers straight away, like a quick reply in a chat. */
function QuickReplies<T extends string>({ value, options, onPick }: { value: T | null; options: Array<[T, string]>; onPick: (value: T) => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onPick(key)}
          className={`min-h-[40px] rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krent ${
            value === key ? "bg-krent text-meel" : "bg-vul text-krent hover:bg-vul-2"
          }`}
        >
          {label}
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

function RolePicker({ roles, value, onChange }: { roles: VolunteerRole[]; value: VolunteerRole[]; onChange: (change: (prev: VolunteerRole[]) => VolunteerRole[]) => void }) {
  return (
    <div className="grid gap-1.5">
      {roles.map((role) => {
        const on = value.includes(role);
        return (
          <Toggle key={role} on={on} onClick={() => onChange((prev) => ACTIVE_ROLES.filter((r) => (r === role ? !prev.includes(r) : prev.includes(r))))}>
            <span className="font-bold">{volunteerRoleLabel[role]}</span>
            <span className={`block text-xs ${on ? "text-meel/80" : "text-muted"}`}>{roleBlurb(role)}</span>
          </Toggle>
        );
      })}
    </div>
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
            aria-label={`${item.label}${item.sub ? `, ${item.sub}` : ""}${item.mark ? ", nog nodig" : ""}`}
            onClick={() => onChange((prev) => (prev.includes(item.key) ? prev.filter((k) => k !== item.key) : [...prev, item.key]))}
            className={`relative min-h-[44px] rounded-lg px-2 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krent ${
              on ? "bg-krent font-bold text-meel" : "bg-vul text-krent hover:bg-vul-2"
            }`}
          >
            {item.label}
            {item.sub ? <span className={`block text-[11px] font-normal ${on ? "text-meel/80" : "text-muted"}`}>{item.sub}</span> : null}
            {item.mark ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-feest" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function MarkLegend() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted">
      <span className="h-2 w-2 rounded-full bg-feest" aria-hidden="true" /> Daar heb ik nog weinig mensen.
    </p>
  );
}

/**
 * A task with more than one shift on a day, as a table: a row per day, a column per dagdeel.
 * Clicking the day ticks or unticks the whole day.
 */
function OptionGrid({ role, quiet, value, onChange }: { role: VolunteerRole; quiet: (option: string) => boolean; value: string[]; onChange: (change: (prev: string[]) => string[]) => void }) {
  const options = SIGNUP_OPTIONS[role];
  const rows: Array<{ day: string; label: string; options: string[] }> = [];
  for (const option of options) {
    const day = dayKey(option);
    const row = rows.find((r) => r.day === day);
    if (row) row.options.push(option);
    else rows.push({ day, label: shortDay(option.split(/[:(]/)[0].trim()), options: [option] });
  }
  // Keep the agenda order, so the sheet reads the same as a Google Form answer.
  const toggle = (o: string) => onChange((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : options.filter((x) => x === o || prev.includes(x))));
  return (
    <div className="grid gap-1">
      {rows.map((r) => (
        <div key={r.day} className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-2">
          <button
            type="button"
            className="text-left text-sm font-bold text-krent hover:underline"
            title="Hele dag aan of uit"
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
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  autoFocus
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className={fieldLabel}>{label}</span>
      <input className={inputClass} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} autoFocus={autoFocus} />
    </label>
  );
}
