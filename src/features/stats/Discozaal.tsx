import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Sticker, fieldLabel, formatNumber, rollOliebol, toast } from "../../components/ui";
import { GOAL_MILESTONES, GOAL_OLIEBOLLEN, OLIEBOLLEN_PER_OUDJE } from "../../config";
import "./discozaal.css";

// De tussenstand als discozaal: per tien verkochte oliebollen danst er een oudje bij.
// Drie losse componenten: Verkoopteller, Rollatorbalk en Discozaal.

/** Above this many oudjes the rest joins the polonaise instead of the dance floor. */
const FLOOR_CAPACITY = 36;
const DISCO_KEY = "omacoby-disco";

export function oudjesFor(oliebollen: number): number {
  return Math.floor(oliebollen / OLIEBOLLEN_PER_OUDJE);
}

/** Small seeded random, so every oudje keeps the same look and spot between renders. */
function seeded(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useReducedMotion(): boolean {
  return useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
}

/** Tweens a number towards its new value, so the counter visibly counts up. */
function useCountUp(value: number): number {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  useEffect(() => {
    if (reduce) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    const from = shownRef.current;
    const start = performance.now();
    const duration = Math.min(900, 200 + Math.abs(value - from) / 10);
    let frame = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      shownRef.current = Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3)));
      setShown(shownRef.current);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);
  return shown;
}

// ---------- Verkoopteller ----------

/** Big sales counter: oliebollen sold, the oudjes they pay for, and how far the next oudje is. */
export function Verkoopteller({ oliebollen }: { oliebollen: number }) {
  const shown = useCountUp(oliebollen);
  const oudjes = oudjesFor(oliebollen);
  const rest = oliebollen % OLIEBOLLEN_PER_OUDJE;
  const toGo = OLIEBOLLEN_PER_OUDJE - rest;
  return (
    <section className="grid gap-x-7 gap-y-4 rounded-kaart bg-papier p-5 shadow-zacht sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-end">
      <div>
        <p className={fieldLabel}>Oliebollen verkocht</p>
        <p className="font-serif text-[64px] font-bold leading-[0.95] tracking-tight tabular-nums text-krent sm:text-[88px]">{formatNumber(shown)}</p>
        <p className="mt-1.5 text-oliebol">dit seizoen, tot en met vandaag</p>
      </div>
      <div className="grid gap-2">
        <p className="font-display text-[32px] uppercase leading-none tracking-wide text-krent">
          = <span className="text-feest">{formatNumber(oudjes)}</span> {oudjes === 1 ? "oudje" : "oudjes"} op de dansvloer
        </p>
        <div className="dz-dots" aria-hidden="true">
          {Array.from({ length: OLIEBOLLEN_PER_OUDJE }, (_, i) => (
            <span key={i} className={`dz-dot ${i < rest ? "on" : ""}`} />
          ))}
        </div>
        <p className="text-xs text-muted">
          {oliebollen >= GOAL_OLIEBOLLEN
            ? "Doel gehaald. Iedereen mag mee naar de Gouwe Ouwe-avond!"
            : `Nog ${toGo} ${toGo === 1 ? "oliebol" : "oliebollen"} tot ${oudjes === 0 ? "het eerste oudje" : `oudje ${formatNumber(oudjes + 1)}`}.`}
        </p>
      </div>
    </section>
  );
}

// ---------- Rollatorbalk ----------

const MILESTONE_KEY = "omacoby-mijlpaal";

function RollatorOudje() {
  return (
    <svg viewBox="0 0 74 74" aria-hidden="true">
      <ellipse cx="38" cy="72" rx="26" ry="2.4" fill="#261f1f" opacity=".15" />
      <g className="bob">
        <g className="leg-b">
          <path d="M27 44 L25 62" stroke="#5c4238" strokeWidth="4" strokeLinecap="round" />
          <path d="M22 63h6" stroke="#261f1f" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="leg-a">
          <path d="M27 44 L29 62" stroke="#5c4238" strokeWidth="4" strokeLinecap="round" />
          <path d="M27 63h6" stroke="#261f1f" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path d="M19 26 Q26 22 33 27 L33 46 Q26 48 20 46 Z" fill="#d05438" stroke="#261f1f" strokeWidth="1.2" />
        <path d="M31 29 L44 35" stroke="#d05438" strokeWidth="3.6" strokeLinecap="round" />
        <circle cx="45" cy="35.5" r="2.2" fill="#f1d3b3" />
        <circle cx="29" cy="16" r="7" fill="#f1d3b3" stroke="#261f1f" strokeWidth="1.1" />
        <path d="M22 16c0-6 3.5-8.5 7-8.5s7.5 2.5 7 8c-2-3-4.5-4-7-4s-5 1-7 4.5z" fill="#eceae4" />
        <circle cx="24" cy="10" r="3.4" fill="#eceae4" />
        <g fill="none" stroke="#261f1f" strokeWidth=".9">
          <circle cx="32.5" cy="16" r="2.1" />
          <path d="M34.6 16h1.4" />
        </g>
        <path d="M31 20 Q33 21.5 35 20" stroke="#261f1f" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>
      <g stroke="#261f1f" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M44 34 L48 34 L50 62 M48 34 L64 36 L66 62 M50 50 L65 50" />
      </g>
      <rect x="51" y="40" width="12" height="8" rx="1.5" fill="#dcc05d" stroke="#261f1f" strokeWidth="1.2" />
      <circle className="wheel" cx="50" cy="65" r="4" fill="#fffdf6" stroke="#261f1f" strokeWidth="2" />
      <circle className="wheel" cx="66" cy="65" r="4" fill="#fffdf6" stroke="#261f1f" strokeWidth="2" />
    </svg>
  );
}

/** Big progress bar to the goal; an oudje with a rollator walks along as the fill grows. */
export function Rollatorbalk({ oliebollen }: { oliebollen: number }) {
  const pct = Math.min(100, (oliebollen / GOAL_OLIEBOLLEN) * 100);
  const [walking, setWalking] = useState(false);
  const reached = GOAL_MILESTONES.filter((m) => oliebollen >= m);
  const top = reached[reached.length - 1] ?? 0;

  useEffect(() => {
    setWalking(true);
    const t = window.setTimeout(() => setWalking(false), 1300);
    return () => window.clearTimeout(t);
  }, [pct]);

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
    <section className="rounded-kaart bg-papier px-5 pb-5 pt-[72px] shadow-zacht">
      <div className="dz-track" role="progressbar" aria-valuemin={0} aria-valuemax={GOAL_OLIEBOLLEN} aria-valuenow={oliebollen} aria-label={`Op weg naar ${formatNumber(GOAL_OLIEBOLLEN)} oliebollen`}>
        <div className="dz-fill" style={{ width: `${pct}%` }} />
        {GOAL_MILESTONES.map((m) => (
          <span key={m} className={`dz-mile ${oliebollen >= m ? "hit" : ""}`} style={{ left: `${(m / GOAL_OLIEBOLLEN) * 100}%` }}>
            {oliebollen >= m && m < GOAL_OLIEBOLLEN ? (
              <span className="dz-hit">
                <Sticker tone="gouwe" className="px-2 py-1 text-sm">Gehaald!</Sticker>
              </span>
            ) : null}
            <span className="t">
              {formatNumber(m)}
              <small>{formatNumber(oudjesFor(m))} oudjes</small>
            </span>
          </span>
        ))}
        <svg className="dz-flag" viewBox="0 0 26 46" aria-hidden="true">
          <path d="M3 2v44" stroke="#261f1f" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M4 3h18l-5 6 5 6H4z" fill="#d05438" />
          <path d="M4 3h6v6H4zM10 9h6v6h-6z" fill="#fffdf6" opacity=".9" />
        </svg>
        <div className={`dz-walker ${walking ? "" : "idle"}`} style={{ left: `${pct}%` }}>
          <RollatorOudje />
        </div>
      </div>
      <div className="mt-11 flex flex-wrap justify-between gap-3 text-[13px] text-muted">
        <span>
          {oliebollen >= GOAL_OLIEBOLLEN ? (
            <b className="text-krent">Doel gehaald!</b>
          ) : (
            <>
              Nog <b className="tabular-nums text-krent">{formatNumber(GOAL_OLIEBOLLEN - oliebollen)}</b> oliebollen te gaan
            </>
          )}
        </span>
        <span>
          Doel: <b className="text-krent">{formatNumber(GOAL_OLIEBOLLEN)} oliebollen</b> = {formatNumber(oudjesFor(GOAL_OLIEBOLLEN))} gratis entrees voor een Gouwe Ouwe-avond
        </span>
      </div>
    </section>
  );
}

// ---------- Discozaal ----------

const SKIN = ["#f1d3b3", "#e7bf98", "#c99168", "#9c6644", "#6e4630"];
const HAIR = ["#eceae4", "#d9d5cc", "#bfb9ae", "#f5f2ea"];
const CLOTHES = ["#d05438", "#69873c", "#dcc05d", "#5c4238", "#c46b8c", "#4f7a9a", "#e0894a"];
const DANCES: Array<[string, string]> = [
  ["dz-wave-l", "dz-wave-r"],
  ["dz-wave-l", "dz-fever-r"],
  ["dz-up-l", "dz-up-r"],
  ["dz-still", "dz-wave-r"]
];

/** Look and dance of one oudje; the seed keeps them the same between renders. */
function oudjeLook(seed: number) {
  const r = seeded(seed * 97 + 13);
  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)];
  const skin = pick(SKIN);
  const hair = pick(HAIR);
  const cloth = pick(CLOTHES);
  const cloth2 = pick(CLOTHES);
  const dress = r() < 0.55;
  const glasses = r() < 0.6;
  const hairStyle = Math.floor(r() * 4);
  const pearls = dress && r() < 0.5;
  const [al, ar] = pick(DANCES);
  const d0 = (1.1 + r() * 0.6).toFixed(2);
  const dl = (-r() * 2).toFixed(2);
  const armColor = dress ? skin : cloth;

  const hairShape = [
    <g key="bun" fill={hair}>
      <circle cx="24" cy="12" r="4.2" />
      <path d="M16 21c0-7 4-10 8-10s8 3 8 10c-2-4-5-5-8-5s-6 1-8 5z" />
    </g>,
    <g key="perm" fill={hair}>
      <circle cx="18" cy="17" r="3.6" />
      <circle cx="22" cy="14" r="3.8" />
      <circle cx="27" cy="14" r="3.8" />
      <circle cx="30.5" cy="17.5" r="3.4" />
      <circle cx="16.5" cy="21" r="2.6" />
      <circle cx="31.5" cy="21.5" r="2.6" />
    </g>,
    <path key="fringe" d="M16 23c0-3 1-5 2-6M32 23c0-3-1-5-2-6" stroke={hair} strokeWidth="3.2" strokeLinecap="round" fill="none" />,
    <path key="short" d="M15.5 22c-.5-8 4-11 8.5-11s9 3 8.5 11c-1.5-5-4.5-6.5-8.5-6.5S17 17 15.5 22z" fill={hair} />
  ][hairStyle];

  return {
    style: { "--al": al, "--ar": ar, "--d0": `${d0}s`, "--dl": `${dl}s` } as CSSProperties,
    svg: (
      <svg viewBox="0 0 48 78">
        <ellipse cx="24" cy="76" rx="11" ry="2.4" fill="#261f1f" opacity=".18" />
        <g className="move">
          <path d="M20 58 L19 73 M28 58 L29 73" stroke={dress ? skin : "#261f1f"} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M15.5 74.5h6M26.5 74.5h6" stroke="#261f1f" strokeWidth="3" strokeLinecap="round" />
          {dress ? (
            <path d="M15 33 Q24 29 33 33 L37 59 Q24 63 11 59 Z" fill={cloth} stroke="#261f1f" strokeWidth="1.2" />
          ) : (
            <>
              <path d="M15 33 Q24 29 33 33 L34 52 L14 52 Z" fill={cloth} stroke="#261f1f" strokeWidth="1.2" />
              <path d="M24 31v21" stroke="#261f1f" strokeWidth=".9" opacity=".5" />
              <rect x="15" y="51" width="18" height="9" rx="2" fill={cloth2 === cloth ? "#5c4238" : cloth2} stroke="#261f1f" strokeWidth="1.1" />
            </>
          )}
          {pearls ? <path d="M19 32.5 Q24 36 29 32.5" stroke="#fffdf6" strokeWidth="1.6" strokeDasharray="0.1 2.2" strokeLinecap="round" fill="none" /> : null}
          <g className="arm-l">
            <path d="M15 37 L8 48" stroke={armColor} strokeWidth="3.6" strokeLinecap="round" />
            <circle cx="8" cy="48.5" r="2.4" fill={skin} />
          </g>
          <g className="arm-r">
            <path d="M33 37 L40 48" stroke={armColor} strokeWidth="3.6" strokeLinecap="round" />
            <circle cx="40" cy="48.5" r="2.4" fill={skin} />
          </g>
          <circle cx="24" cy="22" r="8" fill={skin} stroke="#261f1f" strokeWidth="1.1" />
          {hairShape}
          <path d="M21 26.2 Q24 28.6 27 26.2" stroke="#261f1f" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <circle cx="19.6" cy="25" r="1.4" fill="#e88a7a" opacity=".55" />
          <circle cx="28.4" cy="25" r="1.4" fill="#e88a7a" opacity=".55" />
          {glasses ? (
            <g fill="none" stroke="#261f1f" strokeWidth=".9">
              <circle cx="21" cy="22" r="2.3" />
              <circle cx="27" cy="22" r="2.3" />
              <path d="M23.3 22h1.4" />
            </g>
          ) : (
            <>
              <circle cx="21.2" cy="22" r=".9" fill="#261f1f" />
              <circle cx="26.8" cy="22" r=".9" fill="#261f1f" />
            </>
          )}
        </g>
      </svg>
    )
  };
}

/** Fixed spots on the floor: filled from the middle front outwards, back rows smaller. */
const SLOTS = (() => {
  const r = seeded(7);
  const out: Array<{ x: number; y: number; k: number }> = [];
  const rows = 5;
  const cols = 9;
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const y = 0.26 + (row / (rows - 1)) * 0.72;
      const x = 0.06 + ((c + (row % 2 ? 0.5 : 0)) / cols) * 0.9 + (r() - 0.5) * 0.04;
      out.push({ x: Math.min(0.96, x), y: y + (r() - 0.5) * 0.04, k: Math.abs(x - 0.5) * 1.2 + (1 - y) * 0.9 + r() * 0.15 });
    }
  }
  return out.sort((a, b) => a.k - b.k).slice(0, FLOOR_CAPACITY);
})();

const RAISINS: Array<[number, number, number, number]> = [
  [26, 33, 2.8, -20], [40, 30, 2.5, 25], [33, 42, 2.6, 0], [47, 40, 2.1, 10], [18, 38, 2, -10],
  [36, 22, 2, 30], [22, 46, 2.2, 15], [44, 49, 1.9, -25], [29, 52, 2, 5], [14, 29, 1.7, 0]
];
const FLAG_COLORS = ["#d05438", "#dcc05d", "#69873c", "#5c4238", "#fffdf6"];

function DiscoOliebol() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M33 5c8 0 12 4 17 7 6 4 10 10 9 18 0 9-3 15-8 20-6 6-13 9-21 8-8-1-15-4-20-10C5 42 4 35 6 28c2-8 7-13 13-18 4-3 9-5 14-5z" fill="#b5763c" stroke="#261f1f" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 40c4 8 12 13 21 13 8 0 15-4 19-11" fill="none" stroke="#7d4a22" strokeWidth="3" strokeLinecap="round" opacity=".55" />
      <path d="M17 19c3-5 8-8 14-8" fill="none" stroke="#e8b97d" strokeWidth="3" strokeLinecap="round" />
      <g fill="#fffdf6">
        <circle cx="24" cy="14" r="2" />
        <circle cx="31" cy="11" r="1.6" />
        <circle cx="38" cy="14" r="2.2" />
        <circle cx="44" cy="19" r="1.5" />
        <circle cx="20" cy="22" r="1.4" />
        <circle cx="28" cy="20" r="1.7" />
        <ellipse cx="42" cy="11" rx="2" ry="1.3" />
      </g>
      {RAISINS.map(([x, y, r, a]) => (
        <ellipse key={`${x}-${y}`} className="raisin" cx={x} cy={y} rx={r} ry={+(r * 0.68).toFixed(1)} transform={`rotate(${a} ${x} ${y})`} fill="#261f1f" />
      ))}
    </svg>
  );
}

function Dancer({ seed, slot, enter }: { seed: number; slot?: { x: number; y: number }; enter?: boolean }) {
  const o = oudjeLook(seed);
  const place: CSSProperties = slot
    ? { left: `${(slot.x * 100).toFixed(1)}%`, top: `${(slot.y * 100).toFixed(1)}%`, zIndex: Math.round(slot.y * 100), ["--s" as string]: (0.72 + slot.y * 0.42).toFixed(2) }
    : {};
  return (
    <div className={`dz-dancer ${enter ? "enter" : ""}`} style={{ ...o.style, ...place }}>
      {o.svg}
    </div>
  );
}

function readDisco(): boolean {
  try {
    return localStorage.getItem(DISCO_KEY) !== "uit";
  } catch {
    return true;
  }
}

/** The dance floor: one oudje per ten oliebollen under a spinning oliebol; "lichtgevende krenten" turns on the disco. */
export function Discozaal({ oliebollen }: { oliebollen: number }) {
  const [disco, setDisco] = useState(readDisco);
  const oudjes = oudjesFor(oliebollen);
  const onFloor = Math.min(oudjes, FLOOR_CAPACITY);
  const polonaise = oudjes - onFloor;

  // Dancers that appear after the first render come in with a hop.
  const firstCount = useRef(onFloor);
  const previous = useRef(oudjes);
  useEffect(() => {
    const before = previous.current;
    previous.current = oudjes;
    if (oudjes - before === 1) toast(oudjes === 1 ? "Het eerste oudje komt binnen!" : `Oudje ${formatNumber(oudjes)} komt binnen!`);
  }, [oudjes]);

  function toggle() {
    const next = !disco;
    setDisco(next);
    try {
      localStorage.setItem(DISCO_KEY, next ? "aan" : "uit");
    } catch {
      // Not remembered in private mode.
    }
  }

  return (
    <section className="grid gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          aria-pressed={disco}
          onClick={toggle}
          className="dz-switch inline-flex items-center gap-2.5 rounded-full bg-papier py-1.5 pl-1.5 pr-3.5 text-sm font-bold text-krent shadow-zacht"
        >
          <span className="knob" />
          <span className="glow" />
          Lichtgevende krenten
        </button>
        <p className="text-xs text-muted">
          {polonaise > 0 ? `${formatNumber(oudjes)} oudjes: ${FLOOR_CAPACITY} op de vloer, de rest in de polonaise.` : "Eén figuurtje = één oudje = tien oliebollen."}
        </p>
      </div>
      <div className={`dz-zaal shadow-zacht ${disco ? "disco" : ""}`} role="img" aria-label={`Discozaal met ${formatNumber(oudjes)} dansende oudjes`}>
        <div className="dz-wall" />
        <div className="dz-wall-dark" />
        <svg className="dz-bunting" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 6 Q500 30 1000 6" fill="none" stroke="#261f1f" strokeWidth="1.5" />
          {Array.from({ length: 24 }, (_, i) => {
            const x = 20 + i * 41;
            const t = x / 1000;
            const y = 6 + 24 * 4 * t * (1 - t) * 0.98;
            return <path key={i} d={`M${x - 11} ${y} L${x + 11} ${y} L${x} ${y + 22} Z`} fill={FLAG_COLORS[i % 5]} stroke="#261f1f" strokeWidth=".8" />;
          })}
        </svg>
        <div className="dz-banner">Gouwe Ouwe-avond</div>
        <div className="dz-sign">
          Vanavond<b className="tabular-nums">{formatNumber(oudjes)}</b>gasten
        </div>
        <div className="dz-floor" />
        <div className="dz-floor-disco" />
        <div className="dz-beams" aria-hidden="true">
          <div className="dz-beam b1" />
          <div className="dz-beam b2" />
          <div className="dz-beam b3" />
          <div className="dz-beam b4" />
        </div>
        <div className="dz-cord" />
        <div className="dz-ball">
          <DiscoOliebol />
        </div>
        {[[-70, 30, 0], [64, 10, 0.5], [-50, 100, 1.1], [80, 80, 0.8], [-90, 70, 1.4], [40, 120, 0.3]].map(([dx, dy, delay]) => (
          <span key={`${dx}-${dy}`} className="dz-sparkle" style={{ left: `calc(50% + ${dx}px)`, top: dy + 30, animationDelay: `${delay}s` }} />
        ))}
        <div className="dz-dancefloor" aria-hidden="true">
          {SLOTS.slice(0, onFloor).map((slot, i) => (
            <Dancer key={i} seed={i + 1} slot={slot} enter={i >= firstCount.current} />
          ))}
        </div>
        {oudjes === 0 ? (
          <div className="dz-empty">
            <p className="font-serif text-lg font-bold text-krent">De dansvloer is nog leeg.</p>
            <p className="text-[13px] text-muted">Bij 10 oliebollen komt het eerste oudje binnen.</p>
          </div>
        ) : null}
        {polonaise > 0 ? (
          <>
            <div className="dz-polo-tag">+ {formatNumber(polonaise)} in de polonaise</div>
            <div className="dz-polonaise" aria-hidden="true">
              <div className="line">
                {Array.from({ length: Math.min(14, polonaise) }, (_, i) => (
                  <Dancer key={i} seed={500 + i} />
                ))}
              </div>
            </div>
          </>
        ) : null}
        {oliebollen >= GOAL_OLIEBOLLEN ? (
          <div className="dz-goal">
            <Sticker tone="kerst">Doel gehaald!</Sticker>
          </div>
        ) : null}
      </div>
    </section>
  );
}
