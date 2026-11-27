import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { backend, type SignupCounts } from "../../data/backend";
import { dayKey } from "../../utils/staffing";
import type { VolunteerRole } from "../../types/dashboard";
import { ACTIVE_ROLES, drivingLabel, maxShiftsLabel, volunteerRoleLabel } from "../../types/dashboard";
import { Card, Notice, Sticker, fieldLabel, ghostButton, inputClass, primaryButton, rollOliebol, textAction } from "../../components/ui";
import omaUrl from "../../assets/oma-coby.jpg";
import omaAvatarUrl from "../../assets/oma-coby-lijst.png";
import { AddressSearch, CitySearch } from "../business/AddressSearch";
import { CONTACT_EMAIL, SHIFT_TIMES, SIGNUP_OPTIONS, applyAgenda } from "../../config";

const until = (range: string) => range.replace("–", " tot ");
/** Bezorgen by car: ca. 9:00 to 15:00, ochtend until 12:30, middag until 15:00. */
const deliveryText = `ca. ${SHIFT_TIMES.autokoerier.ochtend.split("–")[0]} tot ${SHIFT_TIMES.autokoerier.middag.split("–")[1]}: 's ochtends tot ${SHIFT_TIMES.autokoerier.ochtend.split("–")[1]}, 's middags tot ${SHIFT_TIMES.autokoerier.middag.split("–")[1]}`;

import { EMAIL_PATTERN as EMAIL, useEmailCheck } from "../../lib/emailCheck";
import { daysWithChoice, emptyAnswers, eventOn, labelQuietDays, neediestFor, optionPart, optionsFor, partTimeOn, partsOnDay, quietDays, rolesOnDays, seasonDays, toRoles, type Answers, type Part } from "./signupFlow";

/*
 * The signup as a conversation with Oma Coby. She introduces herself, asks one thing at a time,
 * reacts briefly to each answer, and earlier answers stay visible above like a chat, each with "Wijzig".
 * Answers are buttons (quick replies), never free text: then we know exactly what goes into the sheet.
 *
 * Persona: Oma Coby, warm and a bit cheeky, short sentences, je/jij, the volunteer's first name.
 * She never makes promises about the rooster; that comes later.
 */

type StepId = "mode" | "roles" | "license" | "days" | "parts" | "dayroles" | "flexible" | "max" | "contact" | "check";

const partLabel: Record<Part, string> = { vroeg: "Vroeg", ochtend: "Ochtend", middag: "Middag", evenement: "Evenement", avond: "Avond" };
/** After choosing tasks a moment is a dienst of that task: "Inpakken 7:00–9:30", not "Vroeg". */
const taskPartLabel: Record<Part, string> = { vroeg: "Inpakken", ochtend: "Bezorgen", middag: "Bezorgen", evenement: "Oliebollenbar", avond: "Oliebollenbar" };

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

function roleBlurb(role: VolunteerRole): string {
  if (role === "inpakken") return `Van ${until(SHIFT_TIMES.inpakken)} in Aalsmeer, met koffie.`;
  if (role === "autokoerier") return `Rondbrengen met je eigen auto, ${deliveryText}.`;
  return "Helpen op evenementen en pick-ups van Oma Coby's Oliebollenbar.";
}

/** Only the Oliebollenbar: its events are the days, each with its own time, so there is nothing more to ask per day. */
const barOnly = (a: Answers) => a.mode === "taak" && a.roles.length === 1 && a.roles[0] === "oliebollenbar";

/** Different days they can, over all tasks: inpakken and the bar on one day is still one day. */
function countDays(roles: ReturnType<typeof toRoles>): number {
  return new Set(ACTIVE_ROLES.flatMap((r) => roles[r].days.map(dayKey))).size;
}

/**
 * The tasks they could be asked for: this season's that have moments (the bar only once it has event days),
 * on their days when they chose days, and no bezorgen without a licence and car.
 */
function offeredRoles(a: Answers): VolunteerRole[] {
  return (a.mode === "taak" ? ACTIVE_ROLES.filter((r) => SIGNUP_OPTIONS[r].length > 0) : rolesOnDays(a.days)).filter((r) => !(r === "autokoerier" && a.driving === "nee"));
}

/** They chose every task there is: "somewhere else" does not exist, so they can be put wherever it is busy. */
const openToAll = (a: Answers) => a.roles.length > 0 && offeredRoles(a).every((r) => a.roles.includes(r));

/** Where she can use someone who cannot bezorgen: the pop-up (the Oliebollenbar) and inpakken, as far as they are on. */
function otherTasks(a: Answers): string {
  const roles = offeredRoles(a);
  const bar = roles.includes("oliebollenbar");
  const pack = roles.includes("inpakken");
  if (bar && pack) return "In onze pop-up, de Oliebollenbar, of aan de inpaktafel kan ik je goed gebruiken.";
  if (bar) return "In onze pop-up, de Oliebollenbar, kan ik je goed gebruiken.";
  if (pack) return "Aan de inpaktafel kan ik je goed gebruiken.";
  return "Op je dagen is er verder nog niets; kies gerust andere dagen.";
}

/** The three ways to start, in the order Oma offers them. The keys stay the same, so the sheet column "Hoe aangemeld" does too. */
const modeLabel = { dag: "Ik weet welke data ik kan", taak: "Ik weet welk type taak ik wil doen", flexibel: "Ik ben flexibel" } as const;

/** "inpakken en bezorgen": the tasks as Oma says them in a sentence. */
function taskNames(roles: VolunteerRole[]): string {
  const names = ACTIVE_ROLES.filter((r) => roles.includes(r)).map((r) => (r === "autokoerier" ? "bezorgen" : r === "oliebollenbar" ? "de Oliebollenbar" : volunteerRoleLabel[r].toLowerCase()));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}` : (names[0] ?? "");
}

function stepIds(a: Answers, chosenDays: number): StepId[] {
  const ids: StepId[] = ["mode"];
  if (!a.mode) return ids;
  // Bezorgen needs a licence and a car of their own: asked straight after choosing it, before any days for it.
  const license: StepId[] = a.roles.includes("autokoerier") ? ["license"] : [];
  // Right after the task choice, while it is fresh; "Zet me maar in" and choosing every task already answer it.
  const flexible: StepId[] = a.mode !== "flexibel" && !openToAll(a) ? ["flexible"] : [];
  if (a.mode === "taak") {
    // The days once, for all their tasks together; then per day the diensten of those tasks, each with its time.
    ids.push("roles", ...license, ...flexible, "days");
    if (!barOnly(a)) ids.push("parts");
  } else {
    ids.push("days");
    // Only a question on days with more than one shift; with one morning shift there is nothing to ask.
    if (daysWithChoice(a.days).length > 0) ids.push("parts");
    ids.push("dayroles", ...license, ...flexible);
  }
  // With one day the maximum is that day; no need to ask.
  if (chosenDays > 1) ids.push("max");
  // No reminder question: rooster and reminders go by WhatsApp to everyone.
  ids.push("contact", "check");
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
  const [a, setA] = useState<Answers>(emptyAnswers);
  const [at, setAt] = useState<StepId>("mode");
  /** Bezorgen was their only task and they have no licence and car: back to the task choice, with the other tasks named. */
  const [bounced, setBounced] = useState(false);
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
  /** Whether the confirmation mail went out; the thank-you page only promises a mail that was sent. */
  const [mailed, setMailed] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The agenda decides which days and dagdelen can be chosen; until it arrives the defaults show.
    backend
      .getSignupInfo()
      .then((info) => {
        applyAgenda(info.agenda);
        setCounts(info.counts);
      })
      .catch(() => setCounts(null));
  }, []);

  const roles = useMemo(() => toRoles(a), [a]);
  const chosenDays = countDays(roles);
  /** The maximum as it goes into the sheet: never more than the days they chose. */
  const maxShifts = Math.max(1, Math.min(a.maxShifts ?? chosenDays, chosenDays));

  const ids = stepIds(a, chosenDays);
  const index = Math.max(0, ids.indexOf(at));
  const current = ids[index];
  const first = firstName.trim().split(" ")[0];
  /** "Zet me maar in" and "Maakt niet uit" offer every task on their days, but no bezorgen without a licence. */
  const offered = (list: string[]) => rolesOnDays(list).filter((r) => !(r === "autokoerier" && a.driving === "nee"));
  /** Whether they may be put where it is busy: asked, or answered by how they signed up. */
  const flexibleNow = a.mode === "flexibel" || openToAll(a) || a.flexible === true;

  const days = seasonDays();
  const dayLabel = (key: string) => shortDay(days.find((d) => d.key === key)?.label ?? key);
  /** With a task in mind the days and moments are those of their tasks; otherwise of the whole season. */
  const byTask = a.mode === "taak";
  const scope = byTask ? a.roles : ACTIVE_ROLES;
  /** The days whose moments are asked: with a task every day (they see their diensten), else only days with a choice. */
  const partDays = byTask ? a.days : daysWithChoice(a.days);
  const momentLabel = (p: Part) => (byTask ? taskPartLabel[p] : partLabel[p]);

  /*
   * What Oma says per step, how the answer reads back, and her reaction to it. A reaction is only
   * there when it adds something (warmth after a choice, a promise she keeps); it opens her next message.
   */
  const copy: Record<StepId, { say: string[]; answer: () => string; react?: () => string | undefined }> = {
    mode: {
      // Opening: who she is (and that she is digital), what this is, how long; then straight to the first question.
      say: ["Hoi! Oma Coby hier, nou ja, mijn digitale versie. Een paar korte vragen en ik weet waar ik je kan gebruiken.", "Weet je al wanneer je kunt, of wat je wilt doen?"],
      answer: () => modeLabel[a.mode ?? "flexibel"],
      react: () => (a.mode === "flexibel" ? "Daar word ik blij van!" : undefined)
    },
    roles: {
      say: bounced ? [`Zonder rijbewijs én auto lukt bezorgen helaas niet. ${otherTasks(a)}`, "Wat zou je dan willen doen?"] : ["Wat zou je het liefst doen? Meer dan één mag."],
      answer: () => a.roles.map((r) => volunteerRoleLabel[r]).join(", "),
      react: () => (a.roles.includes("inpakken") ? "Lekker, de koffie staat klaar." : undefined)
    },
    license: {
      // We have no cars of our own: bezorgen takes both. Without them she points to the other tasks.
      say: ["Bezorgen doe je met je eigen auto, wij hebben zelf geen auto's. Heb je een rijbewijs én een auto?"],
      answer: () => (a.driving === "auto" ? "Ja, rijbewijs én auto" : "Nee, niet allebei"),
      react: () => (a.driving === "nee" ? "Geen probleem, dan laat ik bezorgen zitten." : undefined)
    },
    days: {
      say: [
        barOnly(a)
          ? "De Oliebollenbar staat op een paar evenementen en pick-ups. Bij elk zie je hoe laat ik je nodig heb, inclusief opbouwen en opruimen. Waar kun je bij zijn? Meer dan één mag: hoe meer, hoe liever."
          : byTask
            ? `${a.roles.length === 1 && a.roles[0] === "inpakken" ? `Inpakken doen we van ${until(SHIFT_TIMES.inpakken)} in Aalsmeer. ` : ""}Op welke dagen kun je?${a.roles.includes("oliebollenbar") ? " Bij de dagen met een evenement of pick-up van de Oliebollenbar staat dat erbij." : ""}`
            : a.mode === "dag"
              ? "Op welke dagen kun je?"
              : "Welke dagen ben je beschikbaar? Hoe meer dagen, hoe makkelijker ik je ergens kwijt kan."
      ],
      answer: () => listOrCount(a.days.map(dayLabel), "dagen"),
      react: () => (byTask && a.days.length >= 3 ? "Wat een toppertje." : undefined)
    },
    parts: {
      say: [
        byTask
          ? // One dienst, more on one day, or more days: the sentence follows what is on screen.
            `${a.days.reduce((n, d) => n + partsOnDay(d, scope).length, 0) === 1 ? "Dit is je dienst op die dag" : a.days.length === 1 ? "Dit zijn je diensten op die dag" : "Dit zijn je diensten op die dagen"}, met de tijd erbij. Alles staat aan; vink uit wat niet lukt.`
          : "Op een dag zijn er een paar momenten, elk met een eigen tijd. Alles staat aan; vink uit wat niet lukt."
      ],
      answer: () => {
        const chosen = partDays.filter((d) => (a.parts[d] ?? []).length > 0);
        const count = chosen.reduce((n, d) => n + (a.parts[d] ?? []).length, 0);
        if (chosen.length > 3) return `${count} ${byTask ? "diensten" : "momenten"} op ${chosen.length} dagen`;
        return chosen.map((d) => `${dayLabel(d)}: ${(a.parts[d] ?? []).map((p) => (byTask && (p === "ochtend" || p === "middag") ? `bezorgen ${p}` : momentLabel(p).toLowerCase())).join(" en ")}`).join(", ");
      }
    },
    dayroles: {
      say: bounced
        ? [`Zonder rijbewijs én auto lukt bezorgen helaas niet. ${otherTasks(a)}`, "Wat wil je dan doen?"]
        : a.mode === "dag"
          ? [a.days.length === 1 ? "En wat wil je die dag doen?" : "En wat wil je op die dagen doen?"]
          : ["Ik heb je bij alles ingevuld. Haal weg wat je niet kunt of wilt."],
      answer: () => (a.mode === "dag" && a.roles.length === offered(a.days).length ? "Maakt niet uit" : a.roles.map((r) => volunteerRoleLabel[r]).join(", "))
    },
    flexible: {
      // Names their task, so it is clear what "ergens anders" is measured against.
      say: [`Je hebt gekozen voor ${taskNames(a.roles)}. Als het bij een andere taak drukker is, mag ik je daar dan ook neerzetten?`],
      answer: () => (a.flexible ? "Ja, prima" : "Liever niet"),
      react: () => (a.flexible ? "Fijn!" : "Afspraak is afspraak.")
    },
    max: {
      // She counts for them: the number of days they ticked, so nobody has to count their own.
      say: [`Je kunt op ${chosenDays} dagen. Op hoeveel daarvan wil je helpen?`],
      answer: () => (maxShifts === chosenDays ? `Alle ${chosenDays}` : maxShiftsLabel(maxShifts)),
      react: () => (maxShifts === chosenDays ? "Jij bent een kanjer." : `Afgesproken, hooguit ${maxShiftsLabel(maxShifts)}.`)
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
    if (after.mode === "taak") {
      // Only days their tasks have, and per day the diensten of those tasks: all ticked until they untick one.
      const valid = seasonDays(after.roles).map((d) => d.key);
      after.days = after.days.filter((d) => valid.includes(d));
      after.parts = Object.fromEntries(
        after.days.map((d) => {
          const on = partsOnDay(d, after.roles);
          const had = after.parts[d];
          return [d, had ? on.filter((p) => had.includes(p)) : on];
        })
      );
    } else {
      // Days with more than one shift start with all of them ticked; untick what does not fit.
      const open = daysWithChoice(after.days).filter((d) => !after.parts[d]);
      if (open.length) after.parts = { ...after.parts, ...Object.fromEntries(open.map((d) => [d, partsOnDay(d)])) };
    }
    setA(after);
    setError(null);
    const list = stepIds(after, countDays(toRoles(after)));
    // No licence and bezorgen was their only task: back to choosing what they would like to do.
    if (after.roles.length === 0 && current === "license") {
      setBounced(true);
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

  /** Name, phone and e-mail are all required: rooster and reminders go by WhatsApp, the e-mail is the fallback and has to look real. */
  const contactErrors: Partial<Record<"firstName" | "lastName" | "phone" | "email" | "city", string>> = {};
  if (!firstName.trim()) contactErrors.firstName = "Vul je voornaam in.";
  if (!lastName.trim()) contactErrors.lastName = `Vul je achternaam in, dan verwar ik je niet met een andere ${first || "vrijwilliger"}.`;
  if (!phone.trim()) contactErrors.phone = "Vul je telefoonnummer in.";
  else if (phone.replace(/\D/g, "").length < 10) contactErrors.phone = "Vul een telefoonnummer van 10 cijfers in, zoals 06 12345678.";
  if (!email.trim()) contactErrors.email = "Vul je e-mailadres in.";
  else if (!EMAIL.test(email.trim())) contactErrors.email = "Dit e-mailadres klopt niet. Vul het in zoals naam@voorbeeld.nl.";
  // A domain that takes no mail ("gmial.nl") is surely wrong: then no mail of ours ever arrives.
  const emailCheck = useEmailCheck(email);
  if (!contactErrors.email && emailCheck.status === "missing") contactErrors.email = `Ik kan geen mail sturen naar ${emailCheck.domain}. Kijk het adres even na.`;
  // Woonplaats is needed for the planning (bezorgers near home); the list gives the right spelling.
  if (!city.trim()) contactErrors.city = "Vul je woonplaats in.";
  const contactOk = Object.keys(contactErrors).length === 0;
  /** Errors show once they press Verder, and then stay live while they fix them. */
  const [contactTried, setContactTried] = useState(false);
  const shownContact: typeof contactErrors = contactTried ? contactErrors : {};
  // "This domain takes no mail" shows at once, not only after pressing Verder.
  if (!shownContact.email && emailCheck.status === "missing") shownContact.email = contactErrors.email;

  const quietDayMarks = counts && labelQuietDays(counts) ? quietDays(counts) : [];

  /** The answer controls for each step, and whether "Verder" can be pressed (none: a quick reply answers). */
  /** Verder on the contact step: on to the check when all is filled in, else show what is missing and focus it. */
  function continueContact() {
    setContactTried(true);
    if (contactOk) {
      advance();
      return;
    }
    const firstMissing = (["firstName", "lastName", "phone", "email", "city"] as const).find((f) => contactErrors[f]);
    window.setTimeout(() => document.getElementById(`v-${firstMissing}`)?.focus(), 0);
  }

  function composer(id: StepId): { content: ReactNode; next?: { ready: boolean; label?: string; onNext?: () => void } } {
    switch (id) {
      case "mode":
        return {
          content: (
            <QuickReplies
              value={a.mode}
              // Another way in asks other things: start clean, so no days or moments linger from the first try.
              onPick={(mode) => advance({ mode, flexible: mode === "flexibel" ? true : a.flexible, ...(mode !== a.mode ? { roles: [], days: [], parts: {} } : {}) })}
              options={(["dag", "taak", "flexibel"] as const).map((m): [typeof m, string] => [m, modeLabel[m]])}
            />
          )
        };
      case "roles":
        return {
          // Other tasks, other diensten: every dienst of the new choice starts ticked again.
          content: <RolePicker roles={offeredRoles(a)} value={a.roles} onChange={(change) => setA((prev) => ({ ...prev, roles: change(prev.roles), parts: {} }))} />,
          next: { ready: a.roles.length > 0 }
        };
      case "license":
        return {
          content: (
            <QuickReplies
              value={a.driving}
              onPick={(driving) => advance({ driving, roles: driving === "nee" ? a.roles.filter((r) => r !== "autokoerier") : a.roles })}
              options={[
                ["auto", "Ja, rijbewijs én auto"],
                ["nee", "Nee, niet allebei"]
              ]}
            />
          )
        };
      case "days": {
        const list = seasonDays(scope);
        const events = barOnly(a);
        return {
          content: (
            <div className="grid gap-2">
              <ChipGrid
                // Only the bar: each event with its name and time. Otherwise plain days, with a note on days that have an event.
                columns={events ? "grid-cols-2 sm:grid-cols-3" : undefined}
                items={list.map((d) => ({
                  key: d.key,
                  label: shortDay(d.label),
                  sub: events ? eventOn(d.key) : scope.includes("oliebollenbar") && eventOn(d.key) ? "evenement" : undefined,
                  time: events ? partTimeOn(d.key, "evenement") : undefined,
                  mark: quietDayMarks.includes(d.key)
                }))}
                value={a.days}
                onChange={(change) =>
                  setA((prev) => {
                    const next = change(prev.days);
                    return { ...prev, days: list.map((d) => d.key).filter((k) => next.includes(k)), roles: prev.mode === "flexibel" ? [] : prev.roles };
                  })
                }
              />
              {list.some((d) => quietDayMarks.includes(d.key)) ? <MarkLegend /> : null}
            </div>
          ),
          next: { ready: a.days.length > 0 }
        };
      }
      case "parts": {
        const choice = partDays;
        // They chose the bar too, but none of their days has an event: say so, or the bar silently drops out.
        const noEvent = byTask && a.roles.includes("oliebollenbar") && !a.days.some((d) => eventOn(d));
        return {
          content: (
            <div className="grid gap-1.5">
              {choice.map((day) => (
                <div key={day} className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-2">
                  <span className="text-sm font-bold text-krent">{dayLabel(day)}</span>
                  <ChipGrid
                    columns="grid-cols-2 sm:grid-cols-4"
                    // Each moment with its start and end; an event also with its name.
                    items={partsOnDay(day, scope).map((p) => ({
                      key: p,
                      label: momentLabel(p),
                      sub: p === "evenement" ? eventOn(day) : byTask && (p === "ochtend" || p === "middag") ? partLabel[p].toLowerCase() : undefined,
                      time: partTimeOn(day, p)
                    }))}
                    value={a.parts[day] ?? []}
                    onChange={(change) =>
                      setA((prev) => {
                        const next = change(prev.parts[day] ?? []);
                        return { ...prev, parts: { ...prev.parts, [day]: partsOnDay(day, scope).filter((p) => next.includes(p)) } };
                      })
                    }
                  />
                </div>
              ))}
              {noEvent ? (
                <p className="text-xs text-muted">
                  Op deze dagen staat de Oliebollenbar nergens. Wil je daar ook helpen? Kies dan bij de vorige vraag een dag waar "evenement" bij staat.
                </p>
              ) : null}
              {byTask ? null : <p className="text-xs text-muted">Kun je op een dag toch niet? Haal die dag dan weg bij de vorige vraag.</p>}
            </div>
          ),
          // With a task in mind a dienst may be unticked as long as one is left; else every day keeps a moment.
          next: { ready: byTask ? chosenDays > 0 : choice.every((d) => (a.parts[d] ?? []).length > 0) }
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
      case "contact":
        return {
          content: (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="v-firstName" label="Voornaam *" value={firstName} onChange={setFirstName} autoComplete="given-name" autoFocus error={shownContact.firstName} />
                <Field id="v-lastName" label="Achternaam *" value={lastName} onChange={setLastName} autoComplete="family-name" error={shownContact.lastName} />
                <Field
                  id="v-phone"
                  label="Telefoonnummer *"
                  value={phone}
                  onChange={setPhone}
                  type="tel"
                  autoComplete="tel"
                  error={shownContact.phone}
                  hint="Hier stuur ik via WhatsApp je rooster en je herinneringen."
                />
                <Field
                  id="v-email"
                  label="E-mailadres *"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  autoComplete="email"
                  error={shownContact.email}
                  hint="Hier stuur ik je bevestiging naartoe."
                  extra={
                    emailCheck.suggestion ? (
                      <span className="text-xs text-krent">
                        Bedoel je{" "}
                        <button type="button" className="font-bold underline decoration-lijn-2 underline-offset-2 hover:decoration-krent" onClick={() => setEmail(emailCheck.suggestion ?? email)}>
                          {emailCheck.suggestion}
                        </button>
                        ?
                      </span>
                    ) : null
                  }
                />
                <div className="grid content-start gap-1 text-sm">
                  <label htmlFor="v-city" className={fieldLabel}>
                    Woonplaats *
                  </label>
                  <CitySearch id="v-city" value={city} onChange={setCity} invalid={!!shownContact.city} describedBy="v-city-note" />
                  {shownContact.city ? (
                    <span id="v-city-note" className="text-xs font-bold text-feest-ink">
                      ! {shownContact.city}
                    </span>
                  ) : (
                    <span id="v-city-note" className="text-xs text-muted">
                      Kies je woonplaats uit de lijst, dan staat hij goed gespeld.
                    </span>
                  )}
                </div>
                {roles.autokoerier.wants ? (
                  <div className="grid gap-1 text-sm sm:col-span-2">
                    <label htmlFor="v-address" className={fieldLabel}>
                      Adres
                    </label>
                    {/* Picking an address from the list also fills in the woonplaats. */}
                    <AddressSearch
                      id="v-address"
                      value={address}
                      onChange={setAddress}
                      onPick={(found) => {
                        setAddress(found.street);
                        if (found.city) setCity(found.city);
                      }}
                      describedBy="v-address-note"
                      listLabel="Adressen"
                    />
                    <span id="v-address-note" className="text-xs text-muted">
                      Handig voor bezorgers: dan plan ik een route bij jou in de buurt.
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ),
          // Always pressable: pressing Verder with something missing shows what to fix, field by field.
          next: { ready: true, onNext: continueContact }
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
                  <dt className="font-bold text-krent">WhatsApp</dt>
                  <dd className="text-krent">
                    {phone.trim()} <span className="text-muted">(hier komen je rooster en je herinneringen)</span>
                  </dd>
                </div>
                <div className="grid gap-0.5 sm:grid-cols-[130px_minmax(0,1fr)]">
                  <dt className="font-bold text-krent">E-mail</dt>
                  <dd className="break-all text-krent">
                    {email.trim()} <span className="text-muted">(hier komt je bevestiging)</span>
                  </dd>
                </div>
                <div className="grid gap-0.5 sm:grid-cols-[130px_minmax(0,1fr)]">
                  <dt className="font-bold text-krent">Planning</dt>
                  <dd className="text-krent">
                    {flexibleNow ? "Mag ingedeeld worden waar het nodig is" : "Alleen wat ik koos"} · maximaal {maxShiftsLabel(maxShifts)}
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
                Vind je het oké als Oma Coby je gegevens in haar notitieboekje bijhoudt? Na de actie gooit ze ze weg.
              </label>
            </div>
          )
        };
      }
    }
  }

  const view = composer(current);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // Enter in a text field means "Verder" until the last step.
    if (current !== "check") {
      if (view.next?.ready) (view.next.onNext ?? advance)();
      return;
    }
    if (!a.mode || (a.flexible === null && !flexibleNow)) return;
    if (!contactOk) {
      goTo("contact");
      setContactTried(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await backend.registerVolunteer({
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
          flexible: flexibleNow,
          maxShifts,
          driving: roles.autokoerier.wants && a.driving && a.driving !== "nee" ? a.driving : undefined
        }
      });
      setMailed(saved.mailed);
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
          <p className="text-krent">Fijn dat je wilt helpen. Je zit nu officieel in mijn team. Zodra ik weet hoeveel bestellingen er zijn, maak ik het rooster en laat ik je weten waar en wanneer ik je verwacht.</p>
          <p className="text-sm text-krent">Je rooster en je herinneringen stuur ik vooral via WhatsApp, op {phone.trim()}. Houd je telefoon dus in de gaten.</p>
          {mailed ? <p className="text-sm text-krent">Wat je hebt doorgegeven staat in de mail die ik je net stuurde, op {email.trim()}. Niets gezien? Kijk dan even bij je spam.</p> : null}
          <p className="text-sm text-muted">
            Vragen of iets wijzigen? Mail naar{" "}
            <a className={textAction} href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <p className="text-xs text-muted">Samen laten we ouderen rock 'n rollen!</p>
        </div>
      </section>
    );
  }

  return (
    <form className="grid gap-6" onSubmit={submit}>
      <div className="grid gap-0.5">
        <p className={fieldLabel}>Vrijwilligers gezocht</p>
        <h1 className="font-display text-[34px] uppercase leading-none tracking-wide text-krent">
          Help je <span className="text-feest">mee</span>?
        </h1>
      </div>

      <div className="grid gap-6" role="log" aria-live="polite" aria-label="Gesprek met Oma Coby">
        {/* The conversation so far. */}
        {ids.slice(0, index).map((id, k) => (
          <div key={id} className="grid gap-3">
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
                  <button type="button" className={primaryButton} disabled={!view.next.ready} onClick={() => (view.next?.onNext ?? advance)()}>
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
      <img src={omaAvatarUrl} alt="" className="h-9 w-9 flex-none object-contain" />
      <div className="grid max-w-[85%] justify-items-start gap-2">
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
  items: Array<{ key: string; label: string; sub?: string; time?: string; mark?: boolean }>;
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
            {item.time ? <span className={`block text-[11px] font-bold tabular-nums ${on ? "text-meel" : "text-krent"}`}>{item.time}</span> : null}
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

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  autoFocus,
  error,
  hint,
  extra
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  autoFocus?: boolean;
  error?: string;
  hint?: string;
  /** Below the hint or error, e.g. "Bedoel je …?" under the e-mail address. */
  extra?: ReactNode;
}) {
  const note = id ? `${id}-note` : undefined;
  return (
    // content-start: a message under the field next to it must not stretch this one.
    <label className="grid content-start gap-1 text-sm">
      <span className={fieldLabel}>{label}</span>
      <input
        id={id}
        className={`${inputClass} ${error ? "border-feest" : ""}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? note : undefined}
      />
      {error ? (
        <span id={note} className="text-xs font-bold text-feest-ink">
          ! {error}
        </span>
      ) : hint ? (
        <span id={note} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      {extra}
    </label>
  );
}
