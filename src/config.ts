import type { AgendaSlot, VolunteerRole } from "./types/dashboard";

/*
 * Options on the volunteer signup page. They are written to the sheet exactly as shown here,
 * in the same format as the Google Form ("Vrijdag 18 december: middag"), so the agenda can read them.
 * Adjust per season.
 */

const DUTCH_WEEKDAYS = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
const DUTCH_MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function dayLabel(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day, 12);
  return `${DUTCH_WEEKDAYS[date.getDay()]} ${date.getDate()} ${DUTCH_MONTHS[date.getMonth()]}`;
}

/** Season days, same pattern as 2025: 15-24 December and 27-31 December. */
const SEASON_YEAR = 2026;
const SEASON_DAYS = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31].map((d) => dayLabel(SEASON_YEAR, 12, d));

const DEFAULT_OPTIONS: Record<VolunteerRole, string[]> = {
  inpakken: SEASON_DAYS,
  fietskoerier: SEASON_DAYS.flatMap((d) => [`${d}: ochtend`, `${d}: middag`]),
  autokoerier: SEASON_DAYS.flatMap((d) => [`${d}: ochtend`, `${d}: middag`]),
  /** Events with location, e.g. "Zaterdag 26 december (Pick-up Schaatsbaan)". */
  oliebollenbar: SEASON_DAYS
};

/**
 * The signup options per task. Filled from the Agenda tab of the Sheet (see applyAgenda);
 * the defaults above are used until it has rows. Read it at render time, never copy it.
 */
export const SIGNUP_OPTIONS: Record<VolunteerRole, string[]> = { ...DEFAULT_OPTIONS };

/** Time per option ("7:30–12:00"), keyed by the lowercased option. */
export const OPTION_TIMES: Record<string, string> = {};

/** People needed per option when the agenda says so, keyed by the lowercased option; else STAFFING_TARGETS. */
export const OPTION_TARGETS: Record<string, number> = {};

const PART_ORDER = ["", "ochtend", "middag", "avond"];

/** "2026-12-30" + "ochtend" + "" → "Woensdag 30 december: ochtend"; with a location: "… (Pick-up Schaatsbaan)". */
export function agendaLabel(slot: Pick<AgendaSlot, "date" | "part" | "location">): string {
  const [y, m, d] = slot.date.split("-").map(Number);
  return `${dayLabel(y, m, d)}${slot.part ? `: ${slot.part}` : ""}${slot.location ? ` (${slot.location})` : ""}`;
}

let appliedKey = "";

/** Uses the Agenda tab for the signup options, times and targets. An empty agenda keeps the defaults. */
export function applyAgenda(slots: AgendaSlot[]): void {
  const key = JSON.stringify(slots);
  if (key === appliedKey) return;
  appliedKey = key;
  for (const k of Object.keys(OPTION_TIMES)) delete OPTION_TIMES[k];
  for (const k of Object.keys(OPTION_TARGETS)) delete OPTION_TARGETS[k];
  if (slots.length === 0) {
    Object.assign(SIGNUP_OPTIONS, DEFAULT_OPTIONS);
    return;
  }
  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date) || PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part));
  for (const role of Object.keys(DEFAULT_OPTIONS) as VolunteerRole[]) {
    const options: string[] = [];
    for (const slot of sorted.filter((s) => s.role === role)) {
      const label = agendaLabel(slot);
      if (options.includes(label)) continue;
      options.push(label);
      if (slot.time) OPTION_TIMES[label.toLowerCase()] = slot.time;
      if (slot.needed) OPTION_TARGETS[label.toLowerCase()] = slot.needed;
    }
    SIGNUP_OPTIONS[role] = options;
  }
}

export const SIGNUP_HINTS = {
  inpakken: "Inpakken start rond 07:30 in Aalsmeer.",
  fietskoerier: "Ochtendsessie start om 9:00 uur in Amsterdam (max. 3 uurtjes). Kruis aan wat mogelijk is, wij delen je in waar we je het hardst nodig hebben.",
  autokoerier: "Kruis aan wat mogelijk is, wij delen je in waar we je het hardst nodig hebben.",
  oliebollenbar: "Op welke dag(en) wil je helpen in de Oliebollenbar?"
};

/**
 * Goal of the action (omacobysoliebollenbar.nl): 25.000 oliebollen pay for 2.500 free entries to a Gouwe Ouwe-avond.
 * Shown as the goal meter on Tussenstand; every 10 oliebollen is one "oudje".
 */
export const GOAL_OLIEBOLLEN = 25000;
export const OLIEBOLLEN_PER_OUDJE = 10;
export const GOAL_MILESTONES = [5000, 10000, 25000];

/**
 * How many volunteers are needed per role on each day (per dagdeel for couriers).
 * Below half of this a day shows as "weinig"; below the number as "bijna".
 */
export const STAFFING_TARGETS: Record<VolunteerRole, number> = {
  inpakken: 4,
  fietskoerier: 4,
  autokoerier: 4,
  oliebollenbar: 4
};

/**
 * Above this many oliebollen on one bike route the routes page warns that a car may be needed.
 * Rough guess; adjust once the team knows what fits on a (bak)fiets.
 */
export const BIKE_MAX_PIECES = 300;

/** Departure time per dagdeel when a route has none yet. */
export const ROUTE_START_TIMES: Record<string, string> = { ochtend: "09:00", middag: "12:00", avond: "17:00", "": "09:00" };

/**
 * Automatic planning (Routes → Automatisch indelen). Rough numbers on purpose: the planner
 * only divides the stops, Google Maps then calculates the real route.
 */
export const PLANNING = {
  /** Minutes per stop: parking, a chat, handing over. */
  minutesPerStop: 15,
  /** Working window per dagdeel when the Agenda tab gives no time ("09:00–12:00"). */
  partWindows: { ochtend: ["09:00", "12:30"], middag: ["12:30", "17:00"], avond: ["17:00", "20:00"], "": ["09:00", "17:00"] } as Record<string, [string, string]>,
  /** Oliebollen per trip. */
  capacity: { fiets: BIKE_MAX_PIECES, bakfiets: 600, auto: 1500 },
  /** Bikes stay within this distance (km, straight line) of the loods. */
  bikeMaxKm: 12,
  /** Average speed in km/h over the road; the road is about 1.3× the straight line. */
  speed: { fiets: 15, autoStad: 30, autoSnelweg: 70 },
  roadFactor: 1.3
};

export const CONTACT_EMAIL = "planning@omacobysoliebollenbar.nl";
