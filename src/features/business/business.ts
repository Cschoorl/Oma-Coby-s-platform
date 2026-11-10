import type { BusinessArea, BusinessInfo, BusinessMoment, BusinessOrder, BusinessOrderInput, BusinessPackage, BusinessPackageChoice, BusinessPackageKey, BusinessTotals } from "../../types/business";
import type { Order } from "../../types/order";
import { BUSINESS_DEFAULTS, BUSINESS_DELIVERY_WINDOW, BUSINESS_PER_COLLEAGUE } from "../../config";

/*
 * Rekenen en controleren voor de zakelijke bestelling. Het Apps Script rekent bij het versturen
 * precies hetzelfde na (businessTotals_ in Code.gs); houd die twee gelijk.
 */

export const areaLabel: Record<BusinessArea, string> = { regio: "Amsterdam of Aalsmeer", buiten: "Buiten Amsterdam en Aalsmeer" };

export const momentLabel: Record<BusinessMoment, string> = {
  regulier: `Tussen ${BUSINESS_DELIVERY_WINDOW.replace("–", " en ")}`,
  voor10: "Vóór 10:00",
  voor9: "Vóór 9:00"
};

const cents = (n: number) => Math.round(n * 100) / 100;

/** Per pakket: voor wie het is en wat het doet. De aantallen komen uit BusinessInfo.packages. */
export const packageCopy: Record<BusinessPackageKey, { kicker: string; text: string; andMore: boolean }> = {
  brons: {
    kicker: "Voor het team",
    text: "Een warme traktatie bij de borrel. En een groepje ouderen dat weer even de dansvloer op gaat.",
    andMore: false
  },
  zilver: {
    kicker: "Voor het hele kantoor",
    text: "Iedereen aan de oliebol. Samen laten jullie een volle tafel ouderen swingen op livemuziek.",
    andMore: false
  },
  goud: {
    kicker: "Voor grote teams, events en relaties",
    text: "Jullie vullen een complete dansvloer. Een middag lang rock 'n rollen, namens jullie bedrijf.",
    andMore: true
  }
};

/** Richtlijn: zo veel collega's trakteer je met dit aantal oliebollen. */
export function colleaguesFor(oliebollen: number): number {
  return Math.floor(oliebollen / BUSINESS_PER_COLLEAGUE);
}

/** Verdeling voor een pakket: 70% MET en 30% ZONDER (zoals in 2025), in tientallen. */
export function packageSplit(oliebollen: number): Pick<BusinessOrderInput, "withRaisins" | "withoutRaisins"> {
  const withRaisins = Math.round((oliebollen * 0.7) / 10) * 10;
  return { withRaisins, withoutRaisins: oliebollen - withRaisins };
}

/** Het gekozen pakket, als de aantallen er nog precies op uitkomen. */
export function chosenPackage(input: BusinessOrderInput, info: BusinessInfo): BusinessPackage | undefined {
  const p = info.packages.find((x) => x.key === input.pakket);
  return p && input.withRaisins + input.withoutRaisins === p.oliebollen ? p : undefined;
}

/** "Brons", "Zilver", "Goud" of "Zelf samengesteld"; zo staat het ook in de Sheet. */
export function packageLabel(input: BusinessOrderInput, info: BusinessInfo): string {
  return chosenPackage(input, info)?.name ?? "Zelf samengesteld";
}

/** Voor beheer: de pakketnaam zoals de Sheet hem bewaart; leeg bij oudere bestellingen zonder pakket. */
export function pakketName(choice: BusinessPackageChoice): string {
  if (choice === "zelf") return "Zelf samengesteld";
  return BUSINESS_DEFAULTS.packages.find((p) => p.key === choice)?.name ?? "";
}

export function emptyBusinessInput(): BusinessOrderInput {
  return {
    pakket: "",
    withRaisins: 0,
    withoutRaisins: 0,
    donation: 0,
    flyers: false,
    fulfilment: "bezorgen",
    area: "",
    moment: "regulier",
    date: "",
    pickupAgreed: false,
    street: "",
    postalCode: "",
    city: "",
    company: "",
    contact: "",
    phone: "",
    email: "",
    invoiceEmail: "",
    invoiceAddress: "",
    reference: "",
    remark: ""
  };
}

export function businessTotals(input: BusinessOrderInput, info: BusinessInfo): BusinessTotals {
  const oliebollen = Math.max(0, input.withRaisins) + Math.max(0, input.withoutRaisins);
  const bollen = cents(oliebollen * info.price);
  const bezorgen = input.fulfilment === "bezorgen";
  const delivery = bezorgen && input.area ? info.fees[input.area] : 0;
  const surcharge = bezorgen ? info.surcharges[input.moment] ?? 0 : 0;
  const subtotal = cents(bollen + delivery + surcharge);
  const vat = cents(subtotal * info.vatRate);
  const total = cents(subtotal + vat);
  const donation = cents(Math.max(0, input.donation) * info.donationPrice);
  return { oliebollen, bollen, delivery, surcharge, subtotal, vat, total, donation, invoice: cents(total + donation), ouderen: Math.floor(oliebollen / 10) };
}

/** Een leverdag kan nog als de bestelling minstens leadHours vóór 9:00 op die dag binnen is. */
export function dayOpen(date: string, info: BusinessInfo, now = new Date()): boolean {
  const start = new Date(`${date}T09:00:00`);
  return start.getTime() - now.getTime() >= info.leadHours * 3600000;
}

/** "1000-1109, 1430-1433" → [[1000, 1109], [1430, 1433]]. Een los getal ("1431") telt als reeks van één. */
export function parsePostcodeRanges(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const part of text.split(/[,;]+/)) {
    const m = part.replace(/\s+/g, "").match(/^(\d{4})(?:-(\d{4}))?$/);
    if (m) out.push([Number(m[1]), Number(m[2] ?? m[1])]);
  }
  return out;
}

/**
 * Bezorggebied uit het adres: de vier cijfers van de postcode beslissen (info.regionPostcodes).
 * Zonder postcode kijken we naar de plaats; leeg als we het nog niet weten. Zelfde regels als areaFor_ in Code.gs.
 */
export function areaFor(postalCode: string, city: string, regionPostcodes: string): BusinessArea | "" {
  const digits = postalCode.trim().match(/^(\d{4})/);
  if (digits) {
    const n = Number(digits[1]);
    return parsePostcodeRanges(regionPostcodes).some(([from, to]) => n >= from && n <= to) ? "regio" : "buiten";
  }
  const c = city.trim().toLowerCase();
  if (!c) return "";
  return /amsterdam|aalsmeer|kudelstaart/.test(c) ? "regio" : "buiten";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSTCODE = /^\d{4}\s?[a-z]{2}$/i;

export type BusinessField = keyof BusinessOrderInput;

/** Per veld wat er nog mist, in de volgorde van het formulier. Leeg = klaar om te versturen. */
export function validateBusiness(input: BusinessOrderInput, info: BusinessInfo, now = new Date()): Partial<Record<BusinessField, string>> {
  const e: Partial<Record<BusinessField, string>> = {};
  const total = input.withRaisins + input.withoutRaisins;
  if (!input.pakket && total === 0) e.pakket = "Kies een pakket, of stel zelf je aantal samen.";
  for (const key of ["withRaisins", "withoutRaisins", "donation"] as const) {
    if (input[key] % 10 !== 0) e[key] = "Kies een aantal in tientallen.";
  }
  if (!e.withRaisins && !e.withoutRaisins && total < info.minimum) e.withRaisins = `Samen minimaal ${info.minimum} oliebollen.`;
  if (input.fulfilment === "bezorgen") {
    if (!input.street.trim()) e.street = "Vul straat en huisnummer in.";
    if (!POSTCODE.test(input.postalCode.trim())) e.postalCode = "Vul een postcode in, zoals 1431 AB.";
    if (!input.city.trim()) e.city = "Vul de plaats in.";
    if (!input.date) e.date = "Kies een bezorgdag.";
    else if (!info.deliveryDays.includes(input.date)) e.date = "Op deze dag bezorgen we niet. Kies een andere dag.";
    else if (!dayOpen(input.date, info, now)) e.date = `Deze dag is te snel: bestel minimaal ${info.leadHours} uur van tevoren.`;
  } else {
    if (!input.pickupAgreed) e.pickupAgreed = `Afhalen kan alleen na overleg. Mail eerst naar ${info.email}.`;
    if (!input.date) e.date = "Kies een afhaalmoment.";
    else if (!info.pickupDays.some((d) => d.date === input.date)) e.date = "Op deze dag kun je niet afhalen. Kies een andere dag.";
    else if (!dayOpen(input.date, info, now)) e.date = `Dit moment is te snel: bestel minimaal ${info.leadHours} uur van tevoren.`;
  }
  if (!input.company.trim()) e.company = "Vul de naam van je onderneming in.";
  if (!input.contact.trim()) e.contact = "Vul de naam van de contactpersoon in.";
  if (input.phone.replace(/\D/g, "").length < 10) e.phone = "Vul een telefoonnummer in, zoals 06 12345678.";
  if (!EMAIL.test(input.email.trim())) e.email = "Vul een geldig e-mailadres in.";
  if (!EMAIL.test(input.invoiceEmail.trim())) e.invoiceEmail = "Vul een geldig e-mailadres voor de factuur in.";
  return e;
}

/** "Maandag 14 december" */
export function longDay(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  const text = d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "1431 ab" → "1431 AB" */
export function formatPostcode(value: string): string {
  const m = value.trim().match(/^(\d{4})\s?([a-z]{2})$/i);
  return m ? `${m[1]} ${m[2].toUpperCase()}` : value.trim();
}

/** Een bevestigde aanvraag als order, zodat hij in Bestellingen, Inpakken en Routes staat. */
export function businessToOrder(b: BusinessOrder): Order {
  const bezorgen = b.fulfilment === "bezorgen";
  return {
    id: b.id,
    deliveryDate: b.date,
    supplierName: "",
    locationName: b.company,
    contactPerson: b.contact,
    phone: b.phone,
    address: bezorgen ? b.street : "",
    postalCode: bezorgen ? formatPostcode(b.postalCode) : "",
    city: bezorgen ? b.city : "",
    plannedTime: "",
    status: "open",
    withRaisins: b.withRaisins,
    withoutRaisins: b.withoutRaisins,
    extras: b.remark || undefined,
    email: b.email,
    customerType: "zakelijk",
    category: "regulier",
    amount: b.totals.total,
    orderDate: b.createdAt.slice(0, 10),
    fulfilment: b.fulfilment,
    flyers: b.flyers ? "Ja" : "Nee",
    deliveryArea: bezorgen && b.area ? areaLabel[b.area] : undefined,
    deliveryMoment: bezorgen ? momentLabel[b.moment] : undefined
  };
}
