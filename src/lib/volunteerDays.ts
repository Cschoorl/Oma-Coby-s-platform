import { SEASON_YEAR, SIGNUP_OPTIONS, isoDayLabel } from "../config";
import type { SignupCounts } from "../data/backend";
import type { Volunteer, VolunteerRole } from "../types/dashboard";

/*
 * Repairs the days of a signup as they come back from the Sheet. Two things go wrong there:
 *
 * 1. One single day ("Woensdag 9 december") is a date to Google Sheets, so it comes back as
 *    "2026-12-09 00:00:00" and the planning showed it as a column "20 NaN".
 * 2. The days are joined with commas, but an event of the Oliebollenbar has a comma of its own
 *    ("Woensdag 9 december (Olieborrel, Het Amstelhuis)") and came back in two halves.
 *
 * A newer Apps Script no longer does either; this keeps older rows and an older script right.
 */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})(?:[ T]|$)/;

/** "2026-12-09 00:00:00" → "Woensdag 9 december". Sheets guesses the year, so the season decides it: January is next year. */
function dateToLabel(day: string): string {
  const match = day.match(ISO_DAY);
  if (!match) return day;
  const month = Number(match[2]);
  const year = month < 7 ? SEASON_YEAR + 1 : SEASON_YEAR;
  return isoDayLabel(`${year}-${match[2]}-${match[3]}`);
}

/** The days of one task, whole again: halves of an event joined, dates back to day labels. */
export function repairDays(days: string[]): string[] {
  const out: string[] = [];
  let open = "";
  for (const piece of days) {
    const text = open ? `${open}, ${piece}` : piece;
    // An opening bracket without its closing one: the rest of the event name is in the next piece.
    if (text.includes("(") && !text.includes(")")) {
      open = text;
      continue;
    }
    open = "";
    out.push(dateToLabel(text.trim()));
  }
  if (open) out.push(open);
  return out;
}

export function repairVolunteer(v: Volunteer): Volunteer {
  const roles = { ...v.roles };
  for (const role of Object.keys(roles) as VolunteerRole[]) roles[role] = { ...roles[role], days: repairDays(roles[role].days ?? []) };
  return { ...v, roles };
}

/** The same repair for the counts on the public signup page, which are keyed by the option in lower case. */
export function repairCounts(counts: SignupCounts): SignupCounts {
  const out = {} as SignupCounts;
  for (const role of Object.keys(counts) as VolunteerRole[]) {
    out[role] = {};
    for (const [key, count] of Object.entries(counts[role] ?? {})) {
      let fixed = dateToLabel(key).toLowerCase();
      if (fixed.includes("(") && !fixed.includes(")")) {
        // The first half of an event: count it for the event it belongs to. Its second half is dropped below.
        fixed = SIGNUP_OPTIONS[role]?.find((o) => o.toLowerCase().startsWith(`${fixed},`))?.toLowerCase() ?? fixed;
      } else if (fixed.includes(")") && !fixed.includes("(")) {
        continue;
      }
      out[role][fixed] = (out[role][fixed] ?? 0) + count;
    }
  }
  return out;
}
