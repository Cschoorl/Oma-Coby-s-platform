import type { BusinessArea, BusinessInfo, BusinessMoment, BusinessOrder, BusinessOrderInput, BusinessPackage, BusinessPackageChoice, BusinessPackageKey, BusinessTotals } from "../../types/business";
import type { Order } from "../../types/order";
import { BUSINESS_DEFAULTS, BUSINESS_DELIVERY_WINDOW, BUSINESS_PER_COLLEAGUE } from "../../config";

/*
 * Rekenen en controleren voor de zakelijke bestelling. Het Apps Script rekent bij het versturen
 * precies hetzelfde na (businessTotals_ in Code.gs); houd die twee gelijk.
 */

export const areaLabel: Record<BusinessArea, string> = { regio: "Amsterdam of Aalsmeer", buiten: "Buiten Amsterdam" };

export const momentLabel: Record<BusinessMoment, string> = {
  regulier: `Tussen ${BUSINESS_DELIVERY_WINDOW.replace("–", " en ")}`,
  voor10: "Vóór 10:00",
  voor9: "Vóór 9:00"
};

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Per pakket: wat je erbij krijgt. De extra's komen uit de ladder in het
 * bouwplan; elk pakket krijgt alles van het pakket eronder, plus zijn eigen extra's. De aantallen staan in BusinessInfo.packages.
 */
export const packageCopy: Record<BusinessPackageKey, { perks: string[] }> = {
  brons: {
    perks: ["Impactcertificaat met jullie aantal ouderen", "Jullie naam op de wall of fame", "Kaartje met het verhaal bij de oliebollen"]
  },
  zilver: {
    perks: ["LinkedIn-badge met een kant-en-klare post", "Jullie logo op de wall of fame", "Een kaartje van Oma voor de besteller"]
  },
  goud: {
    perks: ["Uitnodiging voor de muziekmiddag zelf", "Foto of filmpje van jullie middag", "Podiumplek op de wall of fame"]
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

/** Het pakket bij dit aantal: het grootste waarvan je het aantal haalt. Onder Brons geen pakket. */
export function tierFor(oliebollen: number, info: BusinessInfo): BusinessPackage | undefined {
  return [...info.packages].reverse().find((p) => oliebollen >= p.oliebollen);
}

/** Het pakket van deze bestelling: meer dan het pakketaantal blijft dat pakket, minder valt een pakket terug. */
export function chosenPackage(input: BusinessOrderInput, info: BusinessInfo): BusinessPackage | undefined {
  return tierFor(input.withRaisins + input.withoutRaisins, info);
}

/** Het volgende pakket boven dit aantal, of niets bij Goud. */
export function nextTier(oliebollen: number, info: BusinessInfo): BusinessPackage | undefined {
  return info.packages.find((p) => p.oliebollen > oliebollen);
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

/** Een leverdag kan nog tot en met leadDays dagen ervoor (1 = tot middernacht van de dag ervoor). */
export function dayOpen(date: string, info: BusinessInfo, now = new Date()): boolean {
  const deadline = new Date(`${date}T00:00:00`);
  deadline.setDate(deadline.getDate() - (info.leadDays - 1));
  return now.getTime() < deadline.getTime();
}

/** "de dag van tevoren", "2 dagen van tevoren" */
export function leadText(info: BusinessInfo): string {
  return info.leadDays === 1 ? "de dag van tevoren" : `${info.leadDays} dagen van tevoren`;
}

/** Amsterdam en Aalsmeer zijn de regio; andere plaatsen buiten. Leeg als we het niet weten. */
export function guessArea(city: string): BusinessArea | "" {
  const c = city.trim().toLowerCase();
  if (!c) return "";
  return /amsterdam|aalsmeer/.test(c) ? "regio" : "buiten";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSTCODE = /^\d{4}\s?[a-z]{2}$/i;

export type BusinessField = keyof BusinessOrderInput;

/** De foutmeldingen van het formulier; de Engelse staan in teksten.ts. */
export const validationNl = {
  pakket: "Kies een pakket, of stel zelf je aantal samen.",
  tens: "Kies een aantal in tientallen.",
  min: (n: number) => `Samen minimaal ${n} oliebollen.`,
  max: (n: number) => `Samen hooguit ${n.toLocaleString("nl-NL")} oliebollen. Meer? Mail ons, dan plannen we het samen.`,
  street: "Vul straat en huisnummer in.",
  postalCode: "Vul een postcode in, zoals 1431 AB.",
  city: "Vul de plaats in.",
  area: "Kies waar we bezorgen.",
  date: "Kies een dag.",
  dateClosed: "Op deze dag komen we niet langs. Kies een andere dag.",
  dateSoon: (info: BusinessInfo) => `Deze dag is te snel: bestel uiterlijk ${leadText(info)}.`,
  company: "Vul de naam van je onderneming in.",
  contact: "Vul de naam van de contactpersoon in.",
  phone: "Vul een telefoonnummer in, zoals 06 12345678.",
  email: "Vul een geldig e-mailadres in.",
  invoiceEmail: "Vul een geldig e-mailadres voor de factuur in."
};
export type ValidationText = typeof validationNl;

/** Per veld wat er nog mist, in de volgorde van het formulier. Leeg = klaar om te versturen. */
export function validateBusiness(input: BusinessOrderInput, info: BusinessInfo, now = new Date(), text: ValidationText = validationNl): Partial<Record<BusinessField, string>> {
  const e: Partial<Record<BusinessField, string>> = {};
  const total = input.withRaisins + input.withoutRaisins;
  if (!input.pakket && total === 0) e.pakket = text.pakket;
  for (const key of ["withRaisins", "withoutRaisins", "donation"] as const) {
    if (input[key] % 10 !== 0) e[key] = text.tens;
  }
  if (!e.withRaisins && !e.withoutRaisins && total < info.minimum) e.withRaisins = text.min(info.minimum);
  if (!e.withRaisins && !e.withoutRaisins && total > info.maximum) e.withRaisins = text.max(info.maximum);
  // Afhalen kan niet: we bezorgen altijd.
  if (!input.street.trim()) e.street = text.street;
  if (!POSTCODE.test(input.postalCode.trim())) e.postalCode = text.postalCode;
  if (!input.city.trim()) e.city = text.city;
  if (!input.area) e.area = text.area;
  if (!input.date) e.date = text.date;
  else if (!info.deliveryDays.includes(input.date)) e.date = text.dateClosed;
  else if (!dayOpen(input.date, info, now)) e.date = text.dateSoon(info);
  if (!input.company.trim()) e.company = text.company;
  if (!input.contact.trim()) e.contact = text.contact;
  if (input.phone.replace(/\D/g, "").length < 10) e.phone = text.phone;
  if (!EMAIL.test(input.email.trim())) e.email = text.email;
  if (!EMAIL.test(input.invoiceEmail.trim())) e.invoiceEmail = text.invoiceEmail;
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
