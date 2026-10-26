import type { BusinessInfo } from "./types/business";
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

/*
 * Orders are delivered before twelve, so there is one morning shift for everyone. Inpakkers start earlier.
 * Fietskoerier no longer takes part: no options, also not when the agenda still lists it.
 */
const DEFAULT_OPTIONS: Record<VolunteerRole, string[]> = {
  inpakken: SEASON_DAYS,
  fietskoerier: [],
  autokoerier: SEASON_DAYS.map((d) => `${d}: ochtend`),
  /** Events with location, e.g. "Zaterdag 26 december (Pick-up Schaatsbaan)". */
  oliebollenbar: SEASON_DAYS
};

/**
 * The signup options per task. Filled from the Agenda tab of the Sheet (see applyAgenda);
 * the defaults above are used until it has rows. Read it at render time, never copy it.
 */
export const SIGNUP_OPTIONS: Record<VolunteerRole, string[]> = { ...DEFAULT_OPTIONS };

/**
 * Key for times and targets: task plus option. Inpakken and the Oliebollenbar can have the very same
 * option ("Dinsdag 15 december"), so the option alone would give the bar the inpak time.
 */
export function optionKeyFor(role: VolunteerRole, option: string): string {
  return `${role}|${option.trim().toLowerCase()}`;
}

/** Shift times until the agenda gives its own. */
const DEFAULT_TIMES: Record<string, string> = Object.fromEntries([
  ...DEFAULT_OPTIONS.inpakken.map((o) => [optionKeyFor("inpakken", o), "6:30–12:00"]),
  ...DEFAULT_OPTIONS.autokoerier.map((o) => [optionKeyFor("autokoerier", o), "9:00–12:00"])
]);

/** Time per task and option ("6:30–12:00"), keyed by optionKeyFor. Use optionTime to read it. */
export const OPTION_TIMES: Record<string, string> = { ...DEFAULT_TIMES };

/** People needed per task and option when the agenda says so, keyed by optionKeyFor; else STAFFING_TARGETS. */
export const OPTION_TARGETS: Record<string, number> = {};

export const optionTime = (role: VolunteerRole, option: string): string => OPTION_TIMES[optionKeyFor(role, option)] ?? "";

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
    Object.assign(OPTION_TIMES, DEFAULT_TIMES);
    return;
  }
  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date) || PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part));
  for (const role of Object.keys(DEFAULT_OPTIONS) as VolunteerRole[]) {
    const options: string[] = [];
    for (const slot of sorted.filter((s) => s.role === role)) {
      const label = agendaLabel(slot);
      if (options.includes(label)) continue;
      options.push(label);
      if (slot.time) OPTION_TIMES[optionKeyFor(role, label)] = slot.time;
      if (slot.needed) OPTION_TARGETS[optionKeyFor(role, label)] = slot.needed;
    }
    SIGNUP_OPTIONS[role] = role === "fietskoerier" ? [] : options;
  }
}

export const SIGNUP_HINTS = {
  inpakken: "Inpakken van 6:30 tot 12:00 in Aalsmeer.",
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

export const CONTACT_EMAIL = "planning@omacobysoliebollenbar.nl";

/** At most this many oliebollen in one box. MET and ZONDER never share a box. */
export const MAX_PER_DOOS = 50;

/**
 * Label roll in the DYMO LabelWriter 450: 99014 shipping labels, 54 × 101 mm, printed landscape.
 * Change both numbers when another roll goes in (e.g. 99019: 59 × 190 mm).
 */
export const LABEL_SIZE = { name: "DYMO 99014", widthMm: 101, heightMm: 54 };

/*
 * Zakelijk bestellen (#/bestellen), zoals in het Google Formulier van Mark voor 2026.
 * De Sheet kan alles overschrijven: prijzen in het tabblad Instellingen (zakelijk_prijs, …) en de dagen
 * in het tabblad Zakelijke dagen. Zie apps-script/README.md.
 */
export const BUSINESS_DEFAULTS: BusinessInfo = {
  price: 1.83,
  vatRate: 0.09,
  minimum: 50,
  fees: { regio: 10, buiten: 25 },
  surcharges: { regulier: 0, voor10: 10, voor9: 15 },
  donationPrice: 2,
  leadHours: 24,
  deliveryDays: [
    ...[14, 15, 16, 17, 18, 21, 22, 28, 29, 30, 31].map((d) => `${SEASON_YEAR}-12-${String(d).padStart(2, "0")}`),
    ...[4, 5, 6, 7, 8].map((d) => `${SEASON_YEAR + 1}-01-0${d}`)
  ],
  pickupDays: [
    { date: `${SEASON_YEAR}-12-30`, time: "14:00–16:00" },
    { date: `${SEASON_YEAR}-12-31`, time: "14:00–16:00" }
  ],
  email: "info@omacobysoliebollenbar.nl"
};

/** Bezorgen gebeurt tussen deze tijden; de toeslagen zijn voor eerder. */
export const BUSINESS_DELIVERY_WINDOW = "9:00–12:30";

/** Boven dit aantal per soort kijkt beheer extra mee (het formulier had "> 1500"). */
export const BUSINESS_LARGE = 1500;
