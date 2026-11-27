/*
 * Verzonnen logo's voor de demo-modus, van verzonnen bedrijven. In kleur, zoals een logo van Brandfetch binnenkomt:
 * de muur zet ze zelf om naar krent-inkt (of laat de kleur, bij inkt "kleur"). Geen echte merken.
 */

const svg = (body: string, w = 240, h = 120) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;

export const DEMO_LOGOS: Record<string, string> = {
  "zuidas-vastgoed-partners": svg(
    `<rect x="10" y="22" width="76" height="76" rx="6" fill="#16325c"/><text x="48" y="73" text-anchor="middle" font-family="Georgia,serif" font-size="34" font-weight="700" fill="#fff">ZV</text><text x="98" y="58" font-family="Georgia,serif" font-size="25" font-weight="700" fill="#16325c">ZUIDAS</text><text x="98" y="86" font-family="Arial,sans-serif" font-size="15" letter-spacing="3" fill="#4a6fa5">VASTGOED</text>`
  ),
  "brouwerij-de-vrolijke-ketel": svg(
    `<path d="M30 92h52l-6-40H36z" fill="#e0782c"/><path d="M40 52c0-12 32-12 32 0" fill="none" stroke="#7a3b12" stroke-width="5"/><path d="M82 64c14 0 14 18 0 18" fill="none" stroke="#7a3b12" stroke-width="5"/><circle cx="48" cy="36" r="5" fill="#f2b84b"/><circle cx="62" cy="28" r="4" fill="#f2b84b"/><text x="98" y="62" font-family="Georgia,serif" font-style="italic" font-size="22" fill="#7a3b12">De Vrolijke</text><text x="98" y="90" font-family="Georgia,serif" font-weight="700" font-size="30" fill="#e0782c">Ketel</text>`
  ),
  "studio-noorderlicht": svg(
    `<path d="M44 20l7 22 22 7-22 7-7 22-7-22-22-7 22-7z" fill="#1c8c8c"/><text x="84" y="70" font-family="Helvetica,Arial,sans-serif" font-size="30" font-weight="300" fill="#123e44">noorderlicht</text>`,
    280
  ),
  "van-der-meulen-accountants": svg(
    `<path d="M20 30l18 58 18-58" fill="none" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"/><text x="70" y="60" font-family="Georgia,serif" font-size="24" fill="#ffffff">van der Meulen</text><text x="70" y="86" font-family="Arial,sans-serif" font-size="13" letter-spacing="4" fill="#e6e6e6">ACCOUNTANTS</text>`,
    260
  ),
  "pakhuis-digital": svg(
    `<text x="14" y="78" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="46" fill="#c2185b">pakhuis</text><circle cx="214" cy="72" r="9" fill="#ff9800"/>`
  ),
  "amstel-installatietechniek": svg(
    `<path d="M14 70c18-22 34-22 52 0s34 22 52 0" fill="none" stroke="#0a7bc2" stroke-width="9" stroke-linecap="round"/><text x="132" y="62" font-family="Arial,sans-serif" font-weight="700" font-size="26" fill="#0a5a8c">AMSTEL</text><text x="132" y="84" font-family="Arial,sans-serif" font-size="11" fill="#0a5a8c">installatietechniek</text>`,
    260
  ),
  "bloemenveiling-noord": svg(
    `<g fill="#6a9b2e">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="38" rx="9" ry="18" transform="rotate(${a} 50 60)"/>`).join("")}</g><circle cx="50" cy="60" r="9" fill="#f2c230"/><text x="94" y="56" font-family="Georgia,serif" font-size="22" fill="#2f4d14">Bloemenveiling</text><text x="94" y="84" font-family="Arial,sans-serif" font-weight="700" font-size="20" letter-spacing="2" fill="#6a9b2e">NOORD</text>`,
    270
  )
};

/** "2026:studio-noorderlicht" → het demo-logo, of leeg. */
export function demoLogo(key: string): string {
  return DEMO_LOGOS[key.split(":")[1] ?? ""] ?? "";
}
