import type { BusinessInfo, BusinessOrder, BusinessTierKey } from "../../types/business";
import type { PublicWall, PublicWallEntry, WallEntry } from "../../types/wallOfFame";
import { tierFor } from "../business/business";

/*
 * De wall of fame rekenen. Het Apps Script doet precies hetzelfde (syncWall_ in Code.gs); houd die twee gelijk.
 * Bron is de bevestigde zakelijke bestelling met het vinkje "Zet ons op de wall of fame" (of een akkoord per mail).
 * Zonder vinkje of akkoord komt een bedrijf er nooit op, en een testbestelling ook niet. Zie docs/wall-of-fame.md.
 */

/** Het seizoen loopt van november tot begin januari: een bezorging op 2 januari 2027 hoort bij seizoen 2026. */
export function seasonOf(date: string): number {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return month >= 7 ? year : year - 1;
}

/** Wie vóór deze dag bestelt, staat bovenaan (idee 6 uit het bouwplan). */
export function earlyCutoff(season: number): string {
  return `${season}-12-01`;
}

/** Bedrijfsvormen die niet in de sleutel horen: "Studio Noorderlicht B.V." en "studio noorderlicht" zijn één plek. */
const LEGAL = /\b(b\.?\s?v\.?|n\.?\s?v\.?|v\.?o\.?f\.?|holding|c\.?v\.?)$/;

export function wallKey(company: string, season: number): string {
  const slug = company
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(LEGAL, "")
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${season}:${slug}`;
}

/** Gratis mail zegt niets over het bedrijf; die domeinen gaan niet naar de logozoeker. Zelfde lijst als FREE_MAIL in Code.gs. */
export const FREE_MAIL = [
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.nl", "outlook.com", "outlook.nl", "live.nl", "live.com", "msn.com",
  "icloud.com", "me.com", "yahoo.com", "yahoo.nl", "ziggo.nl", "kpnmail.nl", "kpnplanet.nl", "planet.nl", "home.nl",
  "xs4all.nl", "hetnet.nl", "chello.nl", "casema.nl", "upcmail.nl", "telfort.nl", "tele2.nl", "online.nl", "proton.me", "protonmail.com"
];

/** "https://www.Noorderlicht.studio/contact" → "noorderlicht.studio"; leeg als het geen domein is. */
export function cleanDomain(site: string): string {
  const host = site.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[/?#\s]/)[0].replace(/^www\./, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : "";
}

/** Het domein van een zakelijk e-mailadres; leeg bij gratis mail. */
export function domainFromEmail(email: string): string {
  const domain = cleanDomain(email.split("@")[1] ?? "");
  return domain && !FREE_MAIL.includes(domain) ? domain : "";
}

const TIER_ORDER: Record<BusinessTierKey, number> = { goud: 0, zilver: 1, brons: 2 };

/** Goud, Zilver, Brons; daarbinnen vroegboekers eerst, dan wie het eerst bestelde. Nooit op aantal. */
export function sortWall<T extends Pick<WallEntry, "tier" | "early" | "firstOrderAt" | "name">>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
      Number(b.early) - Number(a.early) ||
      a.firstOrderAt.localeCompare(b.firstOrderAt) ||
      a.name.localeCompare(b.name, "nl")
  );
}

/** Een logo is alleen nodig vanaf Zilver (Danspartner). */
export function wantsLogo(tier: BusinessTierKey): boolean {
  return tier !== "brons";
}

/** "Studio Noorderlicht B.V." → "Studio Noorderlicht" */
export function displayName(company: string): string {
  return company.trim().replace(/\s*,?\s*\b(b\.?\s?v\.?|n\.?\s?v\.?)$/i, "").trim();
}

/**
 * Een testbestelling hoort niet op de muur: een bedrijfsnaam die met "test" begint of op "test", "testbestelling"
 * of "proefbestelling" eindigt ("Test BV", "Max test"). "Testa Rossa" en "Attest" blijven gewoon staan.
 * Zelfde regel als wallIsTest_ in Code.gs.
 */
export function isTestCompany(company: string): boolean {
  const name = company.trim().toLowerCase();
  return /^test(bestelling|order|bedrijf)?(?![a-z])/.test(name) || /(^|[^a-z])(test|testbestelling|testorder|proefbestelling)$/.test(name);
}

/** Het domein van het bedrijf: dat van het e-mailadres waarmee besteld is (geen gratis mail). */
function domainOf(b: BusinessOrder): string {
  return domainFromEmail(b.email);
}

/**
 * De muur bijwerken uit de zakelijke aanvragen. Alleen bevestigde aanvragen tellen, en nooit een testbestelling.
 * - Vinkje in het formulier: het bedrijf komt erop zodra een bevestigde aanvraag het vinkje heeft, en alleen de
 *   aanvragen mét vinkje tellen mee. Is er geen meer (teruggezet of afgewezen), dan gaat de plek op nul en hangt
 *   het bedrijf niet meer.
 * - Akkoord per mail (door beheer toegevoegd): alle bevestigde aanvragen van dat bedrijf tellen mee; zonder
 *   aanvragen (een bestelling uit de gewone orderlijst) houdt de plek zijn eigen aantallen.
 * Wat beheer aanpaste (naam, zichtbaar, logo) blijft staan.
 * `toSearch`: plekken die een logo nodig hebben; `added`: bedrijven die er nu bij kwamen.
 */
export function syncWall(entries: WallEntry[], orders: BusinessOrder[], info: BusinessInfo, now: string): { entries: WallEntry[]; toSearch: string[]; added: string[] } {
  const confirmed = orders.filter((b) => b.status === "bevestigd" && !isTestCompany(b.company));
  const out = entries.map((e) => ({ ...e, orderIds: [...e.orderIds] }));
  const keyOf = (b: BusinessOrder) => wallKey(b.company, seasonOf(b.date));
  const added: string[] = [];
  for (const b of confirmed.filter((o) => o.wallOfFame)) {
    const key = keyOf(b);
    if (!out.some((e) => e.key === key)) {
      const entry = newWallEntry({ company: b.company, season: seasonOf(b.date), consent: "formulier", domain: domainOf(b), now });
      out.push(entry);
      added.push(entry.name);
    }
  }
  const toSearch: string[] = [];
  for (const e of out) {
    const mine = confirmed
      .filter((b) => keyOf(b) === e.key && (e.consent === "mail" || b.wallOfFame))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (mine.length) {
      const oliebollen = mine.reduce((s, b) => s + b.withRaisins + b.withoutRaisins, 0);
      Object.assign(e, countsFor(oliebollen, mine[0].createdAt, e.season, info), { orderIds: mine.map((b) => b.id) });
      e.domain ||= mine.map(domainOf).find(Boolean) ?? "";
    } else if (e.consent === "formulier") {
      // De toestemming hing aan een aanvraag die niet meer bevestigd is: van de muur (publicWall toont alleen ouderen > 0).
      Object.assign(e, { oliebollen: 0, ouderen: 0, orderIds: [] });
    }
    // Zilver of Goud en nog nooit een logo gezocht (logoSource leeg): zoeken. Na een zoektocht zonder resultaat
    // of "alleen de naam" van beheer staat er een bron, dan niet opnieuw.
    if (e.ouderen > 0 && wantsLogo(e.tier) && e.logoStatus === "geen" && !e.logoSource) e.logoStatus = "zoeken";
    if (e.ouderen > 0 && e.logoStatus === "zoeken") toSearch.push(e.key);
  }
  return { entries: out, toSearch, added };
}

/** Pakket, ouderen en vroegboeker uit het totaal aantal oliebollen en de eerste bestelling. */
export function countsFor(oliebollen: number, firstOrderAt: string, season: number, info: BusinessInfo): Pick<WallEntry, "oliebollen" | "ouderen" | "tier" | "firstOrderAt" | "early"> {
  return {
    oliebollen,
    ouderen: Math.floor(oliebollen / 10),
    // Boven Goud (ook Feestpartner) blijft het Goud, onder Brons blijft het Brons.
    tier: (tierFor(oliebollen, info)?.key ?? "brons") as BusinessTierKey,
    firstOrderAt,
    early: firstOrderAt.slice(0, 10) < earlyCutoff(season)
  };
}

/** Een nieuwe, lege plek; de aantallen komen uit syncWall of countsFor. */
export function newWallEntry({ company, season, consent, domain, now }: { company: string; season: number; consent: WallEntry["consent"]; domain: string; now: string }): WallEntry {
  return {
    key: wallKey(company, season),
    season,
    name: displayName(company),
    company: company.trim(),
    orderIds: [],
    tier: "brons",
    oliebollen: 0,
    ouderen: 0,
    firstOrderAt: now,
    early: false,
    consent,
    visible: true,
    domain,
    logoUrl: "",
    logoStatus: "geen",
    ink: "donker",
    logoSource: "",
    logoDomain: "",
    logoNote: "",
    confidence: null,
    updatedBy: "",
    updatedAt: now
  };
}

/** Een logo hangt alleen vanaf een veilige link (https, of een ingebed plaatje in de demo). */
export function safeLogoUrl(url: string): string {
  const u = url.trim();
  return /^(https:\/\/|data:image\/)/.test(u) ? u : "";
}

/**
 * Het logo komt van een ander domein dan het e-mailadres van de besteller (of dat is er niet): dan is het op naam
 * gezocht en kan het van een naamgenoot of concurrent zijn. Beheer kijkt dan extra goed.
 */
export function logoNeedsCare(e: Pick<WallEntry, "domain" | "logoDomain" | "logoSource" | "logoUrl">): boolean {
  if (!e.logoUrl || e.logoSource === "handmatig") return false;
  return !e.domain || !e.logoDomain || e.domain !== e.logoDomain;
}

/** Wat de openbare muur ziet: dit seizoen, zichtbaar en met ouderen; een logo alleen na goedkeuring. Zonder: het naambordje. */
export function publicWall(entries: WallEntry[], season: number): PublicWall {
  const shown = sortWall(entries.filter((e) => e.season === season && e.visible && e.ouderen > 0));
  return {
    season,
    entries: shown.map(
      (e): PublicWallEntry => ({
        key: e.key,
        name: e.name || displayName(e.company),
        tier: e.tier,
        ouderen: e.ouderen,
        early: e.early,
        logoUrl: wantsLogo(e.tier) && e.logoStatus === "goedgekeurd" ? safeLogoUrl(e.logoUrl) : "",
        ink: e.ink
      })
    )
  };
}

/**
 * De naam over hooguit `maxLines` regels van ongeveer gelijke lengte, voor het naambordje. Breekt alleen tussen
 * woorden; neemt zo weinig regels als kan zolang de langste regel binnen `width` tekens blijft.
 * "Huisartsenpraktijk Oud-Zuid" → ["Huisartsenpraktijk", "Oud-Zuid"].
 */
export function signLines(name: string, maxLines: number, width: number): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [name.trim()];
  let best: string[] = [words.join(" ")];
  for (let n = 1; n <= Math.min(maxLines, words.length); n++) {
    best = balanced(words, n);
    if (Math.max(...best.map((l) => l.length)) <= width) break;
  }
  return best;
}

/** `words` over precies `n` regels, met de langste regel zo kort mogelijk. */
function balanced(words: string[], n: number): string[] {
  if (n === 1) return [words.join(" ")];
  let best: string[] = [];
  let bestLen = Infinity;
  for (let cut = 1; cut <= words.length - (n - 1); cut++) {
    const first = words.slice(0, cut).join(" ");
    if (first.length >= bestLen) break;
    const rest = balanced(words.slice(cut), n - 1);
    const len = Math.max(first.length, ...rest.map((l) => l.length));
    if (len < bestLen) {
      bestLen = len;
      best = [first, ...rest];
    }
  }
  return best;
}
