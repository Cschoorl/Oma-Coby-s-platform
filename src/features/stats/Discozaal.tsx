import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fieldLabel, formatNumber, rollOliebol, toast } from "../../components/ui";
import { GOAL_MILESTONES, GOAL_OLIEBOLLEN, OLIEBOLLEN_PER_OUDJE } from "../../config";
import "./discozaal.css";

// De Tussenstand als discozaal, achter de discobal-knop bij de grafiek:
// per tien verkochte oliebollen danst er een oudje bij. Iedereen staat op de vloer: hoe voller de zaal,
// hoe kleiner de oudjes (en vanaf een flinke drukte wordt de zaal hoger). Niemand wacht buiten.

export function oudjesFor(oliebollen: number): number {
  return Math.floor(oliebollen / OLIEBOLLEN_PER_OUDJE);
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- tekeningen ----------
// The drawings are fixed SVG markup built from constants below (no user input), so they are injected as HTML.

const K = "#3a2f2c";
const BOL = "M36 26c8 0 12 4 17 7 6 4 10 10 9 18 0 9-3 15-8 20-6 6-13 9-21 8-8-1-15-4-20-10C8 63 7 56 9 49c2-8 7-13 13-18 4-3 9-5 14-5z";

/** The oliebol as a disco ball: mirror facets that keep turning. */
function discoBallSvg(id: string): string {
  return `<svg viewBox="0 0 70 92" aria-hidden="true"><defs><clipPath id="${id}c"><path d="${BOL}"/></clipPath><pattern id="${id}f" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#c08446"/><rect x=".6" y=".6" width="5.8" height="5.8" fill="#dca666"/><rect x=".6" y=".6" width="2.4" height="2.4" fill="#f4d79c"/><animate attributeName="x" from="0" to="7" dur="1.2s" repeatCount="indefinite"/></pattern></defs><path d="M35 0v26" stroke="#a89889" stroke-width="1.6"/><g class="spin"><path d="${BOL}" fill="url(#${id}f)"/><g clip-path="url(#${id}c)"><path d="M8 66 Q35 86 64 62 L64 90 L8 90z" fill="#5c3416" opacity=".25"/></g><path d="${BOL}" fill="none" stroke="${K}" stroke-width="1.6"/><g fill="#fffdf6"><circle cx="27" cy="34" r="1.7"/><circle cx="35" cy="31" r="1.4"/><circle cx="42" cy="35" r="1.7"/></g></g><path class="dz-glint" d="M17 46l1.2 3 3 1.2-3 1.2L17 54.4l-1.2-3-3-1.2 3-1.2z" fill="#fff"/><path class="dz-glint" style="animation-delay:-.8s" d="M53 42l1 2.4 2.4 1-2.4 1L53 48.8l-1-2.4-2.4-1 2.4-1z" fill="#fff"/></svg>`;
}

const SLINGER_COLORS = ["#d05438", "#dcc05d", "#69873c", "#f1d9cd"];
const SLINGER_SVG =
  Array.from({ length: 26 }, (_, i) => {
    const t = i / 25;
    const x = t * 1000;
    const y = 2 + 26 * 4 * t * (1 - t);
    return `<path d="M${x - 9} ${y} L${x + 9} ${y} L${x} ${y + 13}z" fill="${SLINGER_COLORS[i % SLINGER_COLORS.length]}" opacity=".85"/>`;
  }).join("") + `<path d="M0 2 Q500 54 1000 2" stroke="#a89889" stroke-width="1" fill="none"/>`;

interface Character {
  move: "wave" | "cane" | "pump" | "hat" | "hop" | "fever" | "twist" | "clap";
  skin: string;
  hair: [style: "perm" | "bun" | "short" | "side" | "bald", color: string];
  dress?: string;
  jacket?: string;
  shirt?: string;
  trousers?: string;
  braces?: string;
  hat?: [style: "cap" | "trilby", color: string];
  glasses?: boolean;
  cane?: boolean;
  bag?: string;
}

/** The eight front-row dancers, each with a look and a dance of their own. */
const CAST: Character[] = [
  { move: "wave", skin: "#f1d3b3", hair: ["perm", "#ddd4ea"], dress: "#d05438", glasses: true },
  { move: "cane", skin: "#e7bf98", hair: ["side", "#d9d5cc"], hat: ["cap", "#6b4d3a"], jacket: "#8a6a4f", trousers: "#4a3d38", cane: true, glasses: true },
  { move: "pump", skin: "#f3dcc4", hair: ["bun", "#ece8df"], dress: "#dcc05d", bag: "#5c4238" },
  { move: "hat", skin: "#f1d3b3", hair: ["side", "#cfc9be"], hat: ["trilby", "#3a2f2c"], jacket: "#69873c", trousers: "#3d4a35", glasses: true },
  { move: "hop", skin: "#ecc9a6", hair: ["short", "#f5f2ea"], dress: "#4f7a9a", glasses: true },
  { move: "fever", skin: "#e7bf98", hair: ["short", "#bfb9ae"], shirt: "#fff3d6", trousers: "#5c4238", braces: "#d05438" },
  { move: "twist", skin: "#f1d3b3", hair: ["bun", "#e8e4dc"], dress: "#c46b8c", glasses: true },
  { move: "clap", skin: "#e7bf98", hair: ["bald", "#d9d5cc"], jacket: "#e0894a", trousers: "#4a3d38", glasses: true }
];

function hairSvg([style, c]: Character["hair"]): string {
  switch (style) {
    case "perm":
      return `<g fill="${c}"><circle cx="21" cy="17" r="5"/><circle cx="26.5" cy="12.5" r="5.5"/><circle cx="33.5" cy="12.5" r="5.5"/><circle cx="39" cy="17" r="5"/></g>`;
    case "bun":
      return `<g fill="${c}"><circle cx="30" cy="10" r="4.6"/><path d="M19 22 Q18 12 30 12 Q42 12 41 22 Q37 17 30 17 Q23 17 19 22z"/></g>`;
    case "short":
      return `<path d="M19 21 Q19 11 30 11 Q41 11 41 21 Q37 15.5 30 15.5 Q23 15.5 19 21z" fill="${c}"/>`;
    case "side":
      return `<g fill="${c}"><path d="M19 26 Q17 19 21 16 Q21 21 22.5 24z"/><path d="M41 26 Q43 19 39 16 Q39 21 37.5 24z"/></g>`;
    case "bald":
      return `<g stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M19.5 26 Q18 21 21 18"/><path d="M40.5 26 Q42 21 39 18"/></g>`;
  }
}

function hatSvg([style, c]: NonNullable<Character["hat"]>): string {
  if (style === "cap") return `<g class="hat"><path d="M18.5 17.5 Q30 7 41.5 15 L45 18 Q31 15.5 18.5 19z" fill="${c}"/></g>`;
  return `<g class="hat"><ellipse cx="30" cy="14.5" rx="14" ry="2.6" fill="${c}"/><path d="M23 14.5 Q22.5 5 30 5 Q37.5 5 37 14.5z" fill="${c}"/><rect x="23" y="10.8" width="14" height="2" fill="#d05438"/></g>`;
}

function oudjeSvg(f: Character): string {
  const sleeve = f.dress ?? f.jacket ?? f.shirt ?? "#5c4238";
  let body: string;
  if (f.dress) {
    body = `<path d="M20 39 Q30 35 40 39 L44.5 70 Q30 74 15.5 70z" fill="${f.dress}"/><rect x="23.5" y="70" width="4.5" height="16" rx="2" fill="${f.skin}"/><rect x="32" y="70" width="4.5" height="16" rx="2" fill="${f.skin}"/>`;
  } else {
    body = `<rect x="23" y="62" width="6" height="24" rx="2.5" fill="${f.trousers}"/><rect x="31" y="62" width="6" height="24" rx="2.5" fill="${f.trousers}"/><path d="M19 38.5 Q30 34.5 41 38.5 L41.5 65 L18.5 65z" fill="${sleeve}"/>`;
    if (f.jacket) body += `<path d="M27 37 L30 45 L33 37z" fill="#fff3d6"/>`;
    if (f.braces) body += `<path d="M23.5 38 L24 64 M36.5 38 L36 64" stroke="${f.braces}" stroke-width="2"/>`;
  }
  const shoes = `<ellipse cx="25.5" cy="87.5" rx="4.8" ry="2.4" fill="${K}"/><ellipse cx="34.5" cy="87.5" rx="4.8" ry="2.4" fill="${K}"/>`;
  const arm = (side: "l" | "r") => {
    const x = side === "l" ? 20 : 40;
    const hx = side === "l" ? 13 : 47;
    let extra = "";
    if (side === "r" && f.cane) extra = `<path d="M${hx} 58 L${hx + 2} 86 M${hx} 58 q0 -4 -4 -3.5" stroke="#6b4d3a" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
    if (side === "l" && f.bag) extra = `<rect x="${hx - 4.5}" y="58" width="9" height="7" rx="2" fill="${f.bag}"/>`;
    return `<g class="arm-${side}"><path d="M${x} 41 L${hx} 58" stroke="${sleeve}" stroke-width="5" stroke-linecap="round"/><circle cx="${hx}" cy="58.5" r="2.8" fill="${f.skin}"/>${extra}</g>`;
  };
  const glasses = f.glasses
    ? `<g fill="none" stroke="${K}" stroke-width=".9" opacity=".8"><circle cx="26.2" cy="24.5" r="3"/><circle cx="33.8" cy="24.5" r="3"/><path d="M29.2 24.5h1.6"/></g>`
    : "";
  const face = `<rect x="27.5" y="31" width="5" height="7" fill="${f.skin}"/><circle cx="30" cy="24" r="10.5" fill="${f.skin}"/>${hairSvg(f.hair)}<circle cx="26.2" cy="24.5" r="1.1" fill="${K}"/><circle cx="33.8" cy="24.5" r="1.1" fill="${K}"/>${glasses}<path d="M26.5 29.5 Q30 32 33.5 29.5" stroke="${K}" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="23" cy="28" r="1.6" fill="#e88a7a" opacity=".45"/><circle cx="37" cy="28" r="1.6" fill="#e88a7a" opacity=".45"/>`;
  return `<svg viewBox="0 0 60 92"><ellipse cx="30" cy="89.5" rx="14" ry="2.2" fill="#5c4238" opacity=".18"/><g class="sway"><g class="jump">${body}${shoes}${arm("l")}${arm("r")}${face}${f.hat ? hatSvg(f.hat) : ""}</g></g></svg>`;
}
/** One in ten oudjes has a darker skin: number 7, 17, 27, … */
const DIVERSE_SKINS = ["#9c6644", "#6e4630"];
const isDiverse = (index: number) => index % 10 === 6;
const svgCache = new Map<string, string>();

/** The drawing for one dancer: the cast decides look and dance, the index decides the skin. */
function dancerSvg(cast: number, index: number): string {
  const skin = isDiverse(index) ? DIVERSE_SKINS[Math.floor(index / 10) % DIVERSE_SKINS.length] : CAST[cast].skin;
  const key = `${cast}-${skin}`;
  let svg = svgCache.get(key);
  if (!svg) {
    svg = oudjeSvg({ ...CAST[cast], skin });
    svgCache.set(key, svg);
  }
  return svg;
}

/** Standalone dancer drawings (with size and namespace) for the share card canvas. */
export function cardDancerSvgs(count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    dancerSvg(i % CAST.length, i).replace('<svg viewBox="0 0 60 92">', '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="184" viewBox="0 0 60 92">')
  );
}

// ---------- inrichting: het bruine café van Oma Coby, licht getekend ----------

/** A standing lamp with a fringed shade, as in the old café. */
const LAMP_SVG = `<svg viewBox="0 0 60 150" aria-hidden="true"><ellipse cx="30" cy="40" rx="28" ry="10" fill="#ffe7a8" opacity=".5"/><path d="M30 34v108" stroke="#6b4d3a" stroke-width="3" stroke-linecap="round"/><ellipse cx="30" cy="145" rx="14" ry="3.6" fill="#6b4d3a"/><path d="M14 6h32l10 28H4z" fill="#d9a35b" stroke="${K}" stroke-width="1.4" stroke-linejoin="round"/><path d="M17 13h26M14 21h32" stroke="#b8803e" stroke-width="1.2" opacity=".6"/><g stroke="#b8803e" stroke-width="1.6" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => `<path d="M${6 + i * 4.4} 35v${i % 2 ? 6 : 8}"/>`).join("")}</g><circle cx="30" cy="36" r="3.4" fill="#fff6d0"/></svg>`;

const BOOKCASE_SVG = `<svg viewBox="0 0 96 150" aria-hidden="true"><rect x="2" y="4" width="92" height="144" rx="2" fill="#8a6a4f" stroke="${K}" stroke-width="1.4"/><rect x="8" y="10" width="80" height="132" fill="#5c4238"/>${[10, 43, 76, 109]
  .map((y, r) => {
    let x = 10;
    let books = "";
    const colors = ["#d05438", "#dcc05d", "#69873c", "#4f7a9a", "#c46b8c", "#f1d9cd", "#e0894a"];
    for (let i = 0; x < 82; i++) {
      const w = 5 + ((i * 7 + r * 3) % 5);
      const h = 22 + ((i * 5 + r) % 8);
      books += `<rect x="${x}" y="${y + 31 - h}" width="${w}" height="${h}" rx=".8" fill="${colors[(i + r * 2) % colors.length]}"/>`;
      x += w + 1;
    }
    return books + `<rect x="8" y="${y + 31}" width="80" height="2" fill="#8a6a4f"/>`;
  })
  .join("")}</svg>`;

const PLAYER_SVG = `<svg viewBox="0 0 124 96" aria-hidden="true"><rect x="8" y="40" width="104" height="48" rx="3" fill="#7a5a44" stroke="${K}" stroke-width="1.4"/><path d="M14 88v7M106 88v7" stroke="${K}" stroke-width="3" stroke-linecap="round"/><rect x="18" y="50" width="38" height="30" rx="2" fill="#8a6a4f"/><rect x="62" y="50" width="40" height="30" rx="2" fill="#8a6a4f"/><circle cx="37" cy="65" r="2" fill="#dcc05d"/><circle cx="81" cy="65" r="2" fill="#dcc05d"/><rect x="14" y="22" width="92" height="18" rx="3" fill="#c08446" stroke="${K}" stroke-width="1.2"/><g class="dz-record"><ellipse cx="54" cy="24" rx="30" ry="7" fill="#261f1f"/><ellipse cx="54" cy="24" rx="20" ry="4.6" fill="none" stroke="#4a3d38" stroke-width=".8"/><ellipse cx="54" cy="24" rx="6" ry="1.6" fill="#d05438"/></g><path d="M96 16 L94 26 L78 24" stroke="#cfc9be" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="96" cy="16" r="3" fill="#cfc9be"/><g class="dz-notes" fill="${K}"><path d="M40 8a3 2.4 0 1 1-.1 0V-6l7-2v13a3 2.4 0 1 1-.1 0V-4l-6.9 2z" opacity=".55"/></g></svg>`;

const TABLE_SVG = `<svg viewBox="0 0 112 72" aria-hidden="true"><defs><pattern id="dz-ruit" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fffdf6"/><rect width="4" height="4" fill="#e9a08c"/><rect x="4" y="4" width="4" height="4" fill="#e9a08c"/></pattern></defs><path d="M20 40v30M92 40v30" stroke="#6b4d3a" stroke-width="4" stroke-linecap="round"/><path d="M4 30h104l-6 16H10z" fill="url(#dz-ruit)" stroke="${K}" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="46" cy="29" rx="24" ry="4.5" fill="#fffdf6" stroke="${K}" stroke-width="1"/><g stroke="${K}" stroke-width="1"><circle cx="36" cy="22" r="7" fill="#b5763c"/><circle cx="48" cy="21" r="7.5" fill="#c08446"/><circle cx="58" cy="23" r="6.5" fill="#b5763c"/><circle cx="43" cy="13" r="6.5" fill="#c08446"/><circle cx="53" cy="13" r="6" fill="#b5763c"/></g><g fill="#fffdf6"><circle cx="34" cy="18" r="1.2"/><circle cx="47" cy="16" r="1.4"/><circle cx="57" cy="19" r="1.1"/><circle cx="42" cy="9" r="1.2"/><circle cx="52" cy="9" r="1"/></g><path d="M82 14h10l-1.5 15h-7z" fill="#f6e3a3" stroke="${K}" stroke-width="1"/><path d="M83 18h8" stroke="#fffdf6" stroke-width="1.4"/></svg>`;

const WALKER_SVG = `<svg viewBox="0 0 46 42" aria-hidden="true"><g class="step"><circle cx="14" cy="8" r="5.5" fill="#f1d3b3"/><path d="M8.5 8 Q8.5 2.5 14 2.5 Q19.5 2.5 19.5 8 Q17 5.5 14 5.5 Q11 5.5 8.5 8z" fill="#e5e0d6"/><circle cx="10" cy="3" r="2.4" fill="#e5e0d6"/><path d="M8.5 14h11l2 15H7z" fill="#d05438"/><rect x="9" y="28" width="3.4" height="11" rx="1.5" fill="#f1d3b3"/><rect x="15" y="28" width="3.4" height="11" rx="1.5" fill="#f1d3b3"/><path d="M19 17 L27 20" stroke="#d05438" stroke-width="3" stroke-linecap="round"/></g><path d="M27 19 L29 19 L30 38 M29 19 L41 20 L42 38 M30 28 L41.5 28" stroke="${K}" stroke-width="1.6" stroke-linecap="round" fill="none"/><rect x="31" y="22" width="9" height="5" rx="1" fill="#dcc05d"/><circle cx="30" cy="38.5" r="2.5" fill="${K}"/><circle cx="42" cy="38.5" r="2.5" fill="${K}"/></svg>`;
const FLAME_SVG = `<svg viewBox="0 0 34 18" aria-hidden="true"><defs><linearGradient id="dz-flame-g" x1="1" x2="0" y1="0" y2="0"><stop offset="0" stop-color="#fff3b0"/><stop offset=".35" stop-color="#ffc23d"/><stop offset=".7" stop-color="#f07a2a"/><stop offset="1" stop-color="#d05438" stop-opacity="0"/></linearGradient></defs><path d="M34 9 C26 1 12 2 0 9 C12 16 26 17 34 9z" fill="url(#dz-flame-g)"/><path d="M34 9 C29 5 22 5.5 16 9 C22 12.5 29 13 34 9z" fill="#fffbe0"/></svg>`;

// ---------- discobal-knop ----------

/** Small disco-ball oliebol for the button that opens the disco hall. */
export function DiscoBallIcon() {
  return (
    <svg className="dz-btn-ball" viewBox="6 24 58 58" aria-hidden="true">
      <g className="spin">
        <path d={BOL} fill="#dca666" stroke={K} strokeWidth="3" />
        <path d="M14 40h44M10 50h52M12 60h48M22 30v46M34 26v54M46 28v50" stroke="#a8743c" strokeWidth="2" opacity=".55" />
        <circle cx="27" cy="36" r="3" fill="#fffdf6" />
      </g>
    </svg>
  );
}

// ---------- de discozaal ----------

/** KPI strip, the disco hall and the rollator bar, as shown behind the disco-ball button. */
export function Discozaal({ oliebollen }: { oliebollen: number }) {
  const oudjes = oudjesFor(oliebollen);
  const rest = oliebollen % OLIEBOLLEN_PER_OUDJE;
  const zaalRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useLayoutEffect(() => {
    const el = zaalRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => floorLayout(oudjes, width), [oudjes, width]);
  // The check: one slot per oudje, so the floor always holds exactly the number on the letter board.
  const counted = layout.slots.length;
  const diverse = Array.from({ length: counted }, (_, i) => i).filter(isDiverse).length;

  const tags = [
    oliebollen >= GOAL_OLIEBOLLEN ? <span key="goal" className="rounded bg-kerst-50 px-2 py-0.5 text-kerst-ink">Doel gehaald</span> : null
  ].filter(Boolean);

  const previous = useRef(oudjes);
  useEffect(() => {
    const before = previous.current;
    previous.current = oudjes;
    if (oudjes === before + 1) toast(`Oudje ${formatNumber(oudjes)} komt binnen!`);
    else if (oudjes < before) toast(`Er gaan ${formatNumber(before - oudjes)} ${before - oudjes === 1 ? "oudje" : "oudjes"} naar huis: nu ${formatNumber(oudjes)} op de vloer.`);
  }, [oudjes]);

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        <div className="px-1 py-1">
          <p className={fieldLabel}>Oliebollen verkocht</p>
          <p className="font-serif text-[30px] font-bold leading-9 tabular-nums text-krent">{formatNumber(oliebollen)}</p>
          <p className="text-xs text-muted">dit seizoen</p>
        </div>
        <div className="rounded-md bg-gouwe-50 px-3 py-1">
          <p className={fieldLabel}>Oudjes op de dansvloer</p>
          <p className="font-serif text-[30px] font-bold leading-9 tabular-nums text-feest">{formatNumber(oudjes)}</p>
          <p className="text-xs text-muted">1 oudje = {OLIEBOLLEN_PER_OUDJE} oliebollen</p>
        </div>
        <div className="col-span-2 px-1 py-1 sm:col-span-1">
          <p className={fieldLabel}>Volgende oudje</p>
          <div className="my-1.5 flex gap-1" aria-hidden="true">
            {Array.from({ length: OLIEBOLLEN_PER_OUDJE }, (_, i) => (
              <span key={i} className={`h-3 w-3 rounded-full ${i < rest ? "bg-[radial-gradient(circle_at_35%_30%,#e8b97d_0_20%,#b5763c_55%,#8a5428_100%)]" : "bg-vul-2"}`} />
            ))}
          </div>
          <p className="text-xs text-muted">
            {oliebollen >= GOAL_OLIEBOLLEN ? "Doel gehaald" : `Nog ${OLIEBOLLEN_PER_OUDJE - rest} ${OLIEBOLLEN_PER_OUDJE - rest === 1 ? "oliebol" : "oliebollen"} tot oudje ${formatNumber(oudjes + 1)}`}
          </p>
        </div>
      </div>

      <div className="dz-zaal" ref={zaalRef} role="img" aria-label={`Discozaal met ${formatNumber(counted)} dansende oudjes`} style={{ height: layout.height }}>
        <div className="dz-wainscot" aria-hidden="true" />
        <div className="dz-flecks" aria-hidden="true" />
        <svg className="dz-slinger" viewBox="0 0 1000 44" preserveAspectRatio="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SLINGER_SVG }} />
        <div className="dz-prop dz-lamp" aria-hidden="true" dangerouslySetInnerHTML={{ __html: LAMP_SVG }} />
        <div className="dz-sign" aria-hidden="true">
          <span>Vanavond</span>
          <b className="tabular-nums">{oudjes === 0 ? "Nog leeg" : `${formatNumber(oudjes)} ${oudjes === 1 ? "oudje" : "oudjes"}`}</b>
        </div>
        <div className="dz-prop dz-player" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PLAYER_SVG }} />
        <div className="dz-prop dz-bookcase" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BOOKCASE_SVG }} />
        <div className="dz-ball" aria-hidden="true" dangerouslySetInnerHTML={{ __html: discoBallSvg("dzbal") }} />
        <div className="dz-floor" aria-hidden="true" />
        <div className="dz-prop dz-table" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TABLE_SVG }} />
        <DanceFloor layout={layout} />
        {oudjes === 0 ? (
          <p className="absolute bottom-[52px] left-1/2 z-[5] w-max max-w-[86%] -translate-x-1/2 text-center text-[13px] text-muted">
            <b className="block font-serif text-lg text-krent">De dansvloer is nog leeg.</b>
            Bij {OLIEBOLLEN_PER_OUDJE} oliebollen komt het eerste oudje binnen.
          </p>
        ) : null}
        <div className="absolute right-2.5 top-2.5 z-[5] hidden justify-items-end gap-1 text-[11px] font-bold sm:grid">{tags}</div>
      </div>
      {/* On phones the labels sit under the hall, so they do not cover the letter board. */}
      {tags.length > 0 ? <div className="flex flex-wrap gap-1 text-[11px] font-bold sm:hidden">{tags}</div> : null}
      {counted === oudjes ? (
        oudjes > 0 ? (
          <p className="text-xs text-muted">
            <span className="font-bold text-kerst-ink">✓ Geteld:</span> alle {formatNumber(counted)} {counted === 1 ? "oudje danst" : "oudjes dansen"} op de vloer
            {diverse ? `, ${formatNumber(diverse)} met een donkere huid` : ""}.
          </p>
        ) : null
      ) : (
        <p className="text-xs font-bold text-feest-ink">! Op de vloer staan er {formatNumber(counted)}, maar het moeten er {formatNumber(oudjes)} zijn.</p>
      )}

      <Rollatorbalk oliebollen={oliebollen} />
    </div>
  );
}

// ---------- de dansvloer ----------

/** Hall height without a crowd, and the most it grows to. */
const HALL = 236;
const HALL_MAX = 420;
/** Width over height of one drawing (viewBox 60 × 92). */
const ASPECT = 60 / 92;

interface Slot {
  /** Centre of the feet, in px from the left and top of the hall. */
  x: number;
  y: number;
  row: number;
}

export interface FloorLayout {
  height: number;
  /** Height of one oudje in px. */
  size: number;
  /** Exactly one slot per oudje; slot i belongs to oudje i. */
  slots: Slot[];
}

/** Small fixed wobble per slot, so the crowd does not look like a grid. */
function jitter(i: number, salt: number): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v) - 0.5;
}

/**
 * Places every oudje on the floor. Starts at full size and shrinks until everyone fits; when they get very
 * small, the hall grows instead. Front row first, each row filled from the middle outwards.
 */
export function floorLayout(count: number, width: number): FloorLayout {
  const pad = 8;
  let height = HALL;
  let size = 84;
  for (;;) {
    const colStep = size * ASPECT * 0.82;
    const rowStep = Math.max(3, size * 0.3);
    // Feet stand between the bottom of the floor and a bit below the letter board.
    const front = height - 6;
    const back = Math.max(height * 0.42, 70);
    const cols = Math.max(1, Math.floor((width - 2 * pad - size * ASPECT) / colStep) + 1);
    const rows = Math.max(1, Math.floor((front - back) / rowStep) + 1);
    if (cols * rows >= count || (size <= 7 && height >= HALL_MAX)) {
      const slots: Slot[] = [];
      for (let row = 0; slots.length < count; row++) {
        const shift = row % 2 ? 0.5 : 0;
        const inRow = Math.min(cols - (shift ? 1 : 0) || 1, count - slots.length);
        // Columns ordered from the middle outwards, so a half-full row stands in the centre.
        const rowCols = cols - (shift ? 1 : 0) || 1;
        const order = Array.from({ length: rowCols }, (_, c) => c).sort((a, b) => Math.abs(a - (rowCols - 1) / 2) - Math.abs(b - (rowCols - 1) / 2));
        const rowWidth = (rowCols - 1) * colStep;
        const left = (width - rowWidth) / 2;
        for (const c of order.slice(0, inRow)) {
          const i = slots.length;
          slots.push({
            x: left + c * colStep + jitter(i, 1) * colStep * 0.3,
            y: Math.max(back - rowStep * 2, front - row * rowStep + jitter(i, 2) * rowStep * 0.4),
            row
          });
        }
      }
      return { height, size, slots };
    }
    if (size > 16 || height >= HALL_MAX) size = Math.max(7, size * 0.92);
    else height = Math.min(HALL_MAX, height + 24);
  }
}

/** One image per look and skin, drawn once and reused by the canvas. */
const spriteCache = new Map<string, HTMLImageElement>();
function sprite(cast: number, index: number): HTMLImageElement {
  const key = `${cast}-${isDiverse(index) ? DIVERSE_SKINS[Math.floor(index / 10) % DIVERSE_SKINS.length] : "eigen"}`;
  let img = spriteCache.get(key);
  if (!img) {
    img = new Image();
    const svg = dancerSvg(cast, index).replace('<svg viewBox="0 0 60 92">', '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="184" viewBox="0 0 60 92">');
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    spriteCache.set(key, img);
  }
  return img;
}

const castFor = (i: number) => (i * 3 + Math.floor(i / CAST.length)) % CAST.length;

interface Drawn {
  x: number;
  y: number;
  size: number;
  alpha: number;
  leaving: boolean;
}

/**
 * The dancers on a canvas: every oudje in the layout is drawn, newcomers walk in from the left,
 * oudjes that leave (a cancelled order) walk out to the right. Positions glide when the crowd rearranges.
 */
function DanceFloor({ layout }: { layout: FloorLayout }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawn = useRef<Drawn[]>([]);
  const target = useRef(layout);
  const first = useRef(true);
  target.current = layout;

  // Newcomers start at the door; leavers keep their spot and are marked to walk out.
  const list = drawn.current;
  const { slots, size } = layout;
  for (let i = 0; i < Math.max(list.length, slots.length); i++) {
    if (i < slots.length && !list[i]) list[i] = first.current ? { x: slots[i].x, y: slots[i].y, size, alpha: 1, leaving: false } : { x: -size, y: layout.height - 6, size, alpha: 1, leaving: false };
    else if (i < slots.length) list[i].leaving = false;
    else if (list[i]) list[i].leaving = true;
  }
  first.current = false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let last = 0;
    const still = reducedMotion();

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      // About 30 frames a second is plenty for swaying oudjes.
      if (now - last < 32) return;
      last = now;
      const { slots: tSlots, size: tSize, height } = target.current;
      const w = canvas.clientWidth;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, height);
      const items = drawn.current;
      const ease = still ? 1 : 0.14;
      // Move everyone a step towards their spot (or out of the door), then draw back rows first.
      items.forEach((d, i) => {
        if (!d) return;
        const goal = d.leaving ? { x: w + d.size, y: height - 6 } : tSlots[i];
        d.x += (goal.x - d.x) * ease;
        d.y += (goal.y - d.y) * ease;
        d.size += (tSize - d.size) * ease;
        if (d.leaving) d.alpha = Math.max(0, d.alpha - (still ? 1 : 0.04));
      });
      while (items.length && items[items.length - 1]?.leaving && items[items.length - 1].alpha <= 0) items.pop();
      const order = items.map((_, i) => i).filter((i) => items[i]).sort((a, b) => items[a].y - items[b].y);
      for (const i of order) {
        const d = items[i];
        const img = sprite(castFor(i), i);
        if (!img.complete) continue;
        const h = d.size;
        const wd = h * ASPECT;
        const t = now / 1000;
        const speed = 2.2 + (i % 5) * 0.35;
        const bob = still ? 0 : -Math.abs(Math.sin(t * speed + i)) * h * 0.06;
        const tilt = still || h < 18 ? 0 : Math.sin(t * speed * 0.5 + i * 1.7) * 0.06;
        ctx.globalAlpha = d.alpha;
        ctx.save();
        ctx.translate(d.x, d.y + bob);
        if (tilt) ctx.rotate(tilt);
        ctx.drawImage(img, -wd / 2, -h, wd, h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="dz-dancers" data-oudjes={layout.slots.length} style={{ width: "100%", height: layout.height }} aria-hidden="true" />;
}

// ---------- rollatorbalk ----------

const MILESTONE_KEY = "omacoby-mijlpaal";

/** Progress to the goal; the oudje with the rollator gets a rocket flame while she speeds ahead. */
export function Rollatorbalk({ oliebollen }: { oliebollen: number }) {
  const target = Math.min(100, (oliebollen / GOAL_OLIEBOLLEN) * 100);
  // Start at 0 and fly to the stand, so opening the disco hall launches her once.
  const [pct, setPct] = useState(0);
  const [boost, setBoost] = useState(false);

  useEffect(() => {
    if (target === pct) return;
    const forward = target > pct;
    const frame = requestAnimationFrame(() => setPct(target));
    if (forward && !reducedMotion()) {
      setBoost(true);
      const t = window.setTimeout(() => setBoost(false), 1500);
      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(t);
      };
    }
    return () => cancelAnimationFrame(frame);
    // pct is only read to know where she starts from, so it is not a dependency.
  }, [target]);

  const reached = GOAL_MILESTONES.filter((m) => oliebollen >= m);
  const top = reached[reached.length - 1] ?? 0;
  // A milestone passed since this device last looked: a rolling oliebol, once. The first visit only records it.
  useEffect(() => {
    let seen = 0;
    try {
      seen = Number(localStorage.getItem(MILESTONE_KEY) ?? "0");
    } catch {
      return;
    }
    if (top > seen) {
      if (seen > 0) {
        rollOliebol();
        toast(`${formatNumber(top)} oliebollen: ${formatNumber(oudjesFor(top))} oudjes aan het rock-'n-rollen!`);
      }
      try {
        localStorage.setItem(MILESTONE_KEY, String(top));
      } catch {
        // Private mode: no memory, no celebration.
      }
    }
  }, [top]);

  return (
    <div className="px-1 pb-1 pt-8">
      <div className="dz-track" role="progressbar" aria-valuemin={0} aria-valuemax={GOAL_OLIEBOLLEN} aria-valuenow={oliebollen} aria-label={`Op weg naar ${formatNumber(GOAL_OLIEBOLLEN)} oliebollen`}>
        <div className="dz-fill" style={{ width: `${pct}%` }} />
        {GOAL_MILESTONES.filter((m) => m < GOAL_OLIEBOLLEN).map((m) => (
          <span key={m} className={`dz-mile ${oliebollen >= m ? "hit" : ""}`} style={{ left: `${(m / GOAL_OLIEBOLLEN) * 100}%` }} title={`${formatNumber(m)} oliebollen`} />
        ))}
        <div className={`dz-walker ${boost ? "boost" : ""}`} style={{ left: `clamp(28px, ${pct}%, calc(100% - 12px))` }}>
          <span className="dz-flame" dangerouslySetInnerHTML={{ __html: FLAME_SVG }} />
          <span dangerouslySetInnerHTML={{ __html: WALKER_SVG }} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted">
        <span>
          {oliebollen >= GOAL_OLIEBOLLEN ? (
            <b className="text-krent">Doel gehaald!</b>
          ) : (
            <>
              Nog <b className="tabular-nums text-krent">{formatNumber(GOAL_OLIEBOLLEN - oliebollen)}</b> tot het doel
            </>
          )}
        </span>
        <span>
          Doel: <b className="text-krent">{formatNumber(GOAL_OLIEBOLLEN)}</b> oliebollen = <b className="text-krent">{formatNumber(oudjesFor(GOAL_OLIEBOLLEN))}</b> oudjes naar de Gouwe Ouwe-avond
        </span>
      </div>
    </div>
  );
}
