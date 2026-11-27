import type { AgendaSlot, RosterShift, RosterShiftInput, Volunteer, VolunteerRole } from "../../types/dashboard";
import { ACTIVE_ROLES, VOLUNTEER_ROLES } from "../../types/dashboard";
import { BAR_EVENTS, SEASON_WORKDAYS, SIGNUP_OPTIONS, STAFFING_TARGETS, isoDayLabel } from "../../config";
import { dayKey } from "../../utils/staffing";
import { toSlot } from "../volunteers/availability";

/*
 * The rooster: per day the shifts (lanes), how many people each needs, who is planned and who could.
 * Availability comes from the signup answers and is only read here through `canDo`, so another shape
 * of those answers is one change in this file. Planned shifts live in state.roster (tab Rooster).
 */

export interface RosterDay {
  /** "2026-12-07" */
  iso: string;
  /** "Maandag 7 december" */
  label: string;
  /** "ma" */
  weekday: string;
  day: number;
  month: string;
  /** Name of the Oliebollenbar event on this day, when there is one. */
  event: string;
}

function toDay(iso: string): RosterDay {
  const label = isoDayLabel(iso);
  const [weekday, day, month] = label.split(" ");
  return { iso, label, weekday: weekday.slice(0, 2).toLowerCase(), day: Number(day), month, event: BAR_EVENTS.find((e) => e.date === iso)?.name ?? "" };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The season days, the event days of the bar (also in a weekend) and any other day with a planned shift. */
export function rosterDays(roster: RosterShift[]): RosterDay[] {
  const all = new Set([...SEASON_WORKDAYS, ...BAR_EVENTS.map((e) => e.date), ...roster.map((r) => r.date).filter((d) => ISO.test(d))]);
  return [...all].sort().map(toDay);
}

export interface Week {
  /** The Monday, "2026-12-07". */
  key: string;
  /** "7–11 dec" */
  label: string;
  days: RosterDay[];
}

function mondayOf(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function weeksOf(days: RosterDay[]): Week[] {
  const weeks: Week[] = [];
  for (const day of days) {
    const key = mondayOf(day.iso);
    const week = weeks[weeks.length - 1]?.key === key ? weeks[weeks.length - 1] : weeks[weeks.push({ key, label: "", days: [] }) - 1];
    week.days.push(day);
  }
  for (const week of weeks) {
    const first = week.days[0];
    const last = week.days[week.days.length - 1];
    const month = (d: RosterDay) => d.month.slice(0, 3);
    week.label = first.month === last.month ? `${first.day}–${last.day} ${month(last)}` : `${first.day} ${month(first)}–${last.day} ${month(last)}`;
  }
  return weeks;
}

/** One shift on one day: a task, a dagdeel, its standard times and how many people it needs. */
export interface Lane {
  /** date|role|part, the same for a planned shift on this lane (see laneKey). */
  key: string;
  date: string;
  role: VolunteerRole;
  part: string;
  /** The signup option this lane stands for; "" for a lane that only exists because someone is planned on it. */
  option: string;
  start: string;
  end: string;
  /** Event of the Oliebollenbar. */
  location: string;
  needed: number;
}

export const laneKey = (x: { date: string; role: VolunteerRole; part: string }) => `${x.date}|${x.role}|${x.part}`;

export function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** How many people a shift needs: what Beheer set (column "nodig" of the tab Agenda), else the default for the task. */
export function neededFor(agenda: AgendaSlot[], date: string, role: VolunteerRole, part: string): number {
  // The last matching row decides, like the script, which fills every row of that moment.
  for (let i = agenda.length - 1; i >= 0; i--) {
    const a = agenda[i];
    if (a.date === date && a.role === role && (a.part || "") === part && a.needed != null) return a.needed;
  }
  return STAFFING_TARGETS[role];
}

/** The shifts of one day in the order of the clock. */
export function lanesOn(date: string, agenda: AgendaSlot[], roster: RosterShift[]): Lane[] {
  const day = dayKey(isoDayLabel(date));
  const lanes: Lane[] = ACTIVE_ROLES.flatMap((role) =>
    SIGNUP_OPTIONS[role]
      .filter((option) => dayKey(option) === day)
      .map((option) => {
        const slot = toSlot(role, option);
        const [start = "9:00", end = "12:00"] = slot.time ? slot.time.split(/\s*[–-]\s*/) : [];
        return { key: laneKey({ date, role, part: slot.part }), date, role, part: slot.part, option, start, end, location: slot.location, needed: neededFor(agenda, date, role, slot.part) };
      })
  );
  // A shift planned outside the standard ones (typed into the Sheet, or a task of an earlier year) still shows.
  for (const shift of roster) {
    if (shift.date !== date || lanes.some((l) => l.key === laneKey(shift))) continue;
    lanes.push({ key: laneKey(shift), date, role: shift.role, part: shift.part, option: "", start: shift.start, end: shift.end, location: shift.location, needed: 0 });
  }
  return lanes.sort((a, b) => minutes(a.start) - minutes(b.start) || VOLUNTEER_ROLES.indexOf(a.role) - VOLUNTEER_ROLES.indexOf(b.role));
}

/** Short names for a shift: "Bezorgen" reads better than "Autokoerier" in a narrow column. */
export const LANE_NAMES: Record<VolunteerRole, string> = { inpakken: "Inpakken", fietskoerier: "Fiets", autokoerier: "Bezorgen", oliebollenbar: "Bar" };

/** "Inpakken", "Bezorgen ochtend", "Bar". */
export function laneLabel(lane: { role: VolunteerRole; part: string }): string {
  return `${LANE_NAMES[lane.role]}${lane.part ? ` ${lane.part}` : ""}`;
}

/** "7:00" + "9:30" → "7–9:30": fits a narrow column. */
export function timeRange(start: string, end: string): string {
  return `${start}–${end}`.replace(/:00/g, "");
}

export const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** One entry per person: someone who signed up twice counts once, with the days of both signups. */
export function people(volunteers: Volunteer[]): Volunteer[] {
  const byName = new Map<string, Volunteer>();
  for (const v of volunteers) {
    const known = byName.get(nameKey(v.name));
    if (!known) {
      byName.set(nameKey(v.name), v);
      continue;
    }
    const roles = { ...known.roles };
    for (const role of VOLUNTEER_ROLES) {
      roles[role] = { wants: known.roles[role].wants || v.roles[role].wants, days: [...new Set([...known.roles[role].days, ...v.roles[role].days])] };
    }
    // The later signup has the latest contact details and planning answers.
    byName.set(nameKey(v.name), { ...known, ...v, id: known.id, roles });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

/** Did this person sign up for this shift? The one place that reads the availability from the signup answers. */
export function canDo(v: Volunteer, lane: Lane): boolean {
  if (!lane.option || !v.roles[lane.role].wants) return false;
  const day = dayKey(lane.option);
  return v.roles[lane.role].days.some((option) => {
    if (dayKey(option) !== day) return false;
    // An answer without a dagdeel (the old form) counts for every dagdeel of that day.
    const part = toSlot(lane.role, option).part;
    return !part || !lane.part || part === lane.part;
  });
}

export const shiftsOf = (roster: RosterShift[], name: string) => roster.filter((r) => nameKey(r.name) === nameKey(name));

/** On how many days someone is planned; two shifts on one day count once, like their own maximum. */
export function plannedDays(roster: RosterShift[], name: string): number {
  return new Set(shiftsOf(roster, name).map((r) => r.date)).size;
}

/**
 * What the planner may want to know about a planned shift. Hints, never a block: the planner decides.
 * `person` is undefined when the name is not among the signups.
 */
export function hintsFor(shift: RosterShift, person: Volunteer | undefined, lane: Lane | undefined, roster: RosterShift[], dayLanes: Lane[] = []): string[] {
  const hints: string[] = [];
  // Who said "put me where you need me" and can that day may stand on another shift without a remark.
  // Bezorgen is the exception: that takes a car of their own.
  const flexibleToday = person?.planning?.flexible && dayLanes.some((l) => canDo(person, l)) && (shift.role !== "autokoerier" || person.planning.driving === "auto");
  if (!person) hints.push("staat niet bij de aanmeldingen");
  else if (lane && !canDo(person, lane) && !flexibleToday) hints.push("niet opgegeven voor deze dienst");
  if (person && shift.role === "autokoerier" && person.planning?.driving === "rijbewijs") hints.push("heeft geen eigen auto");
  for (const other of shiftsOf(roster, shift.name)) {
    if (other.id === shift.id || other.date !== shift.date) continue;
    if (minutes(other.start) < minutes(shift.end) && minutes(shift.start) < minutes(other.end)) hints.push(`staat ook op ${laneLabel(other).toLowerCase()} ${timeRange(other.start, other.end)}`);
  }
  const max = person?.planning?.maxShifts ?? 0;
  const planned = plannedDays(roster, shift.name);
  if (max && planned > max) hints.push(`wil hooguit ${max} ${max === 1 ? "dag" : "dagen"}, staat nu op ${planned}`);
  return hints;
}

function newId(): string {
  return `R${Math.random().toString(36).slice(2, 10)}`;
}

export function newShift(lane: Lane, name: string): RosterShiftInput {
  return { id: newId(), date: lane.date, role: lane.role, part: lane.part, start: lane.start, end: lane.end, name: name.trim(), location: lane.location, note: "" };
}

/** A planned shift on another lane. To another day of the same shift the times stay as set; another task gets its own times. */
export function moveShift(shift: RosterShift, lane: Lane): RosterShiftInput {
  const sameShift = shift.role === lane.role && shift.part === lane.part;
  return {
    id: shift.id,
    date: lane.date,
    role: lane.role,
    part: lane.part,
    start: sameShift ? shift.start : lane.start,
    end: sameShift ? shift.end : lane.end,
    name: shift.name,
    location: lane.location,
    note: shift.note
  };
}

/** "7.00", "07:00" or "7:00" → "7:00"; "" when it is no time. */
export function parseTime(text: string): string {
  const m = text.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${Number(m[1])}:${m[2]}` : "";
}
