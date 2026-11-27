import type { BusinessTierKey } from "./business";

/** Wall of fame: bedrijven die met toestemming op Oma's muur staan (tabblad "Wall of fame"). Zie docs/wall-of-fame.md. */

/** zoeken = de logozoeker is aan de beurt; nakijken = gevonden, beheer moet kijken; goedgekeurd = hangt aan de muur; geen = het naambordje. */
export type WallLogoStatus = "zoeken" | "nakijken" | "goedgekeurd" | "geen";

/** Hoe het logo op de muur komt: als krent-inkt (donker logo op licht, of licht logo op donker), of in eigen kleur. */
export type WallInk = "donker" | "licht" | "kleur";

/** Vinkje in het bestelformulier, of een akkoord per mail dat beheer invoert. */
export type WallConsent = "formulier" | "mail";

export interface WallEntry {
  /** "2026:studio-noorderlicht" */
  key: string;
  season: number;
  /** Zoals hij op de muur staat; beheer kan hem inkorten. */
  name: string;
  /** Zoals in de bestelling. */
  company: string;
  orderIds: string[];
  tier: BusinessTierKey;
  oliebollen: number;
  ouderen: number;
  /** Eerste bestelling, yyyy-MM-dd HH:mm:ss */
  firstOrderAt: string;
  /** Besteld vóór 1 december van het seizoen. */
  early: boolean;
  consent: WallConsent;
  visible: boolean;
  domain: string;
  logoUrl: string;
  logoStatus: WallLogoStatus;
  ink: WallInk;
  /** "website", "brandfetch", "logo.dev", "handmatig", "demo" */
  logoSource: string;
  /** Het domein waar het logo vandaan komt; hoort gelijk te zijn aan `domain` (dat van de besteller). */
  logoDomain: string;
  /** Eén zin van Claude (of beheer) over het gevonden logo. */
  logoNote: string;
  /** 0 tot 1, hoe zeker Claude is; null als niet gecontroleerd. */
  confidence: number | null;
  updatedBy: string;
  updatedAt: string;
}

/** Wat beheer kan aanpassen. */
export type WallEntryPatch = Partial<Pick<WallEntry, "name" | "visible" | "logoUrl" | "logoStatus" | "ink">>;

/** Wat de openbare muur krijgt: geen bedragen, geen oliebollen, geen contactgegevens. Een logo alleen als het goedgekeurd is. */
export interface PublicWallEntry {
  key: string;
  name: string;
  tier: BusinessTierKey;
  ouderen: number;
  early: boolean;
  logoUrl: string;
  ink: WallInk;
}

export interface PublicWall {
  season: number;
  entries: PublicWallEntry[];
}
