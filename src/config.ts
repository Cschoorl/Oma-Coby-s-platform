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

export const SEASON_YEAR = 2026;

/** "2026-12-07" → "Maandag 7 december". */
export function isoDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return dayLabel(y, m, d);
}

/** Every Monday to Friday from `from` to `to` (YYYY-MM-DD), without the days in `skip`. */
function weekdaysBetween(from: string, to: string, skip: string[]): string[] {
  const out: string[] = [];
  const day = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  for (; day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const iso = day.toISOString().slice(0, 10);
    if (day.getUTCDay() >= 1 && day.getUTCDay() <= 5 && !skip.includes(iso)) out.push(iso);
  }
  return out;
}

/**
 * THE season days, one list for everything: the volunteer signup and the business order form (deliveryDays).
 * Monday to Friday from Monday 7 December up to and including Friday 8 January, without 25, 26 and 27 December
 * (Christmas and the weekend after) and New Year's Day. Change it here only.
 */
export const SEASON_WORKDAYS: string[] = weekdaysBetween(`${SEASON_YEAR}-12-07`, `${SEASON_YEAR + 1}-01-08`, [
  `${SEASON_YEAR}-12-25`,
  `${SEASON_YEAR}-12-26`,
  `${SEASON_YEAR}-12-27`,
  `${SEASON_YEAR + 1}-01-01`
]);

/**
 * Events of the Oliebollenbar: only on these days can volunteers choose the bar. `name` shows on the signup
 * and goes into the Sheet ("Woensdag 9 december (Olieborrel, Het Amstelhuis)"); `time` is when the helping
 * hands are needed, `event` when the event itself runs. List from Mark, 26 November.
 */
export const BAR_EVENTS: { date: string; name: string; event: string; time: string }[] = [
  { date: `${SEASON_YEAR}-12-09`, name: "Olieborrel, Het Amstelhuis", event: "14:30–17:00", time: "13:00–17:30" },
  { date: `${SEASON_YEAR}-12-18`, name: "Kerstlunch met Le Petit Brunch", event: "12:00–14:30", time: "11:00–16:00" },
  { date: `${SEASON_YEAR}-12-19`, name: "Bubbels & Bollen", event: "14:00–17:00", time: "13:00–17:30" },
  { date: `${SEASON_YEAR}-12-20`, name: "Ochtendgymnastiek", event: "11:00–11:45", time: "10:30–13:00" },
  { date: `${SEASON_YEAR}-12-30`, name: "Pick-up Aalsmeer, 't Kloosterhof", event: "16:00–18:00", time: "14:45–18:45" },
  { date: `${SEASON_YEAR}-12-31`, name: "Pick-up Amsterdam, Het Amstelhuis", event: "14:00–16:00", time: "12:45–17:00" }
];

/** "Woensdag 9 december (Olieborrel, Het Amstelhuis)": the option for one bar event, as it goes into the Sheet. */
const barOption = (e: (typeof BAR_EVENTS)[number]) => `${isoDayLabel(e.date)} (${e.name})`;

const SEASON_DAYS = SEASON_WORKDAYS.map(isoDayLabel);

/** Shift times per task as shown on the signup. Dagdelen: ochtend until 12:30, middag until 15:00. */
export const SHIFT_TIMES = {
  inpakken: "7:00–9:30",
  autokoerier: { ochtend: "9:00–12:30", middag: "12:30–15:00" }
};

/*
 * Options per task. Inpakken every season day; the autokoerier in a morning and an afternoon shift
 * (bezorgen is ca. 9:00–15:00, by car only); the bar only on its event days. No fietskoerier anymore.
 */
const DEFAULT_OPTIONS: Record<VolunteerRole, string[]> = {
  inpakken: SEASON_DAYS,
  fietskoerier: [],
  autokoerier: SEASON_DAYS.flatMap((d) => [`${d}: ochtend`, `${d}: middag`]),
  oliebollenbar: BAR_EVENTS.map(barOption)
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

/** Shift times per option; always these, whatever the agenda says. */
const DEFAULT_TIMES: Record<string, string> = Object.fromEntries([
  ...DEFAULT_OPTIONS.inpakken.map((o) => [optionKeyFor("inpakken", o), SHIFT_TIMES.inpakken]),
  ...DEFAULT_OPTIONS.autokoerier.map((o) => [optionKeyFor("autokoerier", o), o.endsWith("middag") ? SHIFT_TIMES.autokoerier.middag : SHIFT_TIMES.autokoerier.ochtend]),
  ...BAR_EVENTS.map((e) => [optionKeyFor("oliebollenbar", barOption(e)), e.time])
]);

/** Time per task and option ("6:30–12:00"), keyed by optionKeyFor. Use optionTime to read it. */
export const OPTION_TIMES: Record<string, string> = { ...DEFAULT_TIMES };

/** People needed per task and option when the agenda says so, keyed by optionKeyFor; else STAFFING_TARGETS. */
export const OPTION_TARGETS: Record<string, number> = {};

export const optionTime = (role: VolunteerRole, option: string): string => OPTION_TIMES[optionKeyFor(role, option)] ?? "";


/** "2026-12-30" + "ochtend" + "" → "Woensdag 30 december: ochtend"; with a location: "… (Pick-up Schaatsbaan)". */
export function agendaLabel(slot: Pick<AgendaSlot, "date" | "part" | "location">): string {
  const [y, m, d] = slot.date.split("-").map(Number);
  return `${dayLabel(y, m, d)}${slot.part ? `: ${slot.part}` : ""}${slot.location ? ` (${slot.location})` : ""}`;
}

let appliedKey = "";

/**
 * The days and times come from SEASON_WORKDAYS, SHIFT_TIMES and BAR_EVENT_DAYS above, never from the Agenda tab:
 * the signup may not offer other days than these. The Agenda tab only gives how many people are needed ("nodig")
 * on a moment that also exists here; agenda rows on other days, other times or for the fietskoerier are ignored.
 */
export function applyAgenda(slots: AgendaSlot[]): void {
  const key = JSON.stringify(slots);
  if (key === appliedKey) return;
  appliedKey = key;
  Object.assign(SIGNUP_OPTIONS, DEFAULT_OPTIONS);
  for (const k of Object.keys(OPTION_TIMES)) delete OPTION_TIMES[k];
  Object.assign(OPTION_TIMES, DEFAULT_TIMES);
  for (const k of Object.keys(OPTION_TARGETS)) delete OPTION_TARGETS[k];
  for (const slot of slots) {
    if (!slot.needed) continue;
    // Same day and dagdeel; the bar's options carry the event name, which the agenda row need not repeat.
    const label = agendaLabel({ ...slot, location: "" }).toLowerCase();
    const option = SIGNUP_OPTIONS[slot.role]?.find((o) => o.toLowerCase() === label || o.toLowerCase().startsWith(`${label} (`));
    if (option) OPTION_TARGETS[optionKeyFor(slot.role, option)] = slot.needed;
  }
}

export const SIGNUP_HINTS = {
  inpakken: "Inpakken van 7:00 tot 9:30 in Aalsmeer, met koffie.",
  fietskoerier: "",
  autokoerier: "Bezorgen met je eigen auto, ca. 9:00 tot 15:00: 's ochtends tot 12:30, 's middags tot 15:00. Kruis aan wat mogelijk is, wij delen je in waar we je het hardst nodig hebben.",
  oliebollenbar: "Alleen bij evenementen; de tijd is inclusief opbouwen en opruimen. Bij welke wil je helpen in de Oliebollenbar?"
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

/** Departure time per dagdeel when a route has none yet. */
export const ROUTE_START_TIMES: Record<string, string> = { ochtend: "09:00", middag: "12:00", avond: "17:00", "": "09:00" };

/**
 * Automatic planning (Routes → Automatisch indelen). Rough numbers on purpose: the planner
 * only divides the stops, Google Maps then calculates the real route. Transport is car only
 * (besluit 23 november): the bike and the bakfiets are gone.
 */
export const PLANNING = {
  /** Minutes per stop: parking, a chat, handing over. */
  minutesPerStop: 15,
  /** Working window per dagdeel when the Agenda tab gives no time ("09:00–12:00"). */
  partWindows: { ochtend: ["09:00", "12:00"], middag: ["12:00", "15:00"], avond: ["17:00", "20:00"], "": ["09:00", "15:00"] } as Record<string, [string, string]>,
  /** Oliebollen per trip, in one car. */
  capacity: 1500,
  /** Average speed in km/h over the road; the road is about 1.3× the straight line. */
  speed: { autoStad: 30, autoSnelweg: 70 },
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
  // Buiten de regio onder de 500 oliebollen: bezorgkosten op nacalculatie per kilometer (besluit Mark, 19 november).
  fixedDeliveryFrom: 500,
  // Groot-Amsterdam (10xx en 11xx: ook Diemen en Amstelveen), Weesp (1380–1384, hoort bij Amsterdam) en Aalsmeer met
  // Kudelstaart (1430–1433).
  regionPostcodes: "1000-1199, 1380-1384, 1430-1433",
  // Vóór 10:00 is een aanvraag (besluit 11 november); vóór 9:00 bieden we niet aan (Mark, 19 november). voor9 staat er
  // alleen voor oude aanvragen, met dezelfde toeslag als vóór 10:00.
  surcharges: { regulier: 0, voor10: 20, voor9: 20 },
  // Minimaal 3 werkdagen van tevoren, en uiterlijk maandag 28 december 12:00.
  leadWorkdays: 3,
  closeAt: `${SEASON_YEAR}-12-28T12:00`,
  holidays: [`${SEASON_YEAR}-12-25`, `${SEASON_YEAR}-12-26`, `${SEASON_YEAR + 1}-01-01`],
  // Alle doordeweekse dagen van maandag 7 december tot en met vrijdag 8 januari, behalve 25 december en 1 januari.
  // The same days as the volunteer signup: SEASON_WORKDAYS.
  deliveryDays: SEASON_WORKDAYS,
  email: "info@omacobysoliebollenbar.nl",
  phone: "06 45 44 35 09",
  // Herstructurering november: de aantallen blijven, de namen schuiven door. Schuifelpartner 50 tot 149, Danspartner 150 tot 499,
  // Polonaisepartner vanaf 500. Aantallen te wijzigen via Instellingen.
  packages: [
    { key: "brons", name: "Schuifelpartner", oliebollen: 50 },
    { key: "zilver", name: "Danspartner", oliebollen: 150 },
    { key: "goud", name: "Polonaisepartner", oliebollen: 500 }
  ],
  // Feestpartner: feest op locatie met band vanaf 501 oliebollen. Feestprijs € 2.500, vanaf 60 gasten € 3.100 (er komt intern
  // een muzikant bij). Het goede-doelendeel van € 1 per oliebol gaat van de feestprijs af: 501 oliebollen maakt € 1.999,
  // elke oliebol meer weer € 1 eraf. Het is een aanvraag: we bevestigen pas als de band kan. Btw over de feestprijs is 21%
  // tot het definitief is afgestemd.
  party: { key: "feest", name: "Feestpartner", oliebollen: 501, fee: 2500, feeLarge: 3100, largeFrom: 60, credit: 1, vatRate: 0.21 },
  // Bandpartner (een eigen muziekmiddag) staat niet meer op het formulier; oude aanvragen houden hun naam via pakketName.
  adoptions: []
};

/** Namen van pakketten die niet meer op het formulier staan, voor oude aanvragen in beheer. */
export const OLD_PACKAGE_NAMES: Record<string, string> = { middag60: "Bandpartner 60 gasten", middag100: "Bandpartner 100 gasten" };


/** Oliebollen per collega als richtlijn bij de pakketten (3 als ze er een mee naar huis nemen). */
export const BUSINESS_PER_COLLEAGUE = 2;

/** Standaard bezorgen we tussen deze tijden, zonder toeslag (besluit 11 november). Vóór 10:00 is een aanvraag met toeslag. */
export const BUSINESS_DELIVERY_WINDOW = "9:00–15:00";

/** Doel van de Partypot als de Sheet niets zegt (Instellingen: partypot_doel). */
export const PARTYPOT_GOAL = 3000;

/** Boven dit aantal per soort kijkt beheer extra mee (het formulier had "> 1500"). */
export const BUSINESS_LARGE = 1500;
