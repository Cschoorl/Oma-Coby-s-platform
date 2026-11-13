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
 * De ladder van drie pakketten op aantal (brons Shufflepartner, zilver Danspartner, goud Polonaisepartner; de sleutel is de medaille)
 * en daarboven Feestpartner ("feest"): een feest op locatie met een vaste feestprijs plus de oliebollen, dat je bewust kiest.
 * De muziekmiddagen (Bandpartner) staan niet meer op het formulier; ze staan alleen nog in oude aanvragen.
 * "zelf" = zelf samengesteld, "" = nog niets gekozen.
 */
export type BusinessTierKey = "brons" | "zilver" | "goud";
export type BusinessAdoptKey = "middag60" | "middag100";
export type BusinessPackageKey = BusinessTierKey | "feest" | BusinessAdoptKey;
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
  /** Shufflepartner, Danspartner en Polonaisepartner, van klein naar groot. Elk pakket geldt vanaf zijn aantal tot het volgende. */
  packages: BusinessPackage[];
  /** Feestpartner: alleen als de klant hem kiest, nooit vanzelf op aantal. */
  party: BusinessParty;
  /** Adopteer een hele muziekmiddag. Staat niet meer op het formulier (leeg); alleen nog voor oude aanvragen. */
  adoptions: BusinessPackage[];
}

/**
 * Feestpartner: een feest op locatie met band. Totaal = feestprijs − credit per oliebol + de oliebollen tegen de gewone
 * stuksprijs. Vanaf largeFrom gasten komt er intern een muzikant bij en geldt feeLarge; de klant ziet alleen het bedrag.
 */
export interface BusinessParty extends BusinessPackage {
  key: "feest";
  /** Feestprijs excl. btw onder largeFrom gasten (€ 2.500). */
  fee: number;
  /** Feestprijs excl. btw vanaf largeFrom gasten (€ 3.100). */
  feeLarge: number;
  largeFrom: number;
  /** Het goede-doelendeel per oliebol (€ 1) dat van de feestprijs afgaat; nooit verder dan € 0. */
  credit: number;
  /** Btw over de feestprijs; de oliebollen houden vatRate. */
  vatRate: number;
}

/** Wat de klant invult. */
export interface BusinessOrderInput {
  /** Het pakket dat de klant aanklikte. Bij versturen wordt het het pakket dat bij het aantal hoort (tierFor). */
  pakket: BusinessPackageChoice;
  withRaisins: number;
  withoutRaisins: number;
  /** Alleen bij Feestpartner: het geschatte aantal gasten; bepaalt de feestprijs. 0 bij de andere pakketten. */
  guests: number;
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
  /** Feestprijs excl. btw bij Feestpartner, anders 0. */
  party: number;
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
