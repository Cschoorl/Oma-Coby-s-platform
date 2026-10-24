import type { SignupCounts } from "../../data/backend";
import type { MaxShifts, ReminderChannel, RoleAvailability, SignupMode, VolunteerRole } from "../../types/dashboard";
import { VOLUNTEER_ROLES } from "../../types/dashboard";
import { SIGNUP_OPTIONS } from "../../config";
import { countFor, dayKey, staffingStatus, targetFor } from "../../utils/staffing";

/*
 * Logic of the step-by-step signup. The answers end up in the same shape as the old form
 * (per task: wants + options), so the sheet, the staffing counts and the agenda keep working.
 */

export type Part = "ochtend" | "middag" | "avond";
const PART_ORDER: Part[] = ["ochtend", "middag", "avond"];

export interface Answers {
  mode: SignupMode | null;
  /** Taak: the tasks they want. Dag and flexibel: the tasks they are open to. */
  roles: VolunteerRole[];
  /** Taak: the options they picked per task, exactly as in the form. */
  picks: Record<VolunteerRole, string[]>;
  /** Dag and flexibel: the days they can, as day keys ("15 december"). */
  days: string[];
  /** Dag and flexibel: the dagdelen they can; only asked when the chosen days have dagdelen. */
  parts: Part[];
  cargoBike: boolean;
  flexible: boolean | null;
  maxShifts: MaxShifts | null;
  reminder: ReminderChannel | null;
}

export const emptyAnswers = (): Answers => ({
  mode: null,
  roles: [],
  picks: { inpakken: [], fietskoerier: [], autokoerier: [], oliebollenbar: [] },
  days: [],
  parts: [],
  cargoBike: false,
  flexible: null,
  maxShifts: null,
  reminder: null
});

/** "Vrijdag 18 december: middag" → "middag"; whole-day options give "". */
export function optionPart(option: string): Part | "" {
  const match = option.match(/:\s*(ochtend|middag|avond)/i);
  return match ? (match[1].toLowerCase() as Part) : "";
}

export interface SeasonDay {
  key: string;
  /** "Dinsdag 15 december". */
  label: string;
  /** "di". */
  weekday: string;
}

/** All days that have at least one option, in agenda order, for the given tasks (default: all). */
export function seasonDays(roles: VolunteerRole[] = VOLUNTEER_ROLES): SeasonDay[] {
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

/** Tasks that have at least one option on any of these days. */
export function rolesOnDays(days: string[]): VolunteerRole[] {
  return VOLUNTEER_ROLES.filter((role) => SIGNUP_OPTIONS[role].some((o) => days.includes(dayKey(o))));
}

/** Dagdelen that occur on these days for these tasks; empty when everything is a whole day. */
export function partsOn(days: string[], roles: VolunteerRole[] = VOLUNTEER_ROLES): Part[] {
  const found = new Set<Part>();
  for (const role of roles) {
    for (const option of SIGNUP_OPTIONS[role]) {
      const part = optionPart(option);
      if (part && days.includes(dayKey(option))) found.add(part);
    }
  }
  return PART_ORDER.filter((p) => found.has(p));
}

/** The options of a task that fall on the chosen days and dagdelen. Whole-day options always fit. */
export function optionsFor(role: VolunteerRole, days: string[], parts: Part[]): string[] {
  return SIGNUP_OPTIONS[role].filter((o) => {
    if (!days.includes(dayKey(o))) return false;
    const part = optionPart(o);
    return part === "" || parts.length === 0 || parts.includes(part);
  });
}

/** The answers in the shape of the old form: per task whether they want it and on which options. */
export function toRoles(a: Answers): Record<VolunteerRole, RoleAvailability> {
  const result = {} as Record<VolunteerRole, RoleAvailability>;
  for (const role of VOLUNTEER_ROLES) {
    const days = !a.roles.includes(role) ? [] : a.mode === "taak" ? a.picks[role] : optionsFor(role, a.days, a.parts);
    result[role] = { wants: days.length > 0, days };
  }
  return result;
}

/** People still missing on a day, summed over all tasks and dagdelen. */
export function dayShortfall(counts: SignupCounts, day: string): number {
  let missing = 0;
  for (const role of VOLUNTEER_ROLES) {
    for (const option of SIGNUP_OPTIONS[role]) {
      if (dayKey(option) !== day) continue;
      missing += Math.max(0, targetFor(role, option) - countFor(counts, role, option));
    }
  }
  return missing;
}

/** Days where at least one task has "weinig" people. */
export function quietDays(counts: SignupCounts): string[] {
  return seasonDays()
    .map((d) => d.key)
    .filter((day) =>
      VOLUNTEER_ROLES.some((role) =>
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
