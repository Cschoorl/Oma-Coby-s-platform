import type { BusinessOrder, BusinessPackage } from "../../types/business";
import { BUSINESS_DEFAULTS, SEASON_YEAR } from "../../config";
import arvoBoldUrl from "../../assets/fonts/Arvo-Bold.woff2";
import arvoUrl from "../../assets/fonts/Arvo-Regular.woff2";
import displayUrl from "../../assets/fonts/VTCSuperMarketSale-Italic.woff2";
import vollkornUrl from "../../assets/fonts/Vollkorn-Variable.woff2";
import logoUrl from "../../assets/logo-oliebollenbar.svg";
import { SLINGER_SVG, cardDancerSvgs } from "../stats/Discozaal";
import { ouderenFor, tierFor } from "./business";

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
    // Bandpartner staat niet meer op het formulier; oude aanvragen herkennen we aan hun pakket.
    band: b.pakket === "middag60" || b.pakket === "middag100",
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

/** Het certificaat opent in een leeg tabblad: daar bestaan de fonts en plaatjes van het platform alleen met een volledige URL. */
const abs = (url: string) => new URL(url, window.location.href).href;

/** De letters van de huisstijl; zonder deze regels valt het certificaat terug op Rockwell en Georgia. */
function fontFaces(): string {
  const face = (family: string, url: string, weight: string) =>
    `@font-face{font-family:"${family}";src:url("${abs(url)}") format("woff2");font-weight:${weight};font-style:normal;font-display:block}`;
  return [
    face("Arvo", arvoUrl, "400"),
    face("Arvo", arvoBoldUrl, "700"),
    face("Vollkorn", vollkornUrl, "400 900"),
    face("VTC SuperMarket", displayUrl, "400")
  ].join("\n");
}

/** Het pakket dat op het certificaat staat: Feestpartner als die gekozen is, anders het pakket bij het aantal. Een oude muziekmiddag heeft er geen. */
function packageOf(b: BusinessOrder): BusinessPackage | undefined {
  const { oliebollen, band } = impactOf(b);
  if (band || oliebollen <= 0) return undefined;
  return b.pakket === "feest" ? BUSINESS_DEFAULTS.party : tierFor(oliebollen, BUSINESS_DEFAULTS);
}

/** De medaille bij Schuifel-, Dans- en Polonaisepartner: dezelfde tekening als in de bevestigingsmail (public/mail). */
const MEDAL_KEYS = ["brons", "zilver", "goud"];

/** Het certificaat als losse A4-pagina (liggend), klaar om te printen of als PDF te bewaren. */
export function certificateHtml(b: BusinessOrder): string {
  const { ouderen, band, oliebollen, pot } = impactOf(b);
  const rawName = b.certificateName || b.company;
  const name = esc(rawName);
  // Lange bedrijfsnamen krijgen een kleinere letter, zodat ze op hooguit twee regels passen.
  const nameSize = rawName.length <= 22 ? 38 : rawName.length <= 40 ? 30 : 23;
  // Alleen een bijdrage aan de Partypot: geen ouderen te tellen, dus de bijdrage zelf staat groot.
  const potOnly = !band && oliebollen <= 0 && pot > 0;
  const big = potOnly ? esc(euro(pot)) : nl(ouderen);
  const unit = potOnly ? "Bijdrage aan de Partypot" : band ? "Gasten op de dansvloer" : `${ouderen === 1 ? "Oudere" : "Ouderen"} op de dansvloer`;
  const what = potOnly
    ? "Het laatste zetje voor muziekmiddagen voor ouderen"
    : band
      ? "van een eigen muziekmiddag, op naam van jullie bedrijf"
      : `van een speciaal georganiseerde muziekmiddag, dankzij ${nl(oliebollen)} oliebollen`;
  const potLine = pot && !potOnly ? `<p class="pot">Met een bijdrage aan de Partypot van ${esc(euro(pot))}.</p>` : "";
  const pkg = packageOf(b);
  const medal = pkg && MEDAL_KEYS.includes(pkg.key) ? `<img class="medal" src="${abs(`${import.meta.env.BASE_URL}mail/medaille-${pkg.key}.png`)}" alt="">` : "";
  const partner = pkg ? `<div class="partner">${medal}<span class="sticker">${esc(pkg.name)}</span></div>` : "";
  // Oudjes links en rechts van het getal, elk in een eigen danshouding (zie .d0 tot .d5). Eerlijk geteld: nooit meer dan er dansen.
  const dancers = cardDancerSvgs(potOnly ? 6 : Math.min(6, ouderen)).map((svg, i) => `<span class="dancer d${i}">${svg}</span>`);
  const half = Math.ceil(dancers.length / 2);
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Impactcertificaat ${esc(b.company)}</title>
<style>
${fontFaces()}
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#f9f3d9;color:#261f1f;font-family:Arvo,Rockwell,Georgia,serif;font-variant-numeric:lining-nums;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:297mm;height:210mm;padding:9mm;overflow:hidden}
.sheet{position:relative;height:100%;background:#fffdf6;border-radius:3mm;padding:19mm 20mm 9mm;display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}
.slinger{position:absolute;left:0;top:0;width:100%;height:13mm}
.title{font:400 31pt/1 "VTC SuperMarket",Impact,"Arial Narrow",sans-serif;text-transform:uppercase;letter-spacing:.03em;margin:0}
.body{flex:1;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}
.label{font:700 8.5pt/1 Arvo,Rockwell,Georgia,serif;letter-spacing:.22em;text-transform:uppercase;color:#6d5a4f;margin:0}
h1{font:700 ${nameSize}pt/1.12 Vollkorn,Georgia,serif;margin:2.5mm 0 0;max-width:225mm;text-wrap:balance;overflow-wrap:anywhere}
.hero{display:flex;align-items:flex-end;justify-content:center;gap:8mm;margin-top:8mm}
.big{font:900 108pt/.72 Vollkorn,Georgia,serif;color:#d05438;margin:0;white-space:nowrap}
.row{display:flex;align-items:flex-end}
.dancer{display:block;width:21mm}
.dancer svg{display:block;width:100%;height:auto;overflow:visible}
.dancer .arm-l,.dancer .arm-r{transform-box:view-box}
.dancer .arm-l{transform-origin:20px 41px}
.dancer .arm-r{transform-origin:40px 41px}
.d0{transform:rotate(-5deg)}.d0 .arm-l{transform:rotate(125deg)}.d0 .arm-r{transform:rotate(-35deg)}
.d1{transform:translateY(-2mm)}.d1 .arm-l{transform:rotate(140deg)}.d1 .arm-r{transform:rotate(-140deg)}
.d2{transform:rotate(4deg)}.d2 .arm-r{transform:rotate(-120deg)}
.d3{transform:rotate(-4deg)}.d3 .arm-l{transform:rotate(120deg)}
.d4{transform:translateY(-2mm)}.d4 .arm-l{transform:rotate(40deg)}.d4 .arm-r{transform:rotate(-40deg)}
.d5{transform:rotate(5deg)}.d5 .arm-l{transform:rotate(35deg)}.d5 .arm-r{transform:rotate(-125deg)}
.unit{font:400 26pt/1 "VTC SuperMarket",Impact,"Arial Narrow",sans-serif;text-transform:uppercase;letter-spacing:.03em;margin:6mm 0 0}
.what{font-size:12.5pt;line-height:1.5;color:#5c4238;margin:3mm 0 0;max-width:185mm;text-wrap:balance}
.pot{font-size:11pt;color:#5c4238;margin:1.5mm 0 0}
.slogan{font:600 15pt/1.3 Vollkorn,Georgia,serif;color:#d05438;margin:6mm 0 0}
h1,.big,.what,.pot,.slogan,.foot{font-variant-numeric:lining-nums}
.foot{width:100%;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8mm;border-top:1px solid #ebe1bf;padding-top:5mm;font-size:8.5pt;line-height:1.5;color:#6d5a4f}
.logo{display:block;width:43mm;height:auto}
.foot p{margin:0}
.mid{text-align:center}
.partner{justify-self:end;display:flex;align-items:center;gap:3mm}
.medal{display:block;height:17mm;width:auto}
.sticker{display:inline-block;transform:rotate(-6deg);white-space:nowrap;border-radius:50%;background:#dcc05d;color:#261f1f;padding:3.2mm 6mm 2.8mm;font:400 15pt/1 "VTC SuperMarket",Impact,"Arial Narrow",sans-serif;text-transform:uppercase;letter-spacing:.04em}
@media screen{body{display:grid;place-items:center;min-height:100vh}.page{zoom:var(--fit,1);box-shadow:0 10px 30px rgba(38,31,31,.15)}}
</style></head><body><div class="page"><div class="sheet">
<svg class="slinger" viewBox="0 0 1000 44" preserveAspectRatio="none" aria-hidden="true">${SLINGER_SVG}</svg>
<p class="title">Impactcertificaat ${SEASON_YEAR}</p>
<div class="body">
<p class="label">Uitgereikt aan</p>
<h1>${name}</h1>
<div class="hero"><div class="row">${dancers.slice(0, half).join("")}</div><p class="big">${big}</p><div class="row">${dancers.slice(half).join("")}</div></div>
<p class="unit">${unit}</p>
<p class="what">${what}: livemuziek, dansen en herinneringen.</p>
${potLine}
<p class="slogan">${esc(SLOGAN)}</p>
</div>
<div class="foot">
<img class="logo" src="${abs(logoUrl)}" alt="Oma Coby's Oliebollenbar">
<div class="mid"><p>Gebakken naar het recept van de 100-jarige Oma Coby</p><p>Bestelling ${esc(b.id)}</p></div>
${partner || "<span></span>"}
</div>
</div></div><script>
function fit(){document.documentElement.style.setProperty("--fit",Math.min(1,(window.innerWidth-32)/1123,(window.innerHeight-32)/794))}
fit();window.addEventListener("resize",fit);
window.addEventListener("load",function(){var ready=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();ready.then(function(){setTimeout(function(){window.print()},300)})});
</script></body></html>`;
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
