/** Zakelijke bestelling via het bestelformulier (#/bestellen). Komt in het tabblad "Zakelijke aanvragen". */

export type BusinessFulfilment = "bezorgen" | "afhalen";

/** Binnen Amsterdam/Aalsmeer (fietsafstand) of daarbuiten: dat bepaalt de bezorgkosten. */
export type BusinessArea = "regio" | "buiten";

/** Bezorgmoment: tussen 9:00 en 12:30 (regulier), of eerder tegen een toeslag. */
export type BusinessMoment = "regulier" | "voor10" | "voor9";

export type BusinessStatus = "nieuw" | "bevestigd" | "afgewezen";

export interface PickupDay {
  /** YYYY-MM-DD */
  date: string;
  /** "14:00–16:00" */
  time: string;
}

/** Prijzen en dagen. Standaard uit config.ts; de Sheet kan ze overschrijven (Instellingen en Zakelijke dagen). */
export interface BusinessInfo {
  /** Euro per oliebol, excl. btw. */
  price: number;
  /** 0.09 */
  vatRate: number;
  /** Minimaal aantal oliebollen (MET + ZONDER). */
  minimum: number;
  fees: Record<BusinessArea, number>;
  surcharges: Record<BusinessMoment, number>;
  /** Euro per extra gedoneerde oliebol. */
  donationPrice: number;
  /** Zo veel uur vóór 9:00 op de leverdag moet de bestelling binnen zijn. */
  leadHours: number;
  /** YYYY-MM-DD */
  deliveryDays: string[];
  pickupDays: PickupDay[];
  email: string;
}

/** Wat de klant invult. */
export interface BusinessOrderInput {
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
  /** Afhalen kan alleen na overleg met info@. */
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
  /** Per 10 bestelde oliebollen één oudere gratis naar een Gouwe Ouwe-avond. */
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
