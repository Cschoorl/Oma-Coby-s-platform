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
export const SEASON_YEAR = 2026;
const SEASON_DAYS = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31].map((d) => dayLabel(SEASON_YEAR, 12, d));

/*
 * Business orders are delivered between 9:00 and 15:00 (BUSINESS_DELIVERY_WINDOW), so autokoeriers get a
 * morning shift (9:00–12:00, which also covers the "vóór 10:00" requests) and an afternoon shift (12:00–15:00).
 * Inpakkers start earlier. Fietskoerier no longer takes part: no options, also not when the agenda still lists it.
 */
const DEFAULT_OPTIONS: Record<VolunteerRole, string[]> = {
  inpakken: SEASON_DAYS,
  fietskoerier: [],
  autokoerier: SEASON_DAYS.flatMap((d) => [`${d}: ochtend`, `${d}: middag`]),
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
  ...DEFAULT_OPTIONS.autokoerier.map((o) => [optionKeyFor("autokoerier", o), o.endsWith("middag") ? "12:00–15:00" : "9:00–12:00"])
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
  autokoerier: "We bezorgen tussen 9:00 en 15:00: 's ochtends van 9:00 tot 12:00, 's middags van 12:00 tot 15:00. Kruis aan wat mogelijk is, wij delen je in waar we je het hardst nodig hebben.",
  oliebollenbar: "Op welke dag(en) wil je helpen in de Oliebollenbar?"
};

/**
 * Goal of the season (impactverhaal 2026): 40.000 oliebollen = 4.000 ouderen op de dansvloer. Was 25.000;
 * Gouwe Ouwe still has to confirm 40.000 is feasible.
 * Shown as the goal meter on Tussenstand; every 10 oliebollen is one "oudje".
 */
export const GOAL_OLIEBOLLEN = 40000;
export const OLIEBOLLEN_PER_OUDJE = 10;
export const GOAL_MILESTONES = [10000, 25000, 40000];

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
  partWindows: { ochtend: ["09:00", "12:00"], middag: ["12:00", "15:00"], avond: ["17:00", "20:00"], "": ["09:00", "15:00"] } as Record<string, [string, string]>,
  /** Oliebollen per trip. */
  capacity: { fiets: BIKE_MAX_PIECES, bakfiets: 600, auto: 1500 },
  /** Bikes stay within this distance (km, straight line) of the loods. */
  bikeMaxKm: 12,
  /** Average speed in km/h over the road; the road is about 1.3× the straight line. */
  speed: { fiets: 15, autoStad: 30, autoSnelweg: 70 },
  roadFactor: 1.3
};

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
 * De Sheet kan bijna alles overschrijven: bedragen en aantallen in het tabblad Instellingen (zakelijk_minimum, …)
 * en de dagen in het tabblad Zakelijke dagen. De prijs per oliebol niet: die volgt het bouwplan. Zie apps-script/README.md.
 */
export const BUSINESS_DEFAULTS: BusinessInfo = {
  // € 2,29 per bol excl. 9% btw, dus € 2,50 incl. (zakelijk concept 2026).
  price: 2.29,
  vatRate: 0.09,
  minimum: 50,
  // Grote bedrijven bestellen ruim meer dan 500; boven de 10.000 stemmen we het eerst af.
  maximum: 10000,
  fees: { regio: 10, buiten: 25 },
  // Groot-Amsterdam (10xx en 11xx: ook Diemen en Amstelveen) en Aalsmeer met Kudelstaart (1430–1433).
  regionPostcodes: "1000-1199, 1430-1433",
  // Vóór 10:00 is een aanvraag (besluit 11 november); vóór 9:00 bieden we niet meer aan.
  surcharges: { regulier: 0, voor10: 15, voor9: 0 },
  // Minimaal 3 werkdagen van tevoren, en uiterlijk maandag 28 december 12:00.
  leadWorkdays: 3,
  closeAt: `${SEASON_YEAR}-12-28T12:00`,
  holidays: [`${SEASON_YEAR}-12-25`, `${SEASON_YEAR}-12-26`, `${SEASON_YEAR + 1}-01-01`],
  // Alle doordeweekse dagen van maandag 7 december tot en met vrijdag 8 januari, behalve 25 december en 1 januari.
  deliveryDays: weekdays(`${SEASON_YEAR}-12-07`, `${SEASON_YEAR + 1}-01-08`, [`${SEASON_YEAR}-12-25`, `${SEASON_YEAR + 1}-01-01`]),
  email: "info@omacobysoliebollenbar.nl",
  phone: "06 45 44 35 09",
  // Danspartner 50 tot 149, Polonaisepartner 150 tot 499, Feestpartner vanaf 500. Aantallen te wijzigen via Instellingen.
  packages: [
    { key: "brons", name: "Danspartner", oliebollen: 50 },
    { key: "zilver", name: "Polonaisepartner", oliebollen: 150 },
    { key: "goud", name: "Feestpartner", oliebollen: 500 }
  ],
  // Bandpartner: een eigen muziekmiddag, bij precies dit aantal oliebollen, voor zo veel gasten.
  adoptions: [
    { key: "middag60", name: "Bandpartner 60 gasten", oliebollen: 2500, ouderen: 60 },
    { key: "middag100", name: "Bandpartner 100 gasten", oliebollen: 3100, ouderen: 100 }
  ]
};

/** Alle maandagen tot en met vrijdagen van `from` tot en met `to`, zonder de dagen in `skip`. */
function weekdays(from: string, to: string, skip: string[]): string[] {
  const out: string[] = [];
  const day = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  for (; day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const iso = day.toISOString().slice(0, 10);
    if (day.getUTCDay() >= 1 && day.getUTCDay() <= 5 && !skip.includes(iso)) out.push(iso);
  }
  return out;
}

/** Oliebollen per collega als richtlijn bij de pakketten (3 als ze er een mee naar huis nemen). */
export const BUSINESS_PER_COLLEAGUE = 2;

/** Standaard bezorgen we tussen deze tijden, zonder toeslag (besluit 11 november). Vóór 10:00 is een aanvraag met toeslag. */
export const BUSINESS_DELIVERY_WINDOW = "9:00–15:00";

/** Doel van de Partypot als de Sheet niets zegt (Instellingen: partypot_doel). */
export const PARTYPOT_GOAL = 3000;

/** Boven dit aantal per soort kijkt beheer extra mee (het formulier had "> 1500"). */
export const BUSINESS_LARGE = 1500;
