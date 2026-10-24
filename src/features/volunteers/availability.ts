import type { Volunteer, VolunteerRole } from "../../types/dashboard";
import { ACTIVE_ROLES, VOLUNTEER_ROLES } from "../../types/dashboard";
import { SIGNUP_OPTIONS, optionTime } from "../../config";
import { dayKey, staffingStatus, targetFor, type StaffingStatus } from "../../utils/staffing";

/*
 * Availability per person and per day, for the planning views (Vrijwilligers and Agenda).
 * Everything is read from the signup answers; nothing here is a final schedule.
 */

export interface SeasonDayInfo {
  /** "15 december", the key used everywhere for a day. */
  key: string;
  /** "Dinsdag 15 december". */
  label: string;
  /** "di". */
  weekday: string;
  day: number;
  month: string;
}

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** "15 december" → a number that sorts the season (January after December). */
export function seasonOrder(key: string): number {
  const [d, m] = key.split(" ");
  const month = MONTHS.indexOf(m);
  return (month < 6 ? month + 12 : month) * 31 + Number(d);
}

function dayInfo(option: string): SeasonDayInfo {
  const label = option.split(/[:(]/)[0].trim();
  const key = dayKey(option);
  const [d, m] = key.split(" ");
  return { key, label, weekday: label.slice(0, 2).toLowerCase(), day: Number(d), month: m };
}

/** The days of this season plus any other day someone signed up for, in season order. */
export function planningDays(volunteers: Volunteer[]): SeasonDayInfo[] {
  const seen = new Map<string, SeasonDayInfo>();
  const add = (option: string) => {
    const info = dayInfo(option);
    if (!seen.has(info.key)) seen.set(info.key, info);
  };
  for (const role of ACTIVE_ROLES) SIGNUP_OPTIONS[role].forEach(add);
  for (const v of volunteers) for (const role of VOLUNTEER_ROLES) if (v.roles[role].wants) v.roles[role].days.forEach(add);
  return [...seen.values()].sort((a, b) => seasonOrder(a.key) - seasonOrder(b.key));
}

export interface Slot {
  role: VolunteerRole;
  option: string;
  /** "ochtend", "middag", "avond" or "" for the whole day. */
  part: string;
  /** "6:30–12:00", or "" when unknown. */
  time: string;
  /** Oliebollenbar location, e.g. "Pick-up Schaatsbaan". */
  location: string;
}

export function toSlot(role: VolunteerRole, option: string): Slot {
  return {
    role,
    option,
    part: option.match(/:\s*(ochtend|middag|avond)/i)?.[1].toLowerCase() ?? "",
    time: optionTime(role, option),
    location: option.match(/\(([^)]+)\)/)?.[1] ?? ""
  };
}

/** What one person can do on one day, per task. */
export function slotsOn(v: Volunteer, day: string): Slot[] {
  return VOLUNTEER_ROLES.flatMap((role) => (v.roles[role].wants ? v.roles[role].days.filter((o) => dayKey(o) === day).map((o) => toSlot(role, o)) : []));
}

/** The days someone can, in season order. */
export function daysOf(v: Volunteer): string[] {
  const days = new Set<string>();
  for (const role of VOLUNTEER_ROLES) if (v.roles[role].wants) v.roles[role].days.forEach((o) => days.add(dayKey(o)));
  return [...days].sort((a, b) => seasonOrder(a) - seasonOrder(b));
}

export interface Moment {
  option: string;
  slot: Slot;
  target: number;
  people: Volunteer[];
  status: StaffingStatus;
}

export interface DayTask {
  role: VolunteerRole;
  moments: Moment[];
  /** Everyone available for this task on this day, any moment. */
  people: Volunteer[];
  /** The worst moment of the day decides. */
  status: StaffingStatus;
}

const RANK: Record<StaffingStatus, number> = { weinig: 0, bijna: 1, genoeg: 2 };

export function worst(statuses: StaffingStatus[]): StaffingStatus {
  return statuses.reduce<StaffingStatus>((w, s) => (RANK[s] < RANK[w] ? s : w), "genoeg");
}

/** Per task on one day: the moments, who can and how that compares to what is needed. */
export function dayTasks(volunteers: Volunteer[], day: string, roles: VolunteerRole[] = ACTIVE_ROLES): DayTask[] {
  return roles
    .map((role) => {
      const options = SIGNUP_OPTIONS[role].filter((o) => dayKey(o) === day);
      const moments = options.map((option) => {
        const people = volunteers.filter((v) => v.roles[role].wants && v.roles[role].days.some((d) => d.toLowerCase() === option.toLowerCase()));
        const target = targetFor(role, option);
        return { option, slot: toSlot(role, option), target, people, status: staffingStatus(people.length, target) };
      });
      const people = volunteers.filter((v) => v.roles[role].wants && v.roles[role].days.some((d) => dayKey(d) === day));
      return { role, moments, people, status: worst(moments.map((m) => m.status)) };
    })
    .filter((t) => t.moments.length > 0 || t.people.length > 0);
}
