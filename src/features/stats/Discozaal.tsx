import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fieldLabel, formatNumber, rollOliebol, toast } from "../../components/ui";
import { GOAL_MILESTONES, GOAL_OLIEBOLLEN, OLIEBOLLEN_PER_OUDJE } from "../../config";
import "./discozaal.css";

// De Tussenstand als discozaal, achter de discobal-knop bij de grafiek:
// per tien verkochte oliebollen danst er een oudje bij.

/** From this many oudjes a polonaise walks past in front. */
const POLONAISE_FROM = 60;
/** Three rows on the dance floor, front to back; every figure is one oudje. */
const ROWS = [
  { scale: 1, bottom: 6, step: 84 },
  { scale: 0.82, bottom: 30, step: 70 },
  { scale: 0.66, bottom: 52, step: 58 }
];

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
  { move: "pump", skin: "#c99168", hair: ["bun", "#ece8df"], dress: "#dcc05d", bag: "#5c4238" },
  { move: "hat", skin: "#f1d3b3", hair: ["side", "#cfc9be"], hat: ["trilby", "#3a2f2c"], jacket: "#69873c", trousers: "#3d4a35", glasses: true },
  { move: "hop", skin: "#9c6644", hair: ["short", "#f5f2ea"], dress: "#4f7a9a", glasses: true },
  { move: "fever", skin: "#e7bf98", hair: ["short", "#bfb9ae"], shirt: "#fff3d6", trousers: "#5c4238", braces: "#d05438" },
  { move: "twist", skin: "#f1d3b3", hair: ["bun", "#e8e4dc"], dress: "#c46b8c", glasses: true },
  { move: "clap", skin: "#6e4630", hair: ["bald", "#d9d5cc"], jacket: "#e0894a", trousers: "#4a3d38", glasses: true }
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
const CAST_SVG = CAST.map(oudjeSvg);

// ---------- inrichting: het bruine café van Oma Coby, licht getekend ----------

const LAMP_SVG = `<svg viewBox="0 0 70 108" aria-hidden="true"><path d="M35 0v38" stroke="${K}" stroke-width="1.6"/><ellipse cx="35" cy="78" rx="30" ry="12" fill="#ffe7a8" opacity=".55"/><path d="M15 38h40l11 32H4z" fill="#d9a35b" stroke="${K}" stroke-width="1.4" stroke-linejoin="round"/><path d="M20 44h30M17 52h36M13 61h44" stroke="#b8803e" stroke-width="1.2" opacity=".6"/><g stroke="#b8803e" stroke-width="1.6" stroke-linecap="round">${Array.from({ length: 13 }, (_, i) => `<path d="M${6 + i * 4.8} 71v${i % 2 ? 7 : 9}"/>`).join("")}</g><circle cx="35" cy="73" r="4" fill="#fff6d0"/></svg>`;

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

  // Every figure is exactly one oudje, so the hall can be counted: three rows on the floor (front first),
  // then the polonaise. Whoever does not fit waits outside, with the number shown.
  const narrow = width < 640;
  const span = width * (narrow ? 0.92 : 0.7);
  const rowCaps = ROWS.map((r) => Math.max(2, Math.floor(span / r.step)));
  const floorCap = rowCaps.reduce((a, b) => a + b, 0);
  const onFloor = Math.min(oudjes, floorCap);
  const poloMembers = oudjes - onFloor > 0 && oudjes >= POLONAISE_FROM ? Math.min(8, oudjes - onFloor, 3 + Math.floor((oudjes - POLONAISE_FROM) / 60)) : 0;
  const outside = Math.max(0, oudjes - onFloor - poloMembers);

  // Place dancers row by row, each row from the middle outwards; back rows sit between the heads in front.
  const placed: Array<{ row: number; left: number; cast: number }> = [];
  let left = onFloor;
  ROWS.forEach((_, ri) => {
    const n = Math.min(left, rowCaps[ri]);
    left -= n;
    const cap = rowCaps[ri];
    const order = Array.from({ length: cap }, (_, j) => j).sort((a, b) => Math.abs(a - (cap - 1) / 2) - Math.abs(b - (cap - 1) / 2));
    const startPct = narrow ? 4 : 15;
    const widthPct = narrow ? 92 : 70;
    order.slice(0, n).forEach((j) => {
      placed.push({ row: ri, left: startPct + ((j + 0.5 + (ri % 2 ? 0.25 : 0)) / cap) * widthPct, cast: (placed.length * 3 + ri) % CAST.length });
    });
  });

  const tags = [
    oliebollen >= GOAL_OLIEBOLLEN ? <span key="goal" className="rounded bg-kerst-50 px-2 py-0.5 text-kerst-ink">Doel gehaald</span> : null,
    poloMembers > 0 ? <span key="polo" className="rounded bg-gouwe-100 px-2 py-0.5 text-gouwe-ink">{poloMembers} in de polonaise</span> : null,
    outside > 0 ? <span key="out" className="rounded bg-papier/90 px-2 py-0.5 text-krent shadow-zacht">+ {formatNumber(outside)} in de rij voor de deur</span> : null
  ].filter(Boolean);

  // Dancers that join while the hall is open walk in; the first render just shows who is there.
  const firstCount = useRef(onFloor);
  const previous = useRef(oudjes);
  useEffect(() => {
    const before = previous.current;
    previous.current = oudjes;
    if (oudjes === before + 1) toast(`Oudje ${formatNumber(oudjes)} komt binnen!`);
    if (before < POLONAISE_FROM && oudjes >= POLONAISE_FROM) toast("Polonaise! Iedereen achter elkaar aan.");
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

      <div className="dz-zaal" ref={zaalRef} role="img" aria-label={`Discozaal met ${formatNumber(oudjes)} dansende oudjes`}>
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
        <div className="dz-dancers" aria-hidden="true">
          {placed.map((d, i) => {
            const r = ROWS[d.row];
            return (
              <div
                key={i}
                className={`dz-d m-${CAST[d.cast].move} ${i >= firstCount.current && !reducedMotion() ? "enter" : ""}`}
                style={{
                  left: `${d.left.toFixed(1)}%`,
                  bottom: r.bottom,
                  width: 54 * r.scale,
                  height: 84 * r.scale,
                  zIndex: 3 - d.row,
                  ["--dl" as string]: `${(-(i * 0.37) % 2).toFixed(2)}s`,
                  ["--sw" as string]: `${(2.2 + (i % 3) * 0.3).toFixed(1)}s`
                }}
                dangerouslySetInnerHTML={{ __html: CAST_SVG[d.cast] }}
              />
            );
          })}
        </div>
        {poloMembers > 0 ? (
          <div className="dz-polo" aria-hidden="true">
            <div className="dz-train" style={{ ["--zw" as string]: `${width + 40}px` }}>
              {Array.from({ length: poloMembers }, (_, i) => {
                const c = (i + 2) % CAST.length;
                return <div key={i} className={`dz-d m-${CAST[c].move}`} dangerouslySetInnerHTML={{ __html: CAST_SVG[c] }} />;
              })}
            </div>
          </div>
        ) : null}
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

      <Rollatorbalk oliebollen={oliebollen} />
    </div>
  );
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
