import { useSyncExternalStore } from "react";
import type { BusinessArea, BusinessInfo, BusinessMoment, BusinessPackage, BusinessOccasion, BusinessPackageKey, BusinessSource } from "../../types/business";
import { BUSINESS_DELIVERY_WINDOW } from "../../config";
import { nextTier, packageCopy, validationNl, type BusinessField, type ValidationText } from "./business";

/*
 * Het zakelijke bestelformulier in het Nederlands en het Engels. Elke tekst van de pagina staat hier, in
 * beide talen naast elkaar; het Engels heeft precies dezelfde vorm (typeof nl), dus een vergeten vertaling
 * is een typefout. Beheer en de mails blijven Nederlands.
 *
 * Vaste woorden in het Engels: oliebollen blijft oliebollen, ouderen zijn seniors, Oma blijft Oma, btw is VAT.
 * De pakketnamen (Danspartner, Polonaisepartner, Feestpartner) blijven in beide talen Nederlands: het zijn namen.
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
  lead: (info: BusinessInfo) => (info.leadWorkdays === 1 ? "1 werkdag van tevoren" : `${info.leadWorkdays} werkdagen van tevoren`),
  /** "maandag 28 december 12:00" */
  closeText: (info: BusinessInfo) => {
    const d = new Date(info.closeAt);
    return `${d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })} ${d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`;
  },

  switchLabel: "Taal",
  step: (n: number) => `Stap ${n}: `,
  steps: "Stappen",
  stepOf: (n: number, total: number) => `Stap ${n} van ${total}`,
  next: "Volgende",
  nextTo: (title: string) => `Volgende: ${title.toLowerCase()}`,
  back: "Vorige",
  skipped: "niet nodig bij alleen de Partypot",
  stepMissing: (n: number) => `Nog ${n === 1 ? "één ding" : `${n} dingen`} invullen in deze stap: `,
  optional: "(optioneel)",
  less10: "10 minder",
  more10: "10 meer",
  tier: { brons: "Danspartner", zilver: "Polonaisepartner", goud: "Feestpartner", middag60: "Bandpartner", middag100: "Bandpartner" } as Record<BusinessPackageKey, string>,
  perks: {
    brons: packageCopy.brons.perks,
    zilver: packageCopy.zilver.perks,
    goud: packageCopy.goud.perks,
    middag60: packageCopy.middag60.perks,
    middag100: packageCopy.middag100.perks
  } as Record<BusinessPackageKey, string[]>,
  custom: "Zelf samengesteld",
  range: (p: BusinessPackage, info: BusinessInfo) => {
    const next = nextTier(p.oliebollen, info);
    return next ? `${p.oliebollen} tot ${next.oliebollen - 1} oliebollen` : `${p.oliebollen} oliebollen of meer`;
  },
  area: { regio: "Amsterdam of Aalsmeer", buiten: "Buiten Amsterdam en Aalsmeer" } as Record<BusinessArea, string>,
  areaSub: { regio: "Groot-Amsterdam, Aalsmeer en Kudelstaart", buiten: "daarbuiten" } as Record<BusinessArea, string>,
  moment: { regulier: `Tussen ${from} en ${to}`, voor10: "Vóór 10:00 (op aanvraag)", voor9: "Vóór 9:00" } as Record<BusinessMoment, string>,

  // Kop
  title: "Laat ouderen rock & rollen. Jullie team krijgt de oliebollen.",
  intro:
    "Jullie oliebollen maken van de kantine van een zorgcentrum weer even de dancing van vroeger: livemuziek, dansen en herinneringen. De opbrengst gaat naar speciaal georganiseerde muziekmiddagen voor ouderen, zoals Gouwe Ouwe. Gebakken naar het recept van de 100-jarige Oma Coby, met gratis poedersuiker.",
  perOliebol: (vat: number, incl: string) => `per oliebol, excl. ${vat}% btw (${incl} incl.)`,
  minimum: "oliebollen minimaal",
  heroAlt: "Oma Coby aan tafel in een bruin café, met Mark naast haar en een schaal oliebollen",
  tenIsOne: "10 oliebollen is 1 oudje",
  seniorOnFloor: "oudje op de dansvloer",
  howItWorks: "Hoe werkt dat?",
  howItWorksText: "De opbrengst van jullie oliebollen gaat, samen met bijdragen van andere gevers, naar muziekmiddagen in zorgcentra en buurthuizen die het zelf niet kunnen betalen.",

  // Stap 1
  step1: "Jullie bestelling",
  step1Sub: (perColleague: number) => `Kies een pakket of reken met je collega's (${perColleague} oliebollen per collega). Gratis poedersuiker erbij.`,
  packages: "Pakket",
  tip: "Tip van Oma",
  cardAria: (name: string, range: string, ouderen: number, price: string) => `${name}: ${range}, vanaf ${ouderen} oudjes op de dansvloer, vanaf ${price} excl. btw`,
  cardSeniors: ["oudjes", "op de dansvloer"],
  /** Op de kaart: kort, zodat je de pakketten in één oogopslag vergelijkt. Voluit staan ze in perks. */
  perksShort: {
    brons: ["Impactcertificaat", "Naam op de wall of fame", "Kaartje met ons verhaal"],
    zilver: ["LinkedIn-badge met post", "Logo op de wall of fame", "Oma's Oliebal voor de kerstboom"],
    goud: ["Kom mee naar een muziekmiddag", "Foto of filmpje ervan", "Ereplek op de wall of fame", "Bezorging in heel Nederland"],
    middag60: ["Jullie naam op de middag", "Jullie kiezen de plek", "Collega's mogen komen", "Foto of filmpje ervan"],
    middag100: ["Jullie naam op de middag", "Jullie kiezen de plek", "Collega's mogen komen", "Foto of filmpje ervan"]
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
  colleaguesTitle: "Reken met het aantal collega's",
  colleagues: "Aantal collega's",
  colleaguesHint: (per: number, n: string) => `${per} oliebollen per collega: dat zijn er ${n}.`,
  colleaguesEmpty: (per: number) => `We rekenen ${per} oliebollen per collega en ronden af op tientallen.`,
  occasionLabel: "Waarvoor is het?",
  occasion: { borrel: "Borrel", event: "Event", relatiegeschenk: "Relatiegeschenk" } as Record<Exclude<BusinessOccasion, "">, string>,
  occasionSub: { borrel: "Met het team of de afdeling", event: "Klanten, open dag of feest", relatiegeschenk: "Om weg te geven" } as Record<Exclude<BusinessOccasion, "">, string>,
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
  nudge: (n: string, tier: string, perk: string, extra: string) => `Nog ${n} bollen tot ${tier}: ${perk.charAt(0).toLowerCase() + perk.slice(1)} en ${extra} oudjes extra.`,
  makeIt: (n: string) => `Maak er ${n} van`,
  donate: "De Partypot",
  donateSub: "Geeft het laatste zetje aan muziekmiddagen voor ouderen die er anders niet komen. Ook zonder oliebollen te bestellen.",
  donateAmount: (euro: string) => `${euro} in de Partypot`,
  donateNone: "Nog niets in de Partypot",
  donateOwn: "Eigen bedrag",
  donateOwnAria: "Eigen bedrag in hele euro's",
  donateClear: "Geen bijdrage",
  potStand: (raised: string, goal: string) => `${raised} van ${goal}`,
  potStandLabel: "Stand van de Partypot",
  adoptTitle: "Of realiseer jullie eigen muziekmiddag",
  adoptSub: "Bandpartner: een hele middag met livemuziek, op naam van jullie bedrijf. Jullie maken het mogelijk, wij regelen het.",
  adoptSeniors: (n: number) => `Een eigen middag voor ${n} gasten`,
  adoptIncl: (n: string) => `inclusief ${n} oliebollen`,
  adoptChoose: "Kies deze middag",
  adoptBack: (n: string) => `Een eigen middag is inclusief precies ${n} oliebollen. Zet het aantal terug om hem te kiezen.`,
  adoptAria: (ouderen: number, n: string, price: string) => `Bandpartner: een eigen middag voor ${ouderen} gasten, inclusief ${n} oliebollen, ${price} excl. btw`,
  adoptGuests: (n: number) => `${n} gasten`,

  // Stap 2
  step2: "Waar en wanneer",
  step2Sub: "Alle doordeweekse dagen in december en de eerste week van januari.",
  step2Donation: "Alleen een donatie: er valt niets te bezorgen. Ga door naar je gegevens.",
  street: "Straat en huisnummer",
  postalCode: "Postcode",
  city: "Plaats",
  deliveryCost: "Bezorgkosten",
  areaHint: "Excl. btw. Je postcode bepaalt het tarief.",
  areaEmpty: "Vul je postcode in, dan rekenen we de bezorgkosten uit.",
  postcodeShort: (pc: string) => `Postcode ${pc}`,
  whichDay: "Welke dag komen we langs?",
  deliveryDay: "Bezorgdag",
  tooSoon: " (te snel)",
  tooSoonTitle: (lead: string) => `Te snel: bestel uiterlijk ${lead}`,
  crossedOut: (lead: string) => `Doorgestreept: te snel. Bestel minimaal ${lead}.`,
  deadline: (lead: string, close: string) => `Bestel minimaal ${lead}, uiterlijk ${close}.`,
  closedTitle: "Zakelijk bestellen is gesloten voor dit seizoen",
  closedText: "Dank je wel voor je interesse! Volgend jaar bakken we weer. Een vraag, of wil je toch nog iets regelen?",
  otherMoment: "Liever een ander moment?",
  mailUs: "Mail ons",
  mailSubject: "Zakelijke bestelling",
  whatTime: "Hoe laat?",
  standardTimeSub: "We bezorgen tussen deze tijden, zonder toeslag.",
  otherTime: "Andere tijd nodig?",
  earlyRequest: "We laten binnen 2 werkdagen weten of het lukt.",
  earlyBack: "Toch tussen de standaardtijden",
  deliveryMoment: "Bezorgmoment",
  surcharge: (price: string) => `+ ${price} excl. btw`,
  noSurcharge: "Geen toeslag",
  moreAddresses: "Meerdere adressen?",
  moreAddressesText: "Bestel per adres. Na het versturen voeg je met één klik het volgende toe.",

  // Stap 3
  step3: "Gegevens en factuur",
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
  extras: "Wat mogen we met jullie naam doen?",
  wallOfFame: (logo: boolean) => `Ja, zet ons op de wall of fame: onze naam${logo ? ", ons logo" : ""} en het aantal oudjes. Nooit bedragen.`,
  certificate: "Ja, graag een impactcertificaat",
  certificateName: "Naam op het certificaat",
  linkedin: "Ja, graag een LinkedIn-badge met een kant-en-klare post",
  logoHint: "Je logo vragen we later per mail.",
  sourceLabel: "Hoe kwamen jullie bij ons terecht?",
  sourcePick: "Kies…",
  sources: {
    ambassadeur: "Via een ambassadeur van Oma Coby's Oliebollenbar",
    collega: "Via een collega of kennis",
    klant: "Vorig jaar al klant",
    linkedin: "LinkedIn",
    instagram: "Instagram",
    pers: "Pers of nieuws",
    google: "Google",
    anders: "Anders"
  } as Record<Exclude<BusinessSource, "">, string>,
  ambassador: "Naam van de ambassadeur",
  cardNote: "We doen er altijd een kaartje met ons verhaal bij.",

  // Overzicht
  yourOrder: "Je bestelling",
  package: "Pakket",
  bollenLine: (n: string, price: string) => `${n} oliebollen × ${price}`,
  sugar: "Poedersuiker",
  free: "gratis",
  delivery: "Bezorgen",
  deliveryTo: (area: string) => `Bezorgen, ${area}`,
  subtotal: "Subtotaal excl. btw",
  vat: (pct: number) => `Btw ${pct}%`,
  total: "Totaal incl. btw",
  donationLine: "In de Partypot",
  donationNoVat: "Bijdrage aan de Partypot (geen btw)",
  inPot: (euro: string) => `+ ${euro} in de Partypot`,
  onInvoice: "Op je factuur",
  short: (n: string, min: number) => `~ Nog ${n} tot het minimum van ${min} oliebollen.`,
  goodFor: "Goed voor",
  seniors: (n: number) => plural(n, "oudje", "oudjes"),
  onFloor: "op de dansvloer",
  emptyOverview: "Kies een pakket of doe iets in de Partypot. Met 10 oliebollen laat je één oudje rock'n'rollen.",
  missing: (n: number) => `Nog ${n === 1 ? "één ding" : `${n} dingen`} invullen: `,
  sending: "Versturen…",
  orderN: (n: string, ouderen: number) => `Bestel ${n} bollen · laat ${ouderen} ${plural(ouderen, "oudje", "oudjes")} dansen`,
  donateN: (euro: string) => `Doneer ${euro} in de Partypot`,
  orderBand: (n: string) => `Bestel jullie eigen middag voor ${n} gasten`,
  placeOrder: "Bestelling plaatsen",
  payLater: "Betalen achteraf, op factuur. Kopie direct in je mail.",
  forYourself: "Bestel je voor jezelf? Dat gaat via",
  barSeniors: (n: string) => `${n} oudjes`,
  toOverview: "Naar overzicht",
  fields: {
    pakket: "pakket",
    withRaisins: "aantal oliebollen",
    withoutRaisins: "aantal zonder krenten",
    occasion: "waarvoor het is",
    donation: "donatie",
    flyers: "flyers",
    wallOfFame: "wall of fame",
    certificate: "certificaat",
    certificateName: "naam op het certificaat",
    linkedin: "LinkedIn-badge",
    source: "hoe jullie ons vonden",
    ambassador: "ambassadeur",
    via: "link",
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
  doneTitle: (n: string, count: number) => `Jullie laten ${n} ${plural(count, "oudje", "oudjes")} rock 'n rollen`,
  doneTitleEmpty: "Je bestelling is binnen",
  doneText: (company: string) => `Je bestelling voor ${company} is binnen. We kijken alles na en bevestigen hem per mail. Een kopie staat al klaar in `,
  hallSign: "Dankzij jullie",
  hallUnit: (n: number) => plural(n, "oudje", "oudjes"),
  hallAria: (n: string) => `Discozaal met ${n} dansende oudjes`,
  hallCaption: (n: number, company: string, band: boolean) =>
    band
      ? `Zo ziet jullie eigen middag eruit: ${n.toLocaleString("nl-NL")} gasten op de dansvloer, namens ${company}.`
      : `Zo ziet de dansvloer eruit: ${n.toLocaleString("nl-NL")} ${plural(n, "oudje", "oudjes")} op een speciaal georganiseerde muziekmiddag, namens ${company}. Met 10 oliebollen laat je één oudje rock'n'rollen.`,
  orderNumber: "Bestelnummer",
  rowOliebollen: "Oliebollen",
  splitShort: (total: string, met: string, zonder: string) => `${total} (${met} met · ${zonder} zonder)`,
  rowDonated: "Partypot",
  rowDonatedValue: (euro: string) => `${euro} bijdrage aan de Partypot`,
  doneDonation: (company: string) => `Je bijdrage aan de Partypot namens ${company} is binnen. De factuur volgt per mail; een kopie staat al klaar in `,
  doneDonationTitle: "Je bijdrage aan de Partypot is binnen",
  doneGuests: (n: string) => `Jullie eigen middag voor ${n} gasten`,
  doneEarly: "Vóór 10:00 is een aanvraag: we laten binnen 2 werkdagen weten of het lukt.",
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
  lead: (info) => (info.leadWorkdays === 1 ? "1 working day ahead" : `${info.leadWorkdays} working days ahead`),
  closeText: (info) => {
    const d = new Date(info.closeAt);
    return `${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  },

  switchLabel: "Language",
  step: (n) => `Step ${n}: `,
  steps: "Steps",
  stepOf: (n, total) => `Step ${n} of ${total}`,
  next: "Next",
  nextTo: (title) => `Next: ${title.toLowerCase()}`,
  back: "Back",
  skipped: "not needed for the Partypot only",
  stepMissing: (n) => (n === 1 ? "One thing left to fill in on this step: " : `${n} things left to fill in on this step: `),
  optional: "(optional)",
  less10: "10 fewer",
  more10: "10 more",
  tier: { brons: "Danspartner", zilver: "Polonaisepartner", goud: "Feestpartner", middag60: "Bandpartner", middag100: "Bandpartner" },
  perks: {
    brons: ["Impact certificate with your number of seniors", "Your name on the wall of fame", "A card with the story behind the oliebollen"],
    zilver: ["LinkedIn badge with a ready-made post", "Your logo on the wall of fame", "Oma Coby's Oliebal (limited edition) for your Christmas tree"],
    goud: ["An invitation to a music afternoon", "A photo or short video of the afternoon you helped make happen", "A place of honour on the wall of fame", "Delivery anywhere in the Netherlands"],
    middag60: ["Your name on the afternoon", "You choose the venue: a care home or community centre", "Colleagues are welcome (numbers by arrangement)", "A photo or video of the afternoon"],
    middag100: ["Your name on the afternoon", "You choose the venue: a care home or community centre", "Colleagues are welcome (numbers by arrangement)", "A photo or video of the afternoon"]
  },
  custom: "Custom",
  range: (p, info) => {
    const next = nextTier(p.oliebollen, info);
    return next ? `${p.oliebollen} to ${next.oliebollen - 1} oliebollen` : `${p.oliebollen} oliebollen or more`;
  },
  area: { regio: "Amsterdam or Aalsmeer", buiten: "Outside Amsterdam and Aalsmeer" },
  areaSub: { regio: "Greater Amsterdam, Aalsmeer and Kudelstaart", buiten: "further away" },
  moment: { regulier: `Between ${from} and ${to}`, voor10: "Before 10:00 (on request)", voor9: "Before 9:00" },

  title: "Get seniors rock & rolling. Your team gets the oliebollen.",
  intro:
    "Your oliebollen turn the canteen of a care home back into the dance hall of the old days for an afternoon: live music, dancing and memories. The proceeds go to specially organised music afternoons for seniors, such as Gouwe Ouwe. Made to the recipe of 100-year-old Oma Coby, with free powdered sugar.",
  perOliebol: (vat, incl) => `per oliebol, excl. ${vat}% VAT (${incl} incl.)`,
  minimum: "oliebollen minimum",
  heroAlt: "Oma Coby at a table in a traditional Dutch café, with Mark beside her holding a plate of oliebollen",
  tenIsOne: "10 oliebollen is 1 senior",
  seniorOnFloor: "senior on the dance floor",
  howItWorks: "How does that work?",
  howItWorksText: "The proceeds of your oliebollen, together with contributions from other givers, go to music afternoons in care homes and community centres that can't afford them on their own.",

  step1: "Your order",
  step1Sub: (perColleague) => `Pick a package or count by colleagues (${perColleague} oliebollen each). Free powdered sugar included.`,
  packages: "Package",
  tip: "Oma's tip",
  cardAria: (name, range, ouderen, price) => `${name}: ${range}, from ${ouderen} seniors on the dance floor, from ${price} excl. VAT`,
  cardSeniors: ["seniors", "on the dance floor"],
  perksShort: {
    brons: ["Impact certificate", "Name on the wall of fame", "Card with our story"],
    zilver: ["LinkedIn badge and post", "Logo on the wall of fame", "Oma's Oliebal for the tree"],
    goud: ["Join a music afternoon", "Photo or video of it", "Place of honour on the wall of fame", "Delivery across the Netherlands"],
    middag60: ["Your name on the afternoon", "You choose the venue", "Colleagues welcome", "Photo or video of it"],
    middag100: ["Your name on the afternoon", "You choose the venue", "Colleagues welcome", "Photo or video of it"]
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
  colleaguesTitle: "Count by colleagues",
  colleagues: "Number of colleagues",
  colleaguesHint: (per, n) => `${per} oliebollen per colleague: that makes ${n}.`,
  colleaguesEmpty: (per) => `We count ${per} oliebollen per colleague, rounded up to tens.`,
  occasionLabel: "What is it for?",
  occasion: { borrel: "Drinks", event: "Event", relatiegeschenk: "Business gift" },
  occasionSub: { borrel: "With the team or department", event: "Clients, open day or party", relatiegeschenk: "To give away" },
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
  nudge: (n, tier, perk, extra) => `${n} more oliebollen to ${tier}: ${perk.charAt(0).toLowerCase() + perk.slice(1)} and ${extra} more seniors.`,
  makeIt: (n) => `Make it ${n}`,
  donate: "The Partypot",
  donateSub: "Gives the final push to music afternoons for seniors who otherwise wouldn't get there. Also without ordering oliebollen.",
  donateAmount: (euro) => `${euro} in the Partypot`,
  donateNone: "Nothing in the Partypot yet",
  donateOwn: "Other amount",
  donateOwnAria: "Other amount in whole euros",
  donateClear: "No contribution",
  potStand: (raised, goal) => `${raised} of ${goal}`,
  potStandLabel: "Partypot so far",
  adoptTitle: "Or make your own music afternoon happen",
  adoptSub: "Bandpartner: a whole afternoon with live music, in your company's name. You make it possible, we arrange it.",
  adoptSeniors: (n) => `Your own afternoon for ${n} guests`,
  adoptIncl: (n) => `including ${n} oliebollen`,
  adoptChoose: "Choose this afternoon",
  adoptBack: (n) => `Your own afternoon includes exactly ${n} oliebollen. Set the number back to choose it.`,
  adoptAria: (ouderen, n, price) => `Bandpartner: your own afternoon for ${ouderen} guests, including ${n} oliebollen, ${price} excl. VAT`,
  adoptGuests: (n) => `${n} guests`,

  step2: "Where and when",
  step2Sub: "Every weekday in December and the first week of January.",
  step2Donation: "Just a donation: nothing to deliver. Go on to your details.",
  street: "Street and number",
  postalCode: "Postcode",
  city: "Town",
  deliveryCost: "Delivery cost",
  areaHint: "Excl. VAT. Your postcode sets the rate.",
  areaEmpty: "Fill in your postcode and we'll work out the delivery cost.",
  postcodeShort: (pc) => `Postcode ${pc}`,
  whichDay: "Which day should we come?",
  deliveryDay: "Delivery day",
  tooSoon: " (too soon)",
  tooSoonTitle: (lead) => `Too soon: order ${lead} at the latest`,
  crossedOut: (lead) => `Crossed out: too soon. Order at least ${lead}.`,
  deadline: (lead, close) => `Order at least ${lead}, and by ${close} at the latest.`,
  closedTitle: "Business orders are closed for this season",
  closedText: "Thank you for your interest! We'll be frying again next year. A question, or still want to arrange something?",
  otherMoment: "Prefer another time?",
  mailUs: "Email us",
  mailSubject: "Business order",
  whatTime: "What time?",
  standardTimeSub: "We deliver between these times, at no extra cost.",
  otherTime: "Need a different time?",
  earlyRequest: "We'll let you know within 2 working days whether it's possible.",
  earlyBack: "Standard times after all",
  deliveryMoment: "Delivery time",
  surcharge: (price) => `+ ${price} excl. VAT`,
  noSurcharge: "No surcharge",
  moreAddresses: "Several addresses?",
  moreAddressesText: "Order per address. Once sent, add the next one in one click.",

  step3: "Details and invoice",
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
  extras: "What may we do with your name?",
  wallOfFame: (logo) => `Yes, put us on the wall of fame: our name${logo ? ", our logo" : ""} and the number of seniors. Never amounts.`,
  certificate: "Yes, we'd like an impact certificate",
  certificateName: "Name on the certificate",
  linkedin: "Yes, we'd like a LinkedIn badge with a ready-made post",
  logoHint: "We'll ask for your logo later by email.",
  sourceLabel: "How did you find us?",
  sourcePick: "Choose…",
  sources: {
    ambassadeur: "Through an Oma Coby's Oliebollenbar ambassador",
    collega: "Through a colleague or friend",
    klant: "We ordered last year",
    linkedin: "LinkedIn",
    instagram: "Instagram",
    pers: "Press or news",
    google: "Google",
    anders: "Other"
  },
  ambassador: "Name of the ambassador",
  cardNote: "We always add a card with our story.",

  yourOrder: "Your order",
  package: "Package",
  bollenLine: (n, price) => `${n} oliebollen × ${price}`,
  sugar: "Powdered sugar",
  free: "free",
  delivery: "Delivery",
  deliveryTo: (area) => `Delivery, ${area}`,
  subtotal: "Subtotal excl. VAT",
  vat: (pct) => `VAT ${pct}%`,
  total: "Total incl. VAT",
  donationLine: "In the Partypot",
  donationNoVat: "Contribution to the Partypot (no VAT)",
  inPot: (euro) => `+ ${euro} in the Partypot`,
  onInvoice: "On your invoice",
  short: (n, min) => `~ ${n} more to reach the minimum of ${min} oliebollen.`,
  goodFor: "Good for",
  seniors: (n) => plural(n, "senior", "seniors"),
  onFloor: "on the dance floor",
  emptyOverview: "Pick a package or add to the Partypot. With 10 oliebollen you get one senior rock 'n' rolling.",
  missing: (n) => (n === 1 ? "One thing left to fill in: " : `${n} things left to fill in: `),
  sending: "Sending…",
  orderN: (n, ouderen) => `Order ${n} oliebollen · get ${ouderen} ${plural(ouderen, "senior", "seniors")} dancing`,
  donateN: (euro) => `Donate ${euro} to the Partypot`,
  orderBand: (n) => `Book your own afternoon for ${n} guests`,
  placeOrder: "Place order",
  payLater: "Pay afterwards by invoice. A copy lands in your inbox right away.",
  forYourself: "Ordering just for yourself? Go to",
  barSeniors: (n) => `${n} seniors`,
  toOverview: "View order",
  fields: {
    pakket: "package",
    withRaisins: "number of oliebollen",
    withoutRaisins: "number without raisins",
    occasion: "what it is for",
    donation: "donation",
    flyers: "flyers",
    wallOfFame: "wall of fame",
    certificate: "certificate",
    certificateName: "name on the certificate",
    linkedin: "LinkedIn badge",
    source: "how you found us",
    ambassador: "ambassador",
    via: "link",
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
    pakket: "Pick a package, build your own, or donate.",
    tens: "Choose a number in tens.",
    donation: "Fill in an amount in whole euros.",
    occasion: "Choose what the oliebollen are for.",
    min: (n) => `At least ${n} oliebollen in total.`,
    max: (n) => `At most ${n.toLocaleString("en-GB")} oliebollen in total. More? Email us and we'll plan it together.`,
    street: "Fill in street and number.",
    postalCode: "Fill in a postcode, like 1431 AB.",
    city: "Fill in the town.",
    date: "Choose a day.",
    dateClosed: "We don't deliver on this day. Choose another one.",
    dateSoon: (info) => `This day is too soon: order at least ${info.leadWorkdays === 1 ? "1 working day" : `${info.leadWorkdays} working days`} ahead.`,
    company: "Fill in your company name.",
    contact: "Fill in the contact person's name.",
    phone: "Fill in a phone number, like 06 12345678.",
    email: "Fill in a valid email address.",
    invoiceEmail: "Fill in a valid email address for the invoice."
  },

  thanks: "Thank you!",
  doneTitle: (n, count) => `You're getting ${n} ${plural(count, "senior", "seniors")} rock 'n rolling`,
  doneTitleEmpty: "We've got your order",
  doneText: (company) => `Your order for ${company} is in. We'll check everything and confirm by email. A copy is already waiting at `,
  hallSign: "Thanks to you",
  hallUnit: (n) => plural(n, "senior", "seniors"),
  hallAria: (n) => `Disco hall with ${n} dancing seniors`,
  hallCaption: (n, company, band) =>
    band
      ? `This is your own afternoon: ${n.toLocaleString("en-GB")} guests on the dance floor, on behalf of ${company}.`
      : `This is the dance floor: ${n.toLocaleString("en-GB")} ${plural(n, "senior", "seniors")} at a specially organised music afternoon, on behalf of ${company}. With 10 oliebollen you get one senior rock 'n' rolling.`,
  orderNumber: "Order number",
  rowOliebollen: "Oliebollen",
  splitShort: (total, met, zonder) => `${total} (${met} with · ${zonder} without)`,
  rowDonated: "Partypot",
  rowDonatedValue: (euro) => `${euro} contribution to the Partypot`,
  doneDonation: (company) => `Your contribution to the Partypot on behalf of ${company} is in. The invoice follows by email; a copy is already waiting at `,
  doneDonationTitle: "Your contribution to the Partypot is in",
  doneGuests: (n) => `Your own afternoon for ${n} guests`,
  doneEarly: "Before 10:00 is a request: we'll let you know within 2 working days whether it's possible.",
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
