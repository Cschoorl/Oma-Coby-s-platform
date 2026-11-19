/*
 * Google Analytics 4 voor het zakelijke bestelformulier (niet voor het dashboard: daar meten we niets).
 * Zelfde property als de Shopify-site, zodat je bezoekers ziet doorlopen van de shop naar het formulier.
 *
 * Consent Mode v2: standaard staat alles op "denied". GA4 krijgt dan alleen cookieloze pings zonder
 * identificatie. Pas als de bezoeker "Akkoord" kiest, gaan analytics-cookies aan. Advertentie-cookies blijven altijd uit.
 */

export const GA_MEASUREMENT_ID = "G-GY9MHV6X9S";

const CONSENT_KEY = "omacoby-analytics-consent";

export type Consent = "granted" | "denied";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let started = false;

function gtag(...args: unknown[]) {
  if (!window.gtag) return;
  window.gtag(...args);
}

/** De eerder gekozen toestemming, of null als de bezoeker nog niets koos. */
export function storedConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

/** Laadt gtag.js één keer, met alles op "denied" tot de bezoeker akkoord geeft. */
export function startAnalytics() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // gtag.js verwacht het arguments-object, geen array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  const consent = storedConsent() ?? "denied";
  gtag("consent", "default", {
    analytics_storage: consent,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

export function setConsent(consent: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // Geen opslag (privévenster): dan geldt de keuze alleen voor dit bezoek.
  }
  gtag("consent", "update", { analytics_storage: consent });
}

/** Een gebeurtenis naar GA4; doet niets als analytics niet geladen is. */
export function track(event: string, params: Record<string, string | number | boolean | undefined> = {}) {
  gtag("event", event, params);
}
