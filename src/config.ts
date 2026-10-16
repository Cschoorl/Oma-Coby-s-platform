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

export const SIGNUP_OPTIONS = {
  inpakken: SEASON_DAYS,
  fietskoerier: SEASON_DAYS.flatMap((d) => [`${d}: ochtend`, `${d}: middag`]),
  autokoerier: SEASON_DAYS.flatMap((d) => [`${d}: ochtend`, `${d}: middag`]),
  /** Events with location, e.g. "Zaterdag 26 december (Pick-up Schaatsbaan)". Fill in once the 2026 events are known. */
  oliebollenbar: SEASON_DAYS
};

export const SIGNUP_HINTS = {
  inpakken: "Inpakken start rond 07:30 in Aalsmeer.",
  fietskoerier: "Ochtendsessie start om 9:00 uur in Amsterdam (max. 3 uurtjes). Kruis aan wat mogelijk is, wij delen je in waar we je het hardst nodig hebben.",
  autokoerier: "Kruis aan wat mogelijk is, wij delen je in waar we je het hardst nodig hebben.",
  oliebollenbar: "Op welke dag(en) wil je helpen in de Oliebollenbar?"
};

export const CONTACT_EMAIL = "planning@omacobysoliebollenbar.nl";
