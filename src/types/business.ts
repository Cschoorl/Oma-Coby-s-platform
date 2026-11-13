/** Zakelijke bestelling via het bestelformulier (#/bestellen). Komt in het tabblad "Zakelijke aanvragen". */

/**
 * Afhalen kan niet meer: we bezorgen altijd. "afhalen" staat alleen nog in oude aanvragen.
 * "donatie": alleen een donatie, zonder oliebollen; er valt niets te bezorgen.
 */
export type BusinessFulfilment = "bezorgen" | "afhalen" | "donatie";

/** Binnen Amsterdam/Aalsmeer (fietsafstand) of daarbuiten: dat bepaalt de bezorgkosten. */
export type BusinessArea = "regio" | "buiten";

/**
 * Bezorgmoment: standaard tussen 9:00 en 15:00 (regulier, zonder toeslag), of op aanvraag vóór 10:00 tegen een toeslag.
 * "voor9" bieden we niet meer aan; het staat alleen nog in oude aanvragen.
 */
export type BusinessMoment = "regulier" | "voor10" | "voor9";

export type BusinessStatus = "nieuw" | "bevestigd" | "afgewezen";

/**
 * De drie zakelijke pakketten (Danspartner, Polonaisepartner, Feestpartner; de sleutels zijn van vóór de nieuwe namen)
 * en de twee muziekmiddagen om te adopteren. "zelf" = zelf samengesteld, "" = nog niets gekozen.
 */
export type BusinessTierKey = "brons" | "zilver" | "goud";
export type BusinessAdoptKey = "middag60" | "middag100";
export type BusinessPackageKey = BusinessTierKey | BusinessAdoptKey;
export type BusinessPackageChoice = BusinessPackageKey | "zelf" | "";

export interface BusinessPackage {
  key: BusinessPackageKey;
  /** "Danspartner" */
  name: string;
  /** Vanaf zo veel oliebollen (MET + ZONDER) hoort een bestelling bij dit pakket; een muziekmiddag bij precies dit aantal. */
  oliebollen: number;
  /** Alleen bij een muziekmiddag: zo veel ouderen gaan erheen (niet 1 per 10 oliebollen). */
  ouderen?: number;
}

/** Waarvoor zijn de oliebollen? "" = nog niet gekozen (en bij alleen een donatie). */
export type BusinessOccasion = "" | "borrel" | "event" | "relatiegeschenk";

/** "Hoe kwamen jullie bij ons terecht?" */
export type BusinessSource = "" | "ambassadeur" | "collega" | "klant" | "linkedin" | "instagram" | "pers" | "google" | "anders";

/** Prijzen en dagen. Standaard uit config.ts; de Sheet kan ze overschrijven (Instellingen en Zakelijke dagen). */
export interface BusinessInfo {
  /** Euro per oliebol, excl. btw. */
  price: number;
  /** 0.09 */
  vatRate: number;
  /** Minimaal aantal oliebollen (MET + ZONDER). */
  minimum: number;
  /** Maximaal aantal oliebollen per bestelling (MET + ZONDER); meer gaat via de mail. */
  maximum: number;
  fees: Record<BusinessArea, number>;
  /** Postcodes met het lage bezorgtarief, bijv. "1000-1109, 1430-1433" (Amsterdam, Aalsmeer en Kudelstaart). */
  regionPostcodes: string;
  surcharges: Record<BusinessMoment, number>;
  /** Bestellen kan tot en met zo veel werkdagen vóór de leverdag (3: maandag bestellen, donderdag bezorgd). */
  leadWorkdays: number;
  /** Daarna is zakelijk bestellen dicht voor dit seizoen: "2026-12-28T12:00". */
  closeAt: string;
  /** Doordeweekse dagen die geen werkdag zijn, YYYY-MM-DD (kerst, nieuwjaar). */
  holidays: string[];
  /** YYYY-MM-DD */
  deliveryDays: string[];
  email: string;
  /** Telefoonnummer van de stichting, voor vragen. */
  phone: string;
  /** Danspartner, Polonaisepartner en Feestpartner, van klein naar groot. Elk pakket geldt vanaf zijn aantal tot het volgende. */
  packages: BusinessPackage[];
  /** Adopteer een hele muziekmiddag: bij precies dit aantal oliebollen, met een eigen aantal ouderen. */
  adoptions: BusinessPackage[];
}

/** Wat de klant invult. */
export interface BusinessOrderInput {
  /** Het pakket dat de klant aanklikte. Bij versturen wordt het het pakket dat bij het aantal hoort (tierFor). */
  pakket: BusinessPackageChoice;
  withRaisins: number;
  withoutRaisins: number;
  /** Waarvoor het is: borrel, event of relatiegeschenk. Verplicht als je oliebollen bestelt. */
  occasion: BusinessOccasion;
  /** Bijdrage aan de Partypot in hele euro's (geen btw). Kan ook zonder oliebollen te bestellen; telt niet mee in het aantal ouderen. */
  donation: number;
  /** Niet meer gevraagd: er gaat altijd een kaartje met het verhaal mee. Alleen nog in oude aanvragen. */
  flyers: boolean;
  fulfilment: BusinessFulfilment;
  area: BusinessArea | "";
  moment: BusinessMoment;
  /** YYYY-MM-DD */
  date: string;
  /** Alleen nog in oude aanvragen met afhalen. */
  pickupAgreed: boolean;
  street: string;
  postalCode: string;
  city: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  invoiceEmail: string;
  invoiceAddress: string;
  reference: string;
  remark: string;
  /** Toestemming voor de wall of fame: naam (vanaf Polonaisepartner ook logo) en het aantal ouderen, nooit bedragen. */
  wallOfFame: boolean;
  certificate: boolean;
  /** Naam op het impactcertificaat; leeg = de naam van de onderneming. */
  certificateName: string;
  /** LinkedIn-badge met kant-en-klare post (vanaf Polonaisepartner). */
  linkedin: boolean;
  source: BusinessSource;
  /** Naam van de ambassadeur, of uit de link (?via=). */
  ambassador: string;
  /** Wat er in de link stond (?via=…), om te zien welke ambassadeur welke bestelling binnenhaalt. */
  via: string;
}

export interface BusinessTotals {
  oliebollen: number;
  bollen: number;
  delivery: number;
  surcharge: number;
  subtotal: number;
  vat: number;
  total: number;
  donation: number;
  /** Totaal incl. btw plus de bijdrage aan de Partypot: wat er op de factuur komt. */
  invoice: number;
  /** Per 10 bestelde oliebollen één oudere een middag op de dansvloer; Bandpartner telt zijn eigen aantal gasten (60 of 100). Een donatie telt niet mee. */
  ouderen: number;
}

export interface BusinessOrder extends BusinessOrderInput {
  /** "Z26-0001" */
  id: string;
  createdAt: string;
  status: BusinessStatus;
  /** Reden bij afwijzen. */
  reason: string;
  handledBy: string;
  handledAt: string;
  totals: BusinessTotals;
}

/** De stand van de Partypot: bijdragen uit het zakelijke formulier en uit Shopify samen, in euro's. */
export interface Partypot {
  raised: number;
  goal: number;
}
