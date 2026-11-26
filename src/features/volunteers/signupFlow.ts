import type { SignupCounts } from "../../data/backend";
import type { Driving, RoleAvailability, SignupMode, VolunteerRole } from "../../types/dashboard";
import { ACTIVE_ROLES, VOLUNTEER_ROLES } from "../../types/dashboard";
import { SIGNUP_OPTIONS, optionTime } from "../../config";
import { countFor, dayKey, staffingStatus, targetFor } from "../../utils/staffing";

/*
 * Logic of the step-by-step signup. The answers end up in the same shape as the old form
 * (per task: wants + options), so the sheet, the staffing counts and the agenda keep working.
 */

/**
 * The moments of a day, each with its own time (from the task that has it): vroeg = inpakken (7:00–9:30),
 * ochtend and middag = bezorgen (9:00–12:30, 12:30–15:00), evenement = the Oliebollenbar on its event days.
 * "Dag" and "flexibel" choose these per day; a task only counts on a moment they ticked.
 */
export type Part = "vroeg" | "ochtend" | "middag" | "evenement" | "avond";
const PART_ORDER: Part[] = ["vroeg", "ochtend", "middag", "evenement", "avond"];

export interface Answers {
  mode: SignupMode | null;
  /** Taak: the tasks they want. Dag and flexibel: the tasks they are open to. */
  roles: VolunteerRole[];
  /** The days they can, as day keys ("15 december"). Asked once, whatever the way in. */
  days: string[];
  /**
   * Per day the moments they can. Taak: the moments of their tasks on that day (their "diensten").
   * Dag and flexibel: only asked when a chosen day has more than one. A day without an entry means the whole day.
   */
  parts: Record<string, Part[]>;
  flexible: boolean | null;
  maxShifts: number | null;
  /** Asked when they want to bezorgen: licence and own car ("auto"), or "nee", which takes autokoerier off their tasks. */
  driving: Driving | "nee" | null;
}

export const emptyAnswers = (): Answers => ({
  mode: null,
  roles: [],
  days: [],
  parts: {},
  flexible: null,
  maxShifts: null,
  driving: null
});

/** "Vrijdag 18 december: middag" → "middag"; whole-day options give "". */
export function optionPart(option: string): Part | "" {
  const match = option.match(/:\s*(ochtend|middag|avond)/i);
  return match ? (match[1].toLowerCase() as Part) : "";
}

/** The moment an option of a task falls in: inpakken is always vroeg, the bar always its event, bezorgen its dagdeel. */
export function partOf(role: VolunteerRole, option: string): Part | "" {
  if (role === "inpakken") return "vroeg";
  if (role === "oliebollenbar") return "evenement";
  return optionPart(option);
}

/** The option behind one moment on one day, for its time and (at an event) its name. */
function optionAt(day: string, part: Part): { role: VolunteerRole; option: string } | null {
  for (const role of ACTIVE_ROLES) {
    const option = SIGNUP_OPTIONS[role].find((o) => dayKey(o) === day && partOf(role, o) === part);
    if (option) return { role, option };
  }
  return null;
}

/** "7:00–9:30": when this moment on this day starts and ends. */
export function partTimeOn(day: string, part: Part): string {
  const at = optionAt(day, part);
  return at ? optionTime(at.role, at.option) : "";
}

/** "Olieborrel, Het Amstelhuis": the event on this day, for the evenement moment. */
export function eventOn(day: string): string {
  return optionAt(day, "evenement")?.option.match(/\(([^)]+)\)/)?.[1] ?? "";
}

export interface SeasonDay {
  key: string;
  /** "Dinsdag 15 december". */
  label: string;
  /** "di". */
  weekday: string;
}

/** All days that have at least one option, in season order, for the given tasks (default: this season's). */
export function seasonDays(roles: VolunteerRole[] = ACTIVE_ROLES): SeasonDay[] {
  const seen = new Map<string, SeasonDay>();
  for (const role of VOLUNTEER_ROLES) {
    if (!roles.includes(role)) continue;
    for (const option of SIGNUP_OPTIONS[role]) {
      const key = dayKey(option);
      if (seen.has(key)) continue;
      const label = option.split(/[:(]/)[0].trim();
      seen.set(key, { key, label, weekday: label.slice(0, 2).toLowerCase() });
    }
  }
  // The agenda is sorted per task; merge the tasks back into one season order.
  return [...seen.values()].sort((a, b) => seasonNumber(a.key) - seasonNumber(b.key));
}

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** "15 december" → a number that sorts the season (January after December). */
function seasonNumber(key: string): number {
  const [d, m] = key.split(" ");
  const month = MONTHS.indexOf(m);
  return (month < 6 ? month + 12 : month) * 31 + Number(d);
}

/** This season's tasks that have at least one option on any of these days. */
export function rolesOnDays(days: string[]): VolunteerRole[] {
  return ACTIVE_ROLES.filter((role) => SIGNUP_OPTIONS[role].some((o) => days.includes(dayKey(o))));
}

/** The moments on one day, over this season's tasks (or only the given ones). */
export function partsOnDay(day: string, roles: VolunteerRole[] = ACTIVE_ROLES): Part[] {
  const found = new Set<Part>();
  for (const role of ACTIVE_ROLES) {
    if (!roles.includes(role)) continue;
    for (const option of SIGNUP_OPTIONS[role]) {
      const part = partOf(role, option);
      if (part && dayKey(option) === day) found.add(part);
    }
  }
  return PART_ORDER.filter((p) => found.has(p));
}

/** Days among these where there is a dagdeel to choose; with one shift a day there is nothing to ask. */
export function daysWithChoice(days: string[]): string[] {
  return days.filter((d) => partsOnDay(d).length > 1);
}

/** The options of a task on the chosen days and, per day, the chosen moments. A day with one moment needs no choice. */
export function optionsFor(role: VolunteerRole, days: string[], parts: Record<string, Part[]>): string[] {
  return SIGNUP_OPTIONS[role].filter((o) => {
    const day = dayKey(o);
    if (!days.includes(day)) return false;
    const part = partOf(role, o);
    const chosen = parts[day];
    return part === "" || !chosen || chosen.includes(part);
  });
}

/** The answers in the shape of the old form: per task whether they want it and on which options. */
export function toRoles(a: Answers): Record<VolunteerRole, RoleAvailability> {
  const result = {} as Record<VolunteerRole, RoleAvailability>;
  for (const role of VOLUNTEER_ROLES) {
    const days = a.roles.includes(role) ? optionsFor(role, a.days, a.parts) : [];
    result[role] = { wants: days.length > 0, days };
  }
  return result;
}

/** Days where at least one task has "weinig" people. */
export function quietDays(counts: SignupCounts): string[] {
  return seasonDays()
    .map((d) => d.key)
    .filter((day) =>
      ACTIVE_ROLES.some((role) =>
        SIGNUP_OPTIONS[role].some((o) => dayKey(o) === day && staffingStatus(countFor(counts, role, o), targetFor(role, o)) === "weinig")
      )
    );
}

/** As with the options: "nog nodig" on every day says nothing, so only label when quiet days are the exception. */
export function labelQuietDays(counts: SignupCounts): boolean {
  return quietDays(counts).length <= seasonDays().length / 2;
}

/**
 * For "maakt niet uit": the moments within their availability where we need people most,
 * emptiest first. Shown as "hier help je het meest", not as a choice they have to make.
 */
export function neediestFor(counts: SignupCounts, a: Answers, limit = 3): Array<{ role: VolunteerRole; option: string; missing: number }> {
  return a.roles
    .flatMap((role) => optionsFor(role, a.days, a.parts).map((option) => ({ role, option, missing: targetFor(role, option) - countFor(counts, role, option) })))
    .filter((x) => x.missing > 0)
    .sort((x, y) => y.missing - x.missing)
    .slice(0, limit);
}
