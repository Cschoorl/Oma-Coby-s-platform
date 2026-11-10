import type { BusinessArea, BusinessInfo, BusinessMoment, BusinessOrder, BusinessOrderInput, BusinessPackage, BusinessPackageChoice, BusinessPackageKey, BusinessSource, BusinessTotals } from "../../types/business";
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

/**
 * Per pakket: wat je erbij krijgt. De extra's komen uit de ladder in het
 * bouwplan; elk pakket krijgt alles van het pakket eronder, plus zijn eigen extra's. De aantallen staan in BusinessInfo.packages.
 */
export const packageCopy: Record<BusinessPackageKey, { perks: string[] }> = {
  brons: {
    perks: ["Impactcertificaat met jullie aantal ouderen", "Jullie naam op de wall of fame", "Kaartje met het verhaal bij de oliebollen"]
  },
  zilver: {
    perks: ["LinkedIn-badge met een kant-en-klare post", "Jullie logo op de wall of fame", "Oma Coby's Oliebal (limited edition) voor in de kerstboom"]
  },
  goud: {
    perks: ["Uitnodiging voor de muziekmiddag zelf", "Foto of filmpje van jullie middag", "Podiumplek op de wall of fame"]
  },
  // Een muziekmiddag adopteren: alles van Feestpartner, plus de middag zelf.
  middag60: {
    perks: ["Een hele muziekmiddag met livemuziek", "Jullie naam op de middag", "Jullie kiezen het zorgcentrum of buurthuis"]
  },
  middag100: {
    perks: ["Een hele muziekmiddag met livemuziek", "Jullie naam op de middag", "Jullie kiezen het zorgcentrum of buurthuis"]
  }
};

/** Een muziekmiddag is geen trede van de ladder: hij geldt bij precies zijn aantal. */
export function isAdoption(p: BusinessPackage | undefined): boolean {
  return Boolean(p && p.ouderen);
}

/** Rang voor wat een pakket toelaat: Danspartner 1, Polonaisepartner 2, Feestpartner 3, een muziekmiddag 4, geen pakket 0. */
export function packageRank(p: BusinessPackage | undefined): number {
  if (!p) return 0;
  if (isAdoption(p)) return 4;
  return { brons: 1, zilver: 2, goud: 3 }[p.key as "brons" | "zilver" | "goud"] ?? 0;
}

/** De muziekmiddag bij precies dit aantal, of niets. */
export function adoptionFor(oliebollen: number, info: BusinessInfo): BusinessPackage | undefined {
  return info.adoptions.find((a) => a.oliebollen === oliebollen);
}

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

/**
 * Het pakket van deze bestelling: precies 2.500 of 3.100 is een muziekmiddag; verder het grootste pakket dat je haalt
 * (meer blijft dat pakket, minder valt een pakket terug).
 */
export function chosenPackage(input: Pick<BusinessOrderInput, "withRaisins" | "withoutRaisins">, info: BusinessInfo): BusinessPackage | undefined {
  const total = input.withRaisins + input.withoutRaisins;
  return adoptionFor(total, info) ?? tierFor(total, info);
}

/** Ouderen: 1 per 10 oliebollen, besteld en gedoneerd samen. Een muziekmiddag heeft zijn eigen aantal, plus wat er gedoneerd is. */
export function ouderenFor(oliebollen: number, donation: number, info: BusinessInfo): number {
  const adopt = adoptionFor(oliebollen, info);
  return adopt?.ouderen ? adopt.ouderen + Math.floor(Math.max(0, donation) / 10) : Math.floor((oliebollen + Math.max(0, donation)) / 10);
}

/** Doneren gaat per 1 oliebol (€ 2,50), dan per 10 (€ 25, één oudere). */
export function donationStep(n: number, up: boolean): number {
  if (up) return n <= 0 ? 1 : n < 10 ? 10 : n + 10;
  return n <= 1 ? 0 : n <= 10 ? 1 : n - 10;
}

/** 0, 1 of een tiental. */
export function validDonation(n: number): boolean {
  return n === 0 || n === 1 || (n > 0 && n % 10 === 0);
}

/** Het volgende pakket boven dit aantal, of niets bij Goud. */
export function nextTier(oliebollen: number, info: BusinessInfo): BusinessPackage | undefined {
  return info.packages.find((p) => p.oliebollen > oliebollen);
}

/** Voor beheer: de pakketnaam zoals de Sheet hem bewaart; leeg bij oudere bestellingen zonder pakket. */
export function pakketName(choice: BusinessPackageChoice): string {
  if (choice === "zelf") return "Zelf samengesteld";
  return [...BUSINESS_DEFAULTS.packages, ...BUSINESS_DEFAULTS.adoptions].find((p) => p.key === choice)?.name ?? "";
}

/** "Hoe kwamen jullie bij ons terecht?", in de volgorde van het formulier. Zo staat het ook in de Sheet. */
export const sourceLabel: Record<Exclude<BusinessSource, "">, string> = {
  ambassadeur: "Via een ambassadeur",
  collega: "Via een collega of kennis",
  klant: "Vorig jaar al klant",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  pers: "Pers of nieuws",
  google: "Google",
  anders: "Anders"
};

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
    remark: "",
    wallOfFame: false,
    certificate: true,
    certificateName: "",
    linkedin: true,
    source: "",
    ambassador: "",
    via: ""
  };
}

/** Alleen een donatie: geen oliebollen, dus ook niets te bezorgen. */
export function donationOnly(input: Pick<BusinessOrderInput, "withRaisins" | "withoutRaisins" | "donation">): boolean {
  return input.withRaisins + input.withoutRaisins === 0 && input.donation > 0;
}

export function businessTotals(input: BusinessOrderInput, info: BusinessInfo): BusinessTotals {
  const oliebollen = Math.max(0, input.withRaisins) + Math.max(0, input.withoutRaisins);
  const bollen = cents(oliebollen * info.price);
  // Niets te bezorgen zonder oliebollen.
  const bezorgen = input.fulfilment === "bezorgen" && oliebollen > 0;
  const delivery = bezorgen && input.area ? info.fees[input.area] : 0;
  const surcharge = bezorgen ? info.surcharges[input.moment] ?? 0 : 0;
  const subtotal = cents(bollen + delivery + surcharge);
  const vat = cents(subtotal * info.vatRate);
  const total = cents(subtotal + vat);
  const donation = cents(Math.max(0, input.donation) * info.donationPrice);
  return { oliebollen, bollen, delivery, surcharge, subtotal, vat, total, donation, invoice: cents(total + donation), ouderen: ouderenFor(oliebollen, input.donation, info) };
}

/** "2026-12-07" ± dagen, zonder tijdzonegedoe. */
function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Maandag tot en met vrijdag, behalve de feestdagen in info.holidays. */
export function isWorkday(iso: string, info: Pick<BusinessInfo, "holidays">): boolean {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5 && !info.holidays.includes(iso);
}

/** De laatste dag waarop je voor deze leverdag kunt bestellen: leadWorkdays werkdagen ervoor (donderdag → maandag). */
export function lastOrderDay(date: string, info: Pick<BusinessInfo, "holidays" | "leadWorkdays">): string {
  let day = date;
  for (let n = 0; n < info.leadWorkdays; ) {
    day = shiftDay(day, -1);
    if (isWorkday(day, info)) n++;
  }
  return day;
}

/** Na closeAt is zakelijk bestellen dicht voor dit seizoen. */
export function seasonClosed(info: Pick<BusinessInfo, "closeAt">, now = new Date()): boolean {
  return Boolean(info.closeAt) && now.getTime() >= new Date(info.closeAt).getTime();
}

/** Een leverdag kan nog tot en met de laatste besteldag (tot middernacht), en zolang het seizoen open is. */
export function dayOpen(date: string, info: BusinessInfo, now = new Date()): boolean {
  if (seasonClosed(info, now)) return false;
  const until = new Date(`${shiftDay(lastOrderDay(date, info), 1)}T00:00:00`);
  return now.getTime() < until.getTime();
}

/** "3 werkdagen van tevoren" */
export function leadText(info: BusinessInfo): string {
  return info.leadWorkdays === 1 ? "1 werkdag van tevoren" : `${info.leadWorkdays} werkdagen van tevoren`;
}

/**
 * Proef: #/bestellen?nu=2026-12-28T13:00 doet alsof het dan is, om de sluiting en de doorgestreepte dagen te laten zien.
 * Alleen op de pagina; het Apps Script kijkt altijd naar de echte tijd.
 */
export function previewNow(): Date | null {
  const raw = new URLSearchParams(window.location.hash.split("?")[1] ?? window.location.search).get("nu");
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** ?via=naam in de link: de ambassadeur die deze bestelling binnenhaalt. */
export function viaFromLink(): string {
  const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const outer = new URLSearchParams(window.location.search);
  return (params.get("via") ?? outer.get("via") ?? "").trim().slice(0, 100);
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

/** De foutmeldingen van het formulier; de Engelse staan in teksten.ts. */
export const validationNl = {
  pakket: "Kies een pakket, stel zelf je aantal samen, of doneer.",
  tens: "Kies een aantal in tientallen.",
  donation: "Doneer € 2,50 of een veelvoud van € 25.",
  min: (n: number) => `Samen minimaal ${n} oliebollen.`,
  max: (n: number) => `Samen hooguit ${n.toLocaleString("nl-NL")} oliebollen. Meer? Mail ons, dan plannen we het samen.`,
  street: "Vul straat en huisnummer in.",
  postalCode: "Vul een postcode in, zoals 1431 AB.",
  city: "Vul de plaats in.",
  date: "Kies een dag.",
  dateClosed: "Op deze dag komen we niet langs. Kies een andere dag.",
  dateSoon: (info: BusinessInfo) => `Deze dag is te snel: bestel minimaal ${leadText(info)}.`,
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
  if (total === 0 && input.donation === 0) e.pakket = text.pakket;
  for (const key of ["withRaisins", "withoutRaisins"] as const) {
    if (input[key] % 10 !== 0) e[key] = text.tens;
  }
  if (!validDonation(input.donation)) e.donation = text.donation;
  // Alleen een donatie: geen minimum, geen adres en geen dag.
  if (total > 0) {
    if (!e.withRaisins && !e.withoutRaisins && total < info.minimum) e.withRaisins = text.min(info.minimum);
    if (!e.withRaisins && !e.withoutRaisins && total > info.maximum) e.withRaisins = text.max(info.maximum);
    // Afhalen kan niet: we bezorgen altijd.
    if (!input.street.trim()) e.street = text.street;
    if (!POSTCODE.test(input.postalCode.trim())) e.postalCode = text.postalCode;
    if (!input.city.trim()) e.city = text.city;
    if (!input.date) e.date = text.date;
    else if (!info.deliveryDays.includes(input.date)) e.date = text.dateClosed;
    else if (!dayOpen(input.date, info, now)) e.date = text.dateSoon(info);
  }
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
    fulfilment: b.fulfilment === "afhalen" ? "afhalen" : "bezorgen",
    flyers: b.flyers ? "Ja" : "",
    deliveryArea: bezorgen && b.area ? areaLabel[b.area] : undefined,
    deliveryMoment: bezorgen ? momentLabel[b.moment] : undefined
  };
}
