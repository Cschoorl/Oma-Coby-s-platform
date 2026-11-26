import { useEffect, useState } from "react";

/**
 * E-mailadressen nakijken voordat een formulier verstuurd wordt (zakelijk bestellen en vrijwilligers).
 *
 * 1. emailSuggestion: een tikfout in een bekend domein of in de extensie ("gmial.com", "hotmail.con")
 *    geeft een voorstel ("…@gmail.com"). Alleen een voorstel: het formulier blokkeert er niet op.
 * 2. useEmailCheck: vraagt bij Google Public DNS na of het domein mail kan ontvangen (MX, of anders een
 *    A-record). Bestaat het domein niet ("4buildidng.nl"), dan is het adres zeker fout en blokkeert het
 *    formulier. Lukt de controle zelf niet (geen internet, time-out), dan telt het adres als goed:
 *    een bestelling mag nooit stranden op deze controle.
 *
 * Of het deel vóór de @ bestaat, kan niemand nagaan zonder echt een mail te sturen.
 */

/** Same rule as the forms already had: something@something.tld. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mail providers that people in the Netherlands use most; a near miss of one of these is almost always a typo. */
const KNOWN_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.nl",
  "outlook.com",
  "outlook.nl",
  "live.nl",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "ziggo.nl",
  "kpnmail.nl",
  "kpnplanet.nl",
  "planet.nl",
  "xs4all.nl",
  "home.nl",
  "upcmail.nl",
  "chello.nl",
  "casema.nl",
  "hetnet.nl",
  "telfort.nl",
  "tele2.nl",
  "online.nl",
  "quicknet.nl",
  "zeelandnet.nl",
  "solcon.nl",
  "caiway.nl",
  "proton.me",
  "protonmail.com"
];

/** Extensions that are a typo of .com or .nl. Only ones that are not real extensions themselves. */
const TLD_FIXES: Record<string, string> = {
  con: "com",
  cmo: "com",
  ocm: "com",
  comm: "com",
  vom: "com",
  xom: "com",
  coom: "com",
  nll: "nl",
  nk: "nl",
  nl1: "nl"
};

function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

/** "Naam@Gmail.com " → "gmail.com"; "" when the address does not have the right shape yet. */
export function emailDomain(email: string): string {
  const value = email.trim();
  if (!EMAIL_PATTERN.test(value)) return "";
  return value.slice(value.lastIndexOf("@") + 1).toLowerCase().replace(/\.$/, "");
}

/** The address with the likely typo fixed ("ria@gmial.com" → "ria@gmail.com"), or null when it looks fine. */
export function emailSuggestion(email: string): string | null {
  const domain = emailDomain(email);
  if (!domain || KNOWN_DOMAINS.includes(domain)) return null;
  const local = email.trim().slice(0, email.trim().lastIndexOf("@"));
  // A near miss of a well-known provider: one letter off for short names, two for longer ones.
  let best = "";
  let bestDistance = Infinity;
  for (const known of KNOWN_DOMAINS) {
    const d = distance(domain, known);
    if (d < bestDistance) {
      best = known;
      bestDistance = d;
    }
  }
  if (bestDistance <= (best.length >= 9 ? 2 : 1)) return `${local}@${best}`;
  // Otherwise only the extension: "bedrijf.con" → "bedrijf.com".
  const dot = domain.lastIndexOf(".");
  const fixed = TLD_FIXES[domain.slice(dot + 1)];
  return fixed ? `${local}@${domain.slice(0, dot + 1)}${fixed}` : null;
}

/** "ok": the domain takes mail. "missing": it does not exist or takes no mail. "unknown": the check did not work. */
export type DomainStatus = "ok" | "missing" | "unknown";

const results = new Map<string, Promise<DomainStatus>>();

async function lookup(domain: string, type: "MX" | "A", signal: AbortSignal): Promise<{ status: number; answers: { type: number; data: string }[] }> {
  const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, { signal });
  if (!response.ok) throw new Error(`DNS ${response.status}`);
  const body = (await response.json()) as { Status: number; Answer?: { type: number; data: string }[] };
  return { status: body.Status, answers: body.Answer ?? [] };
}

/** Asks Google Public DNS whether `domain` can receive mail. Answers are kept, so each domain is asked once. */
export function checkEmailDomain(domain: string): Promise<DomainStatus> {
  const known = results.get(domain);
  if (known) return known;
  const pending = (async (): Promise<DomainStatus> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    try {
      const mx = await lookup(domain, "MX", controller.signal);
      // 3 = NXDOMAIN: the domain does not exist.
      if (mx.status === 3) return "missing";
      if (mx.status !== 0) return "unknown";
      const servers = mx.answers.filter((a) => a.type === 15);
      // "0 ." is a null MX: the domain says it takes no mail.
      if (servers.length) return servers.every((a) => /^0\s+\.$/.test(a.data.trim())) ? "missing" : "ok";
      // No MX: mail then goes to the domain's own address (A record), if it has one.
      const a = await lookup(domain, "A", controller.signal);
      if (a.status === 0) return a.answers.some((r) => r.type === 1) ? "ok" : "missing";
      return a.status === 3 ? "missing" : "unknown";
    } catch {
      return "unknown";
    } finally {
      window.clearTimeout(timer);
    }
  })();
  results.set(domain, pending);
  // A failed check may be tried again later; a real answer stays.
  void pending.then((status) => {
    if (status === "unknown") results.delete(domain);
  });
  return pending;
}

/**
 * The checks for one e-mail field, kept up to date while someone types. `status` is "missing" only when the
 * domain surely takes no mail; while checking, or when the check could not be done, it is not "missing".
 */
export function useEmailCheck(email: string): { domain: string; suggestion: string | null; status: DomainStatus | "checking" | "idle" } {
  const domain = emailDomain(email);
  const [checked, setChecked] = useState<{ domain: string; status: DomainStatus } | null>(null);

  useEffect(() => {
    if (!domain) return;
    let current = true;
    // Wait until they stop typing, so "gmail.c" is not looked up on the way to "gmail.com".
    const timer = window.setTimeout(() => {
      void checkEmailDomain(domain).then((status) => {
        if (current) setChecked({ domain, status });
      });
    }, 600);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [domain]);

  return {
    domain,
    suggestion: emailSuggestion(email),
    status: !domain ? "idle" : checked?.domain === domain ? checked.status : "checking"
  };
}
