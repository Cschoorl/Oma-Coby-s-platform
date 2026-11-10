import { useSyncExternalStore } from "react";
import type { BusinessArea, BusinessInfo, BusinessMoment, BusinessPackage, BusinessPackageKey } from "../../types/business";
import { BUSINESS_DELIVERY_WINDOW } from "../../config";
import { nextTier, packageCopy, validationNl, type BusinessField, type ValidationText } from "./business";

/*
 * Het zakelijke bestelformulier in het Nederlands en het Engels. Elke tekst van de pagina staat hier, in
 * beide talen naast elkaar; het Engels heeft precies dezelfde vorm (typeof nl), dus een vergeten vertaling
 * is een typefout. Beheer en de mails blijven Nederlands.
 *
 * Vaste woorden in het Engels: oliebollen blijft oliebollen, ouderen zijn seniors, Oma blijft Oma,
 * Brons/Zilver/Goud worden Bronze/Silver/Gold, btw is VAT, rollator is walker.
 */

export type Lang = "nl" | "en";

const KEY = "omacoby-taal";

/**
 * Eerste keuze: ?taal=en in de link, dan wat je eerder koos, dan de browser. Engels alleen als de browser
 * geen Nederlands kent en je niet in de Nederlandse tijdzone zit: veel Nederlanders hebben een Engelse browser.
 */
function detect(): Lang {
  const query = new URLSearchParams(window.location.hash.split("?")[1] ?? window.location.search);
  const asked = query.get("taal") ?? query.get("lang");
  if (asked === "nl" || asked === "en") return asked;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "nl" || saved === "en") return saved;
  } catch {
    // Private mode or blocked storage: fall through to the browser.
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (langs.some((l) => l?.toLowerCase().startsWith("nl"))) return "nl";
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zone === "Europe/Amsterdam" || zone === "Europe/Brussels" ? "nl" : "en";
}

let current: Lang | null = null;
const listeners = new Set<() => void>();

function get(): Lang {
  if (!current) current = detect();
  return current;
}

export function setLang(lang: Lang) {
  current = lang;
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    // Not remembered, still switched.
  }
  listeners.forEach((fn) => fn());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get,
    () => "nl" as Lang
  );
}

/** De teksten in de gekozen taal. */
export function useT(): Teksten {
  return useLang() === "en" ? en : nl;
}

const [from, to] = BUSINESS_DELIVERY_WINDOW.split("–");
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const nl = {
  lang: "nl" as Lang,
  locale: "nl-NL",
  euro: (n: number) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" }),
  /** "€ 20,-" */
  euroRound: (n: number) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" }).replace(",00", ",-"),
  num: (n: number) => n.toLocaleString("nl-NL"),
  /** "Maandag 14 december" */
  longDay: (date: string) => {
    const text = new Date(`${date}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
    return text.charAt(0).toUpperCase() + text.slice(1);
  },
  lead: (info: BusinessInfo) => (info.leadDays === 1 ? "de dag van tevoren" : `${info.leadDays} dagen van tevoren`),

  switchLabel: "Taal",
  step: (n: number) => `Stap ${n}: `,
  optional: "(optioneel)",
  less10: "10 minder",
  more10: "10 meer",
  tier: { brons: "Brons", zilver: "Zilver", goud: "Goud" } as Record<BusinessPackageKey, string>,
  perks: { brons: packageCopy.brons.perks, zilver: packageCopy.zilver.perks, goud: packageCopy.goud.perks } as Record<BusinessPackageKey, string[]>,
  custom: "Zelf samengesteld",
  range: (p: BusinessPackage, info: BusinessInfo) => {
    const next = nextTier(p.oliebollen, info);
    return next ? `${p.oliebollen} tot ${next.oliebollen - 1} oliebollen` : `${p.oliebollen} oliebollen of meer`;
  },
  area: { regio: "Amsterdam of Aalsmeer", buiten: "Buiten Amsterdam" } as Record<BusinessArea, string>,
  areaSub: { regio: "Dichtbij voor de rollator", buiten: "Te ver voor de rollator, wij rijden" } as Record<BusinessArea, string>,
  moment: { regulier: `Tussen ${from} en ${to}`, voor10: "Vóór 10:00", voor9: "Vóór 9:00" } as Record<BusinessMoment, string>,

  // Kop
  title: "Trakteer je team, laat ouderen rock 'n rollen",
  intro: "Verse oliebollen naar het recept van Oma Coby (100). De helft van elke oliebol gaat naar een muziekmiddag voor ouderen die vaak alleen zijn.",
  perOliebol: (vat: number) => `per oliebol, excl. ${vat}% btw`,
  minimum: "oliebollen minimaal",
  tenIsOne: "10 oliebollen is 1 oudere",
  seniorOnFloor: "oudere op de dansvloer",

  // Stap 1
  step1: "Hoeveel ouderen laat je dansen?",
  step1Sub: (perColleague: number) => `Kies een pakket. Reken ${perColleague} oliebollen per collega.`,
  packages: "Pakket",
  tip: "Tip van Oma",
  cardAria: (name: string, range: string, ouderen: number, price: string) => `${name}: ${range}, vanaf ${ouderen} ouderen op de dansvloer, vanaf ${price} excl. btw`,
  cardSeniors: ["ouderen", "op de dansvloer"],
  /** Op de kaart: kort, zodat je de pakketten in één oogopslag vergelijkt. Voluit staan ze in perks. */
  perksShort: {
    brons: ["Impactcertificaat", "Naam op de wall of fame", "Kaartje met ons verhaal"],
    zilver: ["LinkedIn-badge met post", "Logo op de wall of fame", "Kaartje van Oma"],
    goud: ["Kom zelf mee dansen", "Foto of filmpje ervan", "Bovenaan de wall of fame"]
  } as Record<BusinessPackageKey, string[]>,
  allOf: (name: string) => `Alles van ${name}`,
  rangeShort: (p: BusinessPackage, info: BusinessInfo) => {
    const next = nextTier(p.oliebollen, info);
    return next ? `${p.oliebollen}–${next.oliebollen - 1} oliebollen` : `${p.oliebollen}+ oliebollen`;
  },
  fits: (n: string, more: boolean) => (more ? `Voor ${n}+ collega's` : `Voor ± ${n} collega's`),
  from: "vanaf",
  exclVatShort: "excl. btw",
  exclVat: (price: string) => `${price} excl. btw`,
  chosen: "✓ Gekozen",
  choose: (name: string) => `Kies ${name}`,
  otherAmount: "Ander aantal?",
  composeButton: "Stel zelf samen",
  splitTitle: "Met of zonder krenten?",
  composeTitle: "Stel zelf samen",
  splitSub: "Alvast verdeeld zoals de meeste bedrijven kiezen. Pas aan in tientallen.",
  composeSub: (min: number, max: string) => `Samen ${min} tot ${max}, in tientallen.`,
  withRaisins: "met krenten",
  withoutRaisins: "zonder krenten",
  splitAria: (pct: number) => `${pct}% met krenten, ${100 - pct}% zonder`,
  pctWith: (pct: number) => `${pct}% met`,
  pctWithout: (pct: number) => `${pct}% zonder`,
  tierIs: (n: string) => `${n} oliebollen is `,
  upTo: (n: string) => ` (tot ${n})`,
  fell: (n: string, from: string, to: string) => `Onder de ${n} val je uit ${from}: dan krijg je de extra's van ${to}.`,
  nudge: (n: string, tier: string, perk: string, extra: string) => `Nog ${n} tot ${tier}: ${perk.toLowerCase()} en ${extra} ouderen extra.`,
  makeIt: (n: string) => `Maak er ${n} van`,
  donate: "Extra doneren",
  donateSub: (price: string) => `${price} per 10. Voor ouderen aan de bar en minderbedeelden.`,
  flyers: "Doe er flyers bij",
  flyersSub: "standaard niet, dat scheelt papier",

  // Stap 2
  step2: "Wanneer komt Oma langs?",
  step2Sub: "Van de pan rechtstreeks naar jullie deur, nog warm.",
  street: "Straat en huisnummer",
  postalCode: "Postcode",
  city: "Plaats",
  deliveryCost: "Bezorgkosten",
  areaHint: "Bedragen excl. btw. We kiezen dit alvast op basis van de plaats.",
  whichDay: "Welke dag komen we langs?",
  deliveryDay: "Bezorgdag",
  tooSoon: " (te snel)",
  tooSoonTitle: (lead: string) => `Te snel: bestel uiterlijk ${lead}`,
  crossedOut: (lead: string) => `Doorgestreept: te snel. Bestellen kan tot en met ${lead}.`,
  otherMoment: "Liever een ander moment?",
  mailUs: "Mail ons",
  mailSubject: "Zakelijke bestelling",
  whatTime: "Hoe laat?",
  deliveryMoment: "Bezorgmoment",
  surcharge: (price: string) => `+ ${price} excl. btw`,
  noSurcharge: "Geen toeslag",
  moreAddresses: "Meerdere adressen?",
  moreAddressesText: "Bestel per adres. Na het versturen voeg je met één klik het volgende toe.",

  // Stap 3
  step3: "Je gegevens",
  step3Sub: "Voor de bezorger en de factuur.",
  company: "Naam onderneming",
  contact: "Contactpersoon",
  phone: "Telefoonnummer",
  phoneHint: "Voor als de bezorger je even nodig heeft.",
  email: "E-mailadres",
  emailHint: "Hier sturen we de bevestiging heen.",
  sameInvoice: "Factuur naar hetzelfde e-mailadres",
  invoiceEmail: "E-mailadres voor de factuur",
  invoiceEmailPlaceholder: "facturen@bedrijf.nl",
  invoiceAddress: "Factuuradres",
  invoiceAddressHint: "Als het anders is dan het bezorgadres.",
  reference: "Referentie of grootboeknummer",
  referenceHint: "Zetten we op de factuur.",
  remark: "Wil je nog iets kwijt?",
  remarkHint: "Opmerkingen, vragen, ideeën of een aanbelinstructie.",
  privacy: "We gebruiken je gegevens alleen voor je bestelling bij Oma Coby's Oliebollenbar en delen ze niet met anderen.",

  // Overzicht
  yourOrder: "Je bestelling",
  package: "Pakket",
  bollenLine: (n: string, price: string) => `${n} oliebollen × ${price}`,
  delivery: "Bezorgen",
  deliveryTo: (area: string) => `Bezorgen, ${area}`,
  subtotal: "Subtotaal excl. btw",
  vat: (pct: number) => `Btw ${pct}%`,
  total: "Totaal incl. btw",
  donationLine: (n: string) => `Extra donatie, ${n} oliebollen`,
  onInvoice: "Op je factuur",
  short: (n: string, min: number) => `~ Nog ${n} tot het minimum van ${min} oliebollen.`,
  goodFor: "Goed voor",
  seniors: (n: number) => plural(n, "oudere", "ouderen"),
  onFloor: "op de dansvloer",
  donated: (n: string) => `, en ${n} gedoneerde oliebollen gaan naar ouderen aan de bar.`,
  emptyOverview: "Kies een pakket. Elke 10 oliebollen geven een oudere een middag op de dansvloer.",
  missing: (n: number) => `Nog ${n === 1 ? "één ding" : `${n} dingen`} invullen: `,
  sending: "Versturen…",
  orderN: (n: string) => `Bestel ${n} oliebollen`,
  placeOrder: "Bestelling plaatsen",
  payLater: "Betalen achteraf, op factuur. Kopie direct in je mail.",
  forYourself: "Bestel je voor jezelf? Dat gaat via",
  barSeniors: (n: string) => `${n} ouderen`,
  toOverview: "Naar overzicht",
  fields: {
    pakket: "pakket",
    withRaisins: "aantal oliebollen",
    withoutRaisins: "aantal zonder krenten",
    donation: "donatie",
    flyers: "flyers",
    fulfilment: "bezorgen",
    area: "bezorgkosten",
    moment: "bezorgmoment",
    date: "dag",
    pickupAgreed: "afhalen",
    street: "straat",
    postalCode: "postcode",
    city: "plaats",
    company: "onderneming",
    contact: "contactpersoon",
    phone: "telefoon",
    email: "e-mailadres",
    invoiceEmail: "e-mail voor de factuur",
    invoiceAddress: "factuuradres",
    reference: "referentie",
    remark: "opmerking"
  } as Record<BusinessField, string>,
  validation: validationNl as ValidationText,

  // Bevestiging
  thanks: "Bedankt!",
  doneTitle: (n: string) => `Jullie laten ${n} ouderen rock 'n rollen`,
  doneTitleEmpty: "Je bestelling is binnen",
  doneText: (company: string) => `Je bestelling voor ${company} is binnen. We kijken alles na en bevestigen hem per mail. Een kopie staat al klaar in `,
  hallSign: "Dankzij jullie",
  hallUnit: (n: number) => plural(n, "oudje", "oudjes"),
  hallAria: (n: string) => `Discozaal met ${n} dansende oudjes`,
  hallCaption: (n: number, company: string) =>
    `Zo ziet de dansvloer eruit: ${n.toLocaleString("nl-NL")} ${plural(n, "oudere", "ouderen")} op een speciaal georganiseerde muziekmiddag, namens ${company}. Elk oudje is 10 oliebollen.`,
  orderNumber: "Bestelnummer",
  rowOliebollen: "Oliebollen",
  splitShort: (total: string, met: string, zonder: string) => `${total} (${met} met · ${zonder} zonder)`,
  rowDonated: "Extra gedoneerd",
  rowDonatedValue: (n: string) => `${n} oliebollen`,
  rowVisit: "Oma komt langs",
  youGetWith: (name: string) => `Je krijgt erbij met ${name}`,
  keepNumber: "Bewaar je bestelnummer; we nemen contact met je op.",
  demo: "Demo: er is geen mail verstuurd. De bestelling staat bij beheer onder Zakelijk.",
  another: "Nog een adres toevoegen",
  newOrder: "Nieuwe bestelling",
  questions: "Vragen? Mail",
  orCall: "of bel",
  mentionNumber: "en noem je bestelnummer."
};

export type Teksten = typeof nl;

const en: Teksten = {
  lang: "en",
  locale: "en-GB",
  euro: (n) => n.toLocaleString("en-GB", { style: "currency", currency: "EUR" }),
  euroRound: (n) => n.toLocaleString("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
  num: (n) => n.toLocaleString("en-GB"),
  longDay: (date) => new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
  lead: (info) => (info.leadDays === 1 ? "the day before" : `${info.leadDays} days ahead`),

  switchLabel: "Language",
  step: (n) => `Step ${n}: `,
  optional: "(optional)",
  less10: "10 fewer",
  more10: "10 more",
  tier: { brons: "Bronze", zilver: "Silver", goud: "Gold" },
  perks: {
    brons: ["Impact certificate with your number of seniors", "Your name on the wall of fame", "A card with the story behind the oliebollen"],
    zilver: ["LinkedIn badge with a ready-made post", "Your logo on the wall of fame", "A card from Oma for whoever ordered"],
    goud: ["An invitation to the music afternoon itself", "Photo or video of your afternoon", "A podium spot on the wall of fame"]
  },
  custom: "Custom",
  range: (p, info) => {
    const next = nextTier(p.oliebollen, info);
    return next ? `${p.oliebollen} to ${next.oliebollen - 1} oliebollen` : `${p.oliebollen} oliebollen or more`;
  },
  area: { regio: "Amsterdam or Aalsmeer", buiten: "Outside Amsterdam" },
  areaSub: { regio: "Close enough for a walker", buiten: "Too far for a walker, so we drive" },
  moment: { regulier: `Between ${from} and ${to}`, voor10: "Before 10:00", voor9: "Before 9:00" },

  title: "Treat your team, get seniors rock 'n rolling",
  intro: "Fresh oliebollen, the Dutch doughnut, made to the recipe of 100-year-old Oma Coby. Half of every oliebol pays for a music afternoon for seniors who are often alone.",
  perOliebol: (vat) => `per oliebol, excl. ${vat}% VAT`,
  minimum: "oliebollen minimum",
  tenIsOne: "10 oliebollen is 1 senior",
  seniorOnFloor: "senior on the dance floor",

  step1: "How many seniors will you get dancing?",
  step1Sub: (perColleague) => `Pick a package. Count on ${perColleague} oliebollen per colleague.`,
  packages: "Package",
  tip: "Oma's tip",
  cardAria: (name, range, ouderen, price) => `${name}: ${range}, from ${ouderen} seniors on the dance floor, from ${price} excl. VAT`,
  cardSeniors: ["seniors", "on the dance floor"],
  perksShort: {
    brons: ["Impact certificate", "Name on the wall of fame", "Card with our story"],
    zilver: ["LinkedIn badge and post", "Logo on the wall of fame", "Card from Oma"],
    goud: ["Come and dance along", "Photo or video of it", "Top of the wall of fame"]
  },
  allOf: (name) => `Everything in ${name}`,
  rangeShort: (p, info) => {
    const next = nextTier(p.oliebollen, info);
    return next ? `${p.oliebollen}–${next.oliebollen - 1} oliebollen` : `${p.oliebollen}+ oliebollen`;
  },
  fits: (n, more) => (more ? `For ${n}+ colleagues` : `For ± ${n} colleagues`),
  from: "from",
  exclVatShort: "excl. VAT",
  exclVat: (price) => `${price} excl. VAT`,
  chosen: "✓ Chosen",
  choose: (name) => `Choose ${name}`,
  otherAmount: "A different number?",
  composeButton: "Build your own",
  splitTitle: "With or without raisins?",
  composeTitle: "Build your own",
  splitSub: "Split the way most companies choose. Adjust in tens.",
  composeSub: (min, max) => `${min} to ${max} in total, in tens.`,
  withRaisins: "with raisins",
  withoutRaisins: "without raisins",
  splitAria: (pct) => `${pct}% with raisins, ${100 - pct}% without`,
  pctWith: (pct) => `${pct}% with`,
  pctWithout: (pct) => `${pct}% without`,
  tierIs: (n) => `${n} oliebollen is `,
  upTo: (n) => ` (up to ${n})`,
  fell: (n, from, to) => `Below ${n} you drop out of ${from} and get the extras of ${to}.`,
  nudge: (n, tier, perk, extra) => `${n} more to ${tier}: ${perk.charAt(0).toLowerCase() + perk.slice(1)} and ${extra} more seniors.`,
  makeIt: (n) => `Make it ${n}`,
  donate: "Donate extra",
  donateSub: (price) => `${price} per 10. For seniors at the bar and people in need.`,
  flyers: "Add flyers",
  flyersSub: "off by default, saves paper",

  step2: "When does Oma drop by?",
  step2Sub: "Straight from the pan to your door, still warm.",
  street: "Street and number",
  postalCode: "Postcode",
  city: "Town",
  deliveryCost: "Delivery cost",
  areaHint: "Amounts excl. VAT. We pick this for you based on the town.",
  whichDay: "Which day should we come?",
  deliveryDay: "Delivery day",
  tooSoon: " (too soon)",
  tooSoonTitle: (lead) => `Too soon: order ${lead} at the latest`,
  crossedOut: (lead) => `Crossed out: too soon. You can order up to ${lead}.`,
  otherMoment: "Prefer another time?",
  mailUs: "Email us",
  mailSubject: "Business order",
  whatTime: "What time?",
  deliveryMoment: "Delivery time",
  surcharge: (price) => `+ ${price} excl. VAT`,
  noSurcharge: "No surcharge",
  moreAddresses: "Several addresses?",
  moreAddressesText: "Order per address. Once sent, add the next one in one click.",

  step3: "Your details",
  step3Sub: "For the courier and the invoice.",
  company: "Company name",
  contact: "Contact person",
  phone: "Phone number",
  phoneHint: "In case the courier needs you.",
  email: "Email address",
  emailHint: "We'll send the confirmation here.",
  sameInvoice: "Send the invoice to the same address",
  invoiceEmail: "Email address for the invoice",
  invoiceEmailPlaceholder: "invoices@company.com",
  invoiceAddress: "Invoice address",
  invoiceAddressHint: "If it differs from the delivery address.",
  reference: "Reference or PO number",
  referenceHint: "We'll put it on the invoice.",
  remark: "Anything else?",
  remarkHint: "Notes, questions, ideas or doorbell instructions.",
  privacy: "We only use your details for your order with Oma Coby's Oliebollenbar and never share them.",

  yourOrder: "Your order",
  package: "Package",
  bollenLine: (n, price) => `${n} oliebollen × ${price}`,
  delivery: "Delivery",
  deliveryTo: (area) => `Delivery, ${area}`,
  subtotal: "Subtotal excl. VAT",
  vat: (pct) => `VAT ${pct}%`,
  total: "Total incl. VAT",
  donationLine: (n) => `Extra donation, ${n} oliebollen`,
  onInvoice: "On your invoice",
  short: (n, min) => `~ ${n} more to reach the minimum of ${min} oliebollen.`,
  goodFor: "Good for",
  seniors: (n) => plural(n, "senior", "seniors"),
  onFloor: "on the dance floor",
  donated: (n) => `, and ${n} donated oliebollen go to seniors at the bar.`,
  emptyOverview: "Pick a package. Every 10 oliebollen give a senior an afternoon on the dance floor.",
  missing: (n) => (n === 1 ? "One thing left to fill in: " : `${n} things left to fill in: `),
  sending: "Sending…",
  orderN: (n) => `Order ${n} oliebollen`,
  placeOrder: "Place order",
  payLater: "Pay afterwards by invoice. A copy lands in your inbox right away.",
  forYourself: "Ordering just for yourself? Go to",
  barSeniors: (n) => `${n} seniors`,
  toOverview: "View order",
  fields: {
    pakket: "package",
    withRaisins: "number of oliebollen",
    withoutRaisins: "number without raisins",
    donation: "donation",
    flyers: "flyers",
    fulfilment: "delivery",
    area: "delivery cost",
    moment: "delivery time",
    date: "day",
    pickupAgreed: "pickup",
    street: "street",
    postalCode: "postcode",
    city: "town",
    company: "company",
    contact: "contact person",
    phone: "phone",
    email: "email address",
    invoiceEmail: "invoice email",
    invoiceAddress: "invoice address",
    reference: "reference",
    remark: "note"
  },
  validation: {
    pakket: "Pick a package, or build your own.",
    tens: "Choose a number in tens.",
    min: (n) => `At least ${n} oliebollen in total.`,
    max: (n) => `At most ${n.toLocaleString("en-GB")} oliebollen in total. More? Email us and we'll plan it together.`,
    street: "Fill in street and number.",
    postalCode: "Fill in a postcode, like 1431 AB.",
    city: "Fill in the town.",
    area: "Choose where we deliver.",
    date: "Choose a day.",
    dateClosed: "We don't deliver on this day. Choose another one.",
    dateSoon: (info) => `This day is too soon: order ${info.leadDays === 1 ? "the day before" : `${info.leadDays} days ahead`} at the latest.`,
    company: "Fill in your company name.",
    contact: "Fill in the contact person's name.",
    phone: "Fill in a phone number, like 06 12345678.",
    email: "Fill in a valid email address.",
    invoiceEmail: "Fill in a valid email address for the invoice."
  },

  thanks: "Thank you!",
  doneTitle: (n) => `You're getting ${n} seniors rock 'n rolling`,
  doneTitleEmpty: "We've got your order",
  doneText: (company) => `Your order for ${company} is in. We'll check everything and confirm by email. A copy is already waiting at `,
  hallSign: "Thanks to you",
  hallUnit: (n) => plural(n, "senior", "seniors"),
  hallAria: (n) => `Disco hall with ${n} dancing seniors`,
  hallCaption: (n, company) =>
    `This is the dance floor: ${n.toLocaleString("en-GB")} ${plural(n, "senior", "seniors")} at a specially organised music afternoon, on behalf of ${company}. Each senior is 10 oliebollen.`,
  orderNumber: "Order number",
  rowOliebollen: "Oliebollen",
  splitShort: (total, met, zonder) => `${total} (${met} with · ${zonder} without)`,
  rowDonated: "Extra donated",
  rowDonatedValue: (n) => `${n} oliebollen`,
  rowVisit: "Oma drops by",
  youGetWith: (name) => `You also get with ${name}`,
  keepNumber: "Keep your order number; we'll be in touch.",
  demo: "Demo: no email was sent. The order is listed in admin under Zakelijk.",
  another: "Add another address",
  newOrder: "New order",
  questions: "Questions? Email",
  orCall: "or call",
  mentionNumber: "and mention your order number."
};
