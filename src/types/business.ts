/** Zakelijke bestelling via het bestelformulier (#/bestellen). Komt in het tabblad "Zakelijke aanvragen". */

/** Afhalen kan niet meer: we bezorgen altijd. "afhalen" staat alleen nog in oude aanvragen. */
export type BusinessFulfilment = "bezorgen" | "afhalen";

/** Binnen Amsterdam/Aalsmeer (fietsafstand) of daarbuiten: dat bepaalt de bezorgkosten. */
export type BusinessArea = "regio" | "buiten";

/** Bezorgmoment: tussen 9:00 en 12:30 (regulier), of eerder tegen een toeslag. */
export type BusinessMoment = "regulier" | "voor10" | "voor9";

export type BusinessStatus = "nieuw" | "bevestigd" | "afgewezen";

/** De drie zakelijke pakketten; "zelf" = zelf samengesteld, "" = nog niets gekozen. */
export type BusinessPackageKey = "brons" | "zilver" | "goud";
export type BusinessPackageChoice = BusinessPackageKey | "zelf" | "";

export interface BusinessPackage {
  key: BusinessPackageKey;
  /** "Brons" */
  name: string;
  /** Vanaf zo veel oliebollen (MET + ZONDER) hoort een bestelling bij dit pakket. */
  oliebollen: number;
}

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
  /** Euro per extra gedoneerde oliebol. */
  donationPrice: number;
  /** Bestellen kan tot en met zo veel dagen vóór de leverdag (1 = tot en met de dag ervoor). */
  leadDays: number;
  /** YYYY-MM-DD */
  deliveryDays: string[];
  email: string;
  /** Telefoonnummer van de stichting, voor vragen. */
  phone: string;
  /** Brons, Zilver en Goud, van klein naar groot. Elk pakket geldt vanaf zijn aantal tot het volgende. */
  packages: BusinessPackage[];
}

/** Wat de klant invult. */
export interface BusinessOrderInput {
  /** Het pakket dat de klant aanklikte. Bij versturen wordt het het pakket dat bij het aantal hoort (tierFor). */
  pakket: BusinessPackageChoice;
  withRaisins: number;
  withoutRaisins: number;
  /** Extra oliebollen die de klant doneert aan ouderen en organisaties voor minderbedeelden. */
  donation: number;
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
  /** Totaal incl. btw plus de donatie: wat er op de factuur komt. */
  invoice: number;
  /** Per 10 bestelde oliebollen één oudere een middag op de dansvloer. */
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
