import type { SignupCounts } from "../data/backend";
import type { Volunteer, VolunteerRole } from "../types/dashboard";
import { VOLUNTEER_ROLES } from "../types/dashboard";
import { OPTION_TARGETS, SIGNUP_OPTIONS, STAFFING_TARGETS } from "../config";

export type StaffingStatus = "weinig" | "bijna" | "genoeg";

export const statusLabel: Record<StaffingStatus, string> = { weinig: "Weinig", bijna: "Bijna", genoeg: "Genoeg" };

export function optionKey(option: string): string {
  return option.trim().toLowerCase();
}

/** "Maandag 21 december: ochtend" → "21 december". */
export function dayKey(option: string): string {
  const match = option.toLowerCase().match(/(\d{1,2})\s+([a-zà-ÿ]+)/);
  return match ? `${Number(match[1])} ${match[2]}` : optionKey(option);
}

/** People needed for one option: from the agenda when set, else the default for the task. */
export function targetFor(role: VolunteerRole, option: string): number {
  return OPTION_TARGETS[optionKey(option)] ?? STAFFING_TARGETS[role];
}

export function staffingStatus(count: number, target: number): StaffingStatus {
  if (count < target / 2) return "weinig";
  if (count < target) return "bijna";
  return "genoeg";
}

/** Same counting as the Apps Script `signupStats`: signups per role per form option, no names. */
export function countSignups(volunteers: Volunteer[]): SignupCounts {
  const counts = { inpakken: {}, fietskoerier: {}, autokoerier: {}, oliebollenbar: {} } as SignupCounts;
  for (const v of volunteers) {
    for (const role of VOLUNTEER_ROLES) {
      if (!v.roles[role].wants) continue;
      for (const option of v.roles[role].days) counts[role][optionKey(option)] = (counts[role][optionKey(option)] ?? 0) + 1;
    }
  }
  return counts;
}

export function countFor(counts: SignupCounts, role: VolunteerRole, option: string): number {
  return counts[role]?.[optionKey(option)] ?? 0;
}

/** Options of this season that are short of people, emptiest first. */
export function shortOptions(counts: SignupCounts, role: VolunteerRole, statuses: StaffingStatus[] = ["weinig"]): string[] {
  return SIGNUP_OPTIONS[role]
    .map((option) => ({ option, count: countFor(counts, role, option) }))
    .filter(({ option, count }) => statuses.includes(staffingStatus(count, targetFor(role, option))))
    .sort((a, b) => a.count - b.count)
    .map(({ option }) => option);
}

export interface DayStaffing {
  role: VolunteerRole;
  /** One entry per dagdeel ("ochtend"/"middag"/"avond"), a single entry for a whole day. */
  parts: Array<{ option: string; label: string; count: number; target: number; status: StaffingStatus }>;
}

/** Staffing per role for one season day, built from the form options of that day. */
export function staffingForDay(counts: SignupCounts, day: string): DayStaffing[] {
  return VOLUNTEER_ROLES.map((role) => {
    const options = SIGNUP_OPTIONS[role].filter((o) => dayKey(o) === day);
    return {
      role,
      parts: options.map((o) => {
        const count = countFor(counts, role, o);
        const part = o.match(/:\s*(ochtend|middag|avond)/i)?.[1] ?? "";
        const target = targetFor(role, o);
        return { option: o, label: part, count, target, status: staffingStatus(count, target) };
      })
    };
  }).filter((d) => d.parts.length > 0);
}

const MONTH_NAMES = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** Day number within the season (January after December), for "how close are two options". */
function seasonDayNumber(option: string): number {
  const [d, m] = dayKey(option).split(" ");
  const month = MONTH_NAMES.indexOf(m);
  if (month === -1) return 0;
  return (month < 6 ? month + 12 : month) * 31 + Number(d);
}

/**
 * Quiet options to suggest to someone who picked `chosen`: emptiest first, and among equally
 * quiet ones the moments closest to the days they already picked (same day first).
 */
export function suggestOptions(counts: SignupCounts, role: VolunteerRole, chosen: string[], limit = 2): string[] {
  const picked = chosen.map(seasonDayNumber);
  const distance = (o: string) => (picked.length ? Math.min(...picked.map((p) => Math.abs(p - seasonDayNumber(o)))) : 0);
  return shortOptions(counts, role)
    .filter((o) => !chosen.includes(o))
    .map((o) => ({ o, count: countFor(counts, role, o), dist: distance(o) }))
    .sort((a, b) => a.count - b.count || a.dist - b.dist)
    .slice(0, limit)
    .map((x) => x.o);
}

/** Labelling every option "nog nodig" says nothing; only label when quiet moments are the exception. */
export function labelQuietOptions(counts: SignupCounts, role: VolunteerRole): boolean {
  return shortOptions(counts, role).length <= SIGNUP_OPTIONS[role].length / 2;
}
