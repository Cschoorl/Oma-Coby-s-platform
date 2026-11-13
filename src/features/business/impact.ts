import type { BusinessOrder } from "../../types/business";
import { BUSINESS_DEFAULTS, SEASON_YEAR } from "../../config";
import { adoptionFor, ouderenFor } from "./business";

/*
 * Het impactcertificaat en de LinkedIn-tekst bij een zakelijke bestelling (impactverhaal 2026).
 * Telregel: ouderen = oliebollen ÷ 10, naar beneden afgerond; Bandpartner telt zijn gasten (60 of 100).
 * Een bijdrage aan de Partypot telt niet mee in ouderen en heet altijd "bijdrage aan de Partypot".
 * Nooit "de helft", geen bedragen per bol of per middag, en feestelijk: dansen, herinneringen, geen medelijden.
 */

/** De slogan uit het impactverhaal. */
export const SLOGAN = "Met 10 oliebollen laat je één oudere rock'n'rollen.";

const nl = (n: number) => n.toLocaleString("nl-NL");
const euro = (n: number) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0 });

/** Wat een bestelling oplevert, volgens de telregel. */
export function impactOf(b: BusinessOrder): { ouderen: number; band: boolean; oliebollen: number; pot: number } {
  const oliebollen = b.totals.oliebollen;
  return {
    oliebollen,
    ouderen: ouderenFor(oliebollen, BUSINESS_DEFAULTS),
    band: Boolean(adoptionFor(oliebollen, BUSINESS_DEFAULTS)),
    pot: b.totals.donation
  };
}

/** Kant-en-klare LinkedIn-post: opent met de slogan. */
export function linkedinText(b: BusinessOrder): string {
  const { ouderen, band, oliebollen, pot } = impactOf(b);
  const lines: string[] = [SLOGAN, ""];
  if (band) {
    lines.push(
      `Deze kerst realiseren wij bij ${b.company} onze eigen muziekmiddag voor ${nl(ouderen)} gasten, samen met Oma Coby's Oliebollenbar. Livemuziek, dansen en herinneringen: de kantine van een zorgcentrum wordt weer even de dancing van vroeger.`
    );
  } else if (oliebollen > 0) {
    lines.push(
      `Deze kerst trakteren wij bij ${b.company} op ${nl(oliebollen)} oliebollen van Oma Coby's Oliebollenbar. Daarmee laten we ${nl(ouderen)} ${ouderen === 1 ? "oudere" : "ouderen"} rock'n'rollen op een speciaal georganiseerde muziekmiddag: livemuziek, dansen en herinneringen.`
    );
  } else {
    lines.push(`Deze kerst doen wij bij ${b.company} een bijdrage aan de Partypot van Oma Coby's Oliebollenbar: het laatste zetje voor muziekmiddagen voor ouderen.`);
  }
  if (pot && oliebollen > 0) lines.push("", "En we deden er een bijdrage aan de Partypot bij, voor nog meer muziekmiddagen.");
  lines.push(
    "",
    "De opbrengst gaat naar speciaal georganiseerde muziekmiddagen voor ouderen in zorgcentra en buurthuizen, zoals Gouwe Ouwe. De oliebollen zijn gebakken naar het recept van de 100-jarige Oma Coby.",
    "",
    "Ook trakteren en ouderen laten dansen? omacobysoliebollenbar.nl",
    "",
    "#OmaCobysOliebollenbar #GouweOuwe #Oliebollen"
  );
  return lines.join("\n");
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** Het certificaat als losse A4-pagina (liggend), klaar om te printen of als PDF te bewaren. */
export function certificateHtml(b: BusinessOrder): string {
  const { ouderen, band, oliebollen, pot } = impactOf(b);
  const name = esc(b.certificateName || b.company);
  const big = band ? `${nl(ouderen)} gasten` : `${nl(ouderen)} ${ouderen === 1 ? "oudere" : "ouderen"}`;
  const what = band
    ? "op een eigen muziekmiddag met livemuziek, op naam van jullie bedrijf"
    : `op de dansvloer van een speciaal georganiseerde muziekmiddag, dankzij ${nl(oliebollen)} oliebollen`;
  const potLine = pot ? `<p class="pot">Met een bijdrage aan de Partypot van ${esc(euro(pot))}.</p>` : "";
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Impactcertificaat ${esc(b.company)}</title>
<style>
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#f9f3d9;color:#261f1f;font-family:Rockwell,"Arvo",Georgia,serif}
.page{width:297mm;height:210mm;padding:22mm 26mm;display:flex;flex-direction:column;justify-content:space-between}
.card{background:#fffdf6;border-radius:10px;padding:16mm 18mm;flex:1;display:flex;flex-direction:column;justify-content:center;gap:6mm}
.kicker{font:bold 11pt/1 Rockwell,Arvo,Georgia,serif;letter-spacing:.18em;text-transform:uppercase;color:#5c4238;margin:0}
h1{font:bold 30pt/1.1 "Vollkorn",Georgia,serif;margin:0}
.big{font:bold 54pt/1 Rockwell,Arvo,Georgia,serif;margin:0;color:#261f1f}
.what{font-size:15pt;line-height:1.45;color:#5c4238;margin:0;max-width:200mm}
.pot{font-size:12pt;color:#5c4238;margin:0}
.slogan{font:italic bold 16pt/1.3 "Vollkorn",Georgia,serif;color:#d05438;margin:0}
.foot{display:flex;justify-content:space-between;font-size:10pt;color:#5c4238;padding-top:6mm}
@media screen{body{display:grid;place-items:center;min-height:100vh}.page{box-shadow:0 10px 30px rgba(38,31,31,.15)}}
</style></head><body><div class="page"><div class="card">
<p class="kicker">Impactcertificaat ${SEASON_YEAR}</p>
<h1>${name}</h1>
<p class="big">${big}</p>
<p class="what">${what}: livemuziek, dansen en herinneringen.</p>
${potLine}
<p class="slogan">${esc(SLOGAN)}</p>
</div>
<div class="foot"><span>Oma Coby's Oliebollenbar · gebakken naar het recept van de 100-jarige Oma Coby</span><span>Bestelling ${esc(b.id)}</span></div>
</div><script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
}

/** Opent het certificaat in een nieuw tabblad met het printvenster erbij. */
export function openCertificate(b: BusinessOrder): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(certificateHtml(b));
  w.document.close();
  return true;
}
