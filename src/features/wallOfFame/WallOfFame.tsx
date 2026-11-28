import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { PublicWall, PublicWallEntry, WallInk } from "../../types/wallOfFame";
import { OLIEBOL_SVG, formatNumber } from "../../components/ui";
import { DiscoOudje } from "../stats/Discozaal";
import omaUrl from "../../assets/oma-coby.jpg";
import { earlyCutoff, signLines } from "./wall";
import "./wallScene.css";

/*
 * Oma's muur als foto in haar café: een okergele gepleisterde muur, dicht behangen met bruine lijsten zoals in een
 * oud bruin café. Goud hangt groot onder een koperen schilderijlampje, Zilver in kleinere lijsten met het logo;
 * onder elke lijst een messing plaatje met naam en ouderen (nooit bedragen). Tussen de bedrijven hangt wat in elk
 * café hangt: Oma's portret, een affiche, een prent, een foto. Brons staat met krijt op het bord. Daaronder de
 * lambrisering, de terrazzovloer, thonetkrukken en een marmeren tafeltje met oliebollen. Daglicht van links.
 * Logo's worden krent-inkt op ivoor (InkFilters). Zonder goedgekeurd logo, of als het logo niet laadt of een leeg
 * vlak geeft, hangt er een bordje met de naam uitgeschreven: een lijst is nooit leeg.
 */

/** De SVG-filters die een logo omzetten naar krent-inkt (#261f1f). Eén keer per pagina. */
export function InkFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        {/* Donker logo op licht: hoe donkerder, hoe meer inkt; wit wordt doorzichtig. */}
        <filter id="oc-inkt-donker" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 0.149  0 0 0 0 0.122  0 0 0 0 0.122  -0.37 -1.25 -0.13 0 1.75" result="inkt" />
          <feComposite in="inkt" in2="SourceGraphic" operator="in" />
        </filter>
        {/* Licht logo (wit op donker of doorzichtig): hoe lichter, hoe meer inkt. */}
        <filter id="oc-inkt-licht" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 0.149  0 0 0 0 0.122  0 0 0 0 0.122  0.37 1.25 0.13 0 -0.1" result="inkt" />
          <feComposite in="inkt" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

type Finish = "walnoot" | "eiken" | "donker" | "ebben";
type Side = "top" | "bottom" | "left" | "right";

/** Grondkleur van het hout; de nerf en het profiel komen eroverheen. */
const FINISH: Record<Finish, string> = { walnoot: "#5e3a20", eiken: "#86592f", donker: "#3a2414", ebben: "#1d1510" };

/** Het profiel van een lijst van buiten naar binnen: rand, holte, plat, binnenrandje. Licht en donker over het hout. */
const PROFILE: Array<[number, string, number]> = [
  [0, "#000", 0.55],
  [0.06, "#fff", 0.22],
  [0.16, "#fff", 0.04],
  [0.32, "#000", 0.32],
  [0.5, "#000", 0.04],
  [0.7, "#fff", 0.1],
  [0.84, "#000", 0.18],
  [0.9, "#ffe9c8", 0.38],
  [0.96, "#000", 0.35],
  [1, "#000", 0.6]
];

/** Het licht valt van linksboven (het raam): boven en links lichter, rechts en onder in de schaduw. */
const SIDE_LIGHT: Record<Side, [string, number]> = { top: ["#fff6e0", 0.12], left: ["#fff6e0", 0.07], right: ["#0d0703", 0.24], bottom: ["#0d0703", 0.34] };
const SIDE_DIR: Record<Side, [number, number, number, number]> = { top: [0, 0, 0, 1], bottom: [0, 1, 0, 0], left: [0, 0, 1, 0], right: [1, 0, 0, 0] };

/** Hout, krijt, leer en marmer: één keer per muur. */
function SceneDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        {/* Houtnerf: ruis die in de lengte is uitgerekt, als donkere strepen over de grondkleur. */}
        <filter id="wof-nerf" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.16" numOctaves="4" seed="11" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.09  0 0 0 0 0.05  0 0 0 0 0.02  1.8 0 0 0 -0.62" />
        </filter>
        <pattern id="wof-nerf-h" patternUnits="userSpaceOnUse" width="520" height="140">
          <rect width="520" height="140" filter="url(#wof-nerf)" />
        </pattern>
        <pattern id="wof-nerf-v" patternUnits="userSpaceOnUse" width="520" height="140" patternTransform="rotate(90)">
          <rect width="520" height="140" filter="url(#wof-nerf)" />
        </pattern>
        {(Object.keys(SIDE_DIR) as Side[]).map((s) => {
          const [x1, y1, x2, y2] = SIDE_DIR[s];
          return (
            <linearGradient key={s} id={`wof-prof-${s}`} x1={x1} y1={y1} x2={x2} y2={y2}>
              {PROFILE.map(([o, c, a]) => (
                <stop key={o} offset={o} stopColor={c} stopOpacity={a} />
              ))}
            </linearGradient>
          );
        })}
        {/* Krijt: rafelige randen en gaatjes waar het krijt het bord niet raakte. */}
        <filter id="wof-krijt" x="-2%" y="-10%" width="104%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.6 0 0 0 2.2" result="gat" />
          <feComposite in="d" in2="gat" operator="in" />
        </filter>
        <radialGradient id="wof-leer" cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#c8452f" />
          <stop offset="0.55" stopColor="#8e2416" />
          <stop offset="1" stopColor="#4e0f08" />
        </radialGradient>
        <linearGradient id="wof-buighout" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a2210" />
          <stop offset="0.4" stopColor="#8a5a33" />
          <stop offset="0.6" stopColor="#b88050" />
          <stop offset="1" stopColor="#3a2210" />
        </linearGradient>
        <linearGradient id="wof-ijzer" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0e0c0b" />
          <stop offset="0.35" stopColor="#4a443e" />
          <stop offset="0.5" stopColor="#1c1916" />
          <stop offset="1" stopColor="#0b0908" />
        </linearGradient>
        <radialGradient id="wof-marmer-g" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fbf8f1" />
          <stop offset="0.7" stopColor="#e4ded2" />
          <stop offset="1" stopColor="#c9c1b2" />
        </radialGradient>
        <filter id="wof-marmer" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="4" seed="21" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.38  -7 0 0 0 3.7" result="ader" />
          <feComposite in="ader" in2="SourceGraphic" operator="in" />
        </filter>
        <linearGradient id="wof-bier" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a8661a" />
          <stop offset="0.4" stopColor="#e2a53a" />
          <stop offset="1" stopColor="#8d5212" />
        </linearGradient>
        <filter id="wof-zacht">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
    </svg>
  );
}

/** Een houten lijst: vier verstekdelen met nerf, profiel en licht van linksboven. Maten in de eenheid van de muur. */
function WoodFrame({ w, h, t, finish }: { w: number; h: number; t: number; finish: Finish }) {
  const sides: Record<Side, string> = {
    top: `0,0 ${w},0 ${w - t},${t} ${t},${t}`,
    bottom: `0,${h} ${w},${h} ${w - t},${h - t} ${t},${h - t}`,
    left: `0,0 ${t},${t} ${t},${h - t} 0,${h}`,
    right: `${w},0 ${w - t},${t} ${w - t},${h - t} ${w},${h}`
  };
  return (
    <svg className="wof-wood" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {(Object.keys(sides) as Side[]).map((s) => (
        <g key={s}>
          <polygon points={sides[s]} fill={FINISH[finish]} />
          <polygon points={sides[s]} fill={`url(#wof-nerf-${s === "top" || s === "bottom" ? "h" : "v"})`} />
          <polygon points={sides[s]} fill={`url(#wof-prof-${s})`} />
          <polygon points={sides[s]} fill={SIDE_LIGHT[s][0]} opacity={SIDE_LIGHT[s][1]} />
        </g>
      ))}
      <path d={`M0 0L${t} ${t}M${w} 0L${w - t} ${t}M0 ${h}L${t} ${h - t}M${w} ${h}L${w - t} ${h - t}`} stroke="#0d0703" strokeOpacity="0.45" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Het naambordje: de naam uitgeschreven in crème op een krent bordje met een gouwe bies. Vult de lijst van
 * iedereen zonder (goed) logo. `tall` voor de staande lijst van Goud.
 */
export function NameSign({ name, tall = false }: { name: string; tall?: boolean }) {
  // Zelfde verhouding als de binnenkant van de lijst (Zilver liggend, Goud staand), zodat het bordje hem vult.
  const [w, h] = tall ? [150, 201] : [200, 157];
  const lines = signLines(name, tall ? 6 : 4, tall ? 10 : 14);
  const longest = Math.max(...lines.map((l) => l.length));
  // Vollkorn vet is gemiddeld ruim een halve letterhoogte breed; 0.56 houdt ook brede namen binnen de bies.
  const size = Math.min(tall ? 27 : 30, (w - 30) / (longest * 0.56), (h - 52) / (lines.length * 1.16));
  const step = size * 1.16;
  const top = h / 2 - 3 - ((lines.length - 1) * step) / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden="true">
      <rect width={w} height={h} rx="3" fill="#261f1f" />
      <rect x="7" y="7" width={w - 14} height={h - 14} rx="3" fill="none" stroke="#dcc05d" strokeWidth="1.3" />
      <text textAnchor="middle" dominantBaseline="central" fontFamily="Vollkorn, Georgia, serif" fontWeight="700" fontSize={size} fill="#f9f3d9">
        {lines.map((line, i) => (
          <tspan key={i} x={w / 2} y={top + i * step}>
            {line}
          </tspan>
        ))}
      </text>
      <path d={`M${w / 2 - 15} ${h - 22}h30`} stroke="#d05438" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** laden = nog niet binnen; goed = het logo hangt; bordje = geen (goed) logo, het naambordje hangt. */
type LogoState = "laden" | "goed" | "bordje";

/**
 * Hoeveel van het plaatje inkt wordt met dit filter (0 tot 1), of null als de browser de pixels niet mag lezen
 * (een site zonder CORS). Zelfde rekensom als de filters in InkFilters.
 */
function inkCoverage(img: HTMLImageElement, ink: WallInk): number | null {
  try {
    const w0 = img.naturalWidth || 240;
    const h0 = img.naturalHeight || 120;
    const k = 96 / Math.max(w0, h0);
    const w = Math.max(1, Math.round(w0 * k));
    const h = Math.max(1, Math.round(h0 * k));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) {
      const [r, g, b, a] = [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255, px[i + 3] / 255];
      const v = ink === "donker" ? 1.75 - 0.37 * r - 1.25 * g - 0.13 * b : ink === "licht" ? 0.37 * r + 1.25 * g + 0.13 * b - 0.1 : (1 - Math.min(r, g, b)) * 4;
      sum += Math.min(1, Math.max(0, v)) * a;
    }
    return sum / (w * h);
  } catch {
    return null;
  }
}

/**
 * Geen leeg vlak in een lijst. Het logo hangt pas als het geladen is en er echt iets op staat:
 * - geen link, een kapotte link of na 5 seconden nog niets: het naambordje;
 * - een plaatje van een paar pixels: het naambordje;
 * - waar de browser het mag nakijken (CORS): bijna geen inkt (wit op wit, doorzichtig) of één dicht vlak
 *   (een logo op een gekleurde achtergrond dat als inkt een blok wordt): het naambordje.
 */
export function useLogoCheck(logoUrl: string, ink: WallInk): LogoState {
  const [state, setState] = useState<LogoState>(logoUrl ? "laden" : "bordje");
  useEffect(() => {
    if (!logoUrl) {
      setState("bordje");
      return;
    }
    let live = true;
    setState("laden");
    const slow = window.setTimeout(() => live && setState((s) => (s === "laden" ? "bordje" : s)), 5000);
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.onerror = () => live && setState("bordje");
    img.onload = () => {
      if (!live) return;
      const tiny = img.naturalWidth > 0 && img.naturalHeight > 0 && (img.naturalWidth < 16 || img.naturalHeight < 8);
      setState(tiny ? "bordje" : "goed");
      if (tiny) return;
      // A second copy the browser may read, when the site allows it. No answer or no permission: the logo stays.
      const probe = new Image();
      probe.crossOrigin = "anonymous";
      probe.referrerPolicy = "no-referrer";
      probe.onload = () => {
        const covered = inkCoverage(probe, ink);
        if (live && covered !== null && (covered < 0.006 || (ink !== "kleur" && covered > 0.97))) setState("bordje");
      };
      probe.src = logoUrl;
    };
    img.src = logoUrl;
    return () => {
      live = false;
      window.clearTimeout(slow);
    };
  }, [logoUrl, ink]);
  return state;
}

/** Het logo in de huisstijl (inkt of eigen kleur), of het naambordje. */
function LogoOrSign({ state, name, logoUrl, ink, tall = false }: { state: LogoState; name: string; logoUrl: string; ink: WallInk; tall?: boolean }) {
  if (state === "bordje") return <NameSign name={name} tall={tall} />;
  return <img src={logoUrl} alt={`Logo van ${name}`} referrerPolicy="no-referrer" className={`h-full w-full object-contain oc-inkt-${ink} ${state === "laden" ? "opacity-0" : ""}`} />;
}

/** Voor beheer: het logo zoals het op de muur hangt, of het naambordje als het er niet (goed) is. */
export function WallLogo({ name, logoUrl, ink, tall = false }: { name: string; logoUrl: string; ink: WallInk; tall?: boolean }) {
  const state = useLogoCheck(logoUrl, ink);
  return <LogoOrSign state={state} name={name} logoUrl={logoUrl} ink={ink} tall={tall} />;
}

/** Rozet voor wie vóór 1 december bestelde: vroeg erbij, bovenaan. Op de hoek van de lijst gespeld. */
function Rosette() {
  return (
    <span className="wof-rozet" title="Vroeg erbij: besteld vóór 1 december">
      <svg viewBox="0 0 36 44" className="h-full w-full" aria-hidden="true">
        <path d="M11 22 L6 43 L12 39 L16 44 L18 24z M25 22 L30 43 L24 39 L20 44 L18 24z" fill="#9a3219" />
        <g fill="#b8432a">
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={18 + Math.cos((i / 14) * Math.PI * 2) * 12} cy={16 + Math.sin((i / 14) * Math.PI * 2) * 12} r="4.2" />
          ))}
        </g>
        <circle cx="18" cy="16" r="10" fill="#f1e3bd" stroke="#7d4a22" strokeWidth="0.8" />
        <path d="M18 9.5l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#5b480b" />
      </svg>
    </span>
  );
}

/** Messing plaatje onder op de lijst: naam en een regel eronder. Hangt het naambordje in de lijst, dan alleen de regel. */
function Plate({ name, line }: { name?: string; line?: string }) {
  return (
    <span className="wof-plaatje">
      {name ? <b>{name}</b> : null}
      {line ? <span>{line}</span> : null}
    </span>
  );
}

const ouderenText = (n: number) => `${formatNumber(n)} ${n === 1 ? "oudere" : "ouderen"}`;
const entryLabel = (e: PublicWallEntry) => `${e.name}, ${ouderenText(e.ouderen)}${e.early ? ", vroeg erbij" : ""}`;

interface FrameProps {
  w: number;
  h: number;
  t: number;
  finish: Finish;
  /** Uitsnede in het passe-partout (CSS inset); zonder: de inhoud vult de lijst, zoals bij een affiche of het naambordje. */
  opening?: string;
  oval?: boolean;
  gold?: boolean;
  lamp?: boolean;
  early?: boolean;
  tilt?: number;
  plate?: ReactNode;
  children: ReactNode;
}

function Frame({ w, h, t, finish, opening, oval = false, gold = false, lamp = false, early = false, tilt = 0, plate, children }: FrameProps) {
  const inset = `calc(${t} * var(--u))`;
  return (
    <div className="wof-frame" style={{ "--w": w, "--h": h, "--tilt": `${tilt}deg` } as CSSProperties}>
      {lamp ? (
        <span className="wof-lampje" aria-hidden="true">
          <i />
          <i />
          <b />
        </span>
      ) : null}
      <WoodFrame w={w} h={h} t={t} finish={finish} />
      {opening ? (
        <span className="wof-mat" style={{ inset }}>
          <span className={`wof-opening ${gold ? "wof-opening-goud" : ""} ${oval ? "rounded-[50%]" : ""}`} style={{ inset: opening }}>
            {children}
          </span>
        </span>
      ) : (
        <span className="wof-binnen" style={{ inset }}>
          {children}
        </span>
      )}
      <span className="wof-glas" style={{ inset }} aria-hidden="true" />
      {early ? <Rosette /> : null}
      {plate}
    </div>
  );
}

/** Kleine verschillen per plek, vast per volgorde: een café-muur hangt nooit kaarsrecht. */
const tiltOf = (i: number) => (((i * 53) % 7) - 3) * 0.32;
const dropOf = (i: number) => `calc(${(((i * 37) % 5) - 2) * 7} * var(--u))`;
const ZILVER_HOUT: Finish[] = ["donker", "walnoot", "ebben", "eiken", "walnoot", "donker"];

function GoldFrame({ entry, i }: { entry: PublicWallEntry; i: number }) {
  const state = useLogoCheck(entry.logoUrl, entry.ink);
  const sign = state === "bordje";
  return (
    <li className="wof-hang wof-met-plaatje" style={{ marginTop: dropOf(i) }} aria-label={entryLabel(entry)}>
      <Frame
        w={236}
        h={296}
        t={30}
        finish="walnoot"
        opening={sign ? undefined : "12% 11% 14%"}
        gold
        lamp
        early={entry.early}
        tilt={tiltOf(i) / 2}
        plate={<Plate name={sign ? undefined : entry.name} line={`Goud · ${ouderenText(entry.ouderen)}`} />}
      >
        {sign ? (
          <NameSign name={entry.name} tall />
        ) : (
          <span className="wof-logo">
            <LogoOrSign state={state} name={entry.name} logoUrl={entry.logoUrl} ink={entry.ink} tall />
          </span>
        )}
      </Frame>
      <span className="wof-lamplicht" aria-hidden="true" />
    </li>
  );
}

function SilverFrame({ entry, i, children, href, target }: { entry?: PublicWallEntry; i: number; children?: ReactNode; href?: string; target?: string }) {
  const state = useLogoCheck(entry?.logoUrl ?? "", entry?.ink ?? "donker");
  const sign = state === "bordje";
  const frame = (
    <Frame
      w={204}
      h={168}
      t={19}
      finish={href ? "ebben" : ZILVER_HOUT[i % ZILVER_HOUT.length]}
      opening={entry && sign ? undefined : "13% 11% 15%"}
      early={entry?.early}
      tilt={tiltOf(i)}
      plate={entry ? <Plate name={sign ? undefined : entry.name} line={`Zilver · ${ouderenText(entry.ouderen)}`} /> : href ? <Plate name="Bestel voor je team" /> : undefined}
    >
      {entry && sign ? (
        <NameSign name={entry.name} />
      ) : (
        <span className="wof-logo">{entry ? <LogoOrSign state={state} name={entry.name} logoUrl={entry.logoUrl} ink={entry.ink} /> : children}</span>
      )}
    </Frame>
  );
  return (
    <li className={`wof-hang ${entry || href ? "wof-met-plaatje" : ""}`} style={{ marginTop: dropOf(i) }} aria-label={entry ? entryLabel(entry) : undefined}>
      {href ? (
        <a href={href} target={target} className="wof-link" aria-label="Zet jullie bedrijf ook op de wall of fame: bestel voor je team">
          {frame}
        </a>
      ) : (
        frame
      )}
    </li>
  );
}

const OLIEBOL_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(OLIEBOL_SVG.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '))}`;

type FillerKind = "oma" | "affiche" | "prent" | "dans" | "foto";

/** Wat er verder in een bruin café aan de muur hangt. Alleen sfeer: voor schermlezers verborgen. */
function Filler({ kind, i }: { kind: FillerKind; i: number }) {
  const tilt = tiltOf(i + 3);
  switch (kind) {
    case "oma":
      return (
        <Frame w={152} h={194} t={17} finish="ebben" opening="11% 13% 13%" oval tilt={tilt} plate={<Plate name="Oma Coby" />}>
          <img src={omaUrl} alt="" className="wof-sepia h-full w-full object-cover" />
        </Frame>
      );
    case "affiche":
      return (
        <Frame w={142} h={204} t={9} finish="ebben" tilt={tilt}>
          <span className="wof-affiche">
            <span className="wof-affiche-kop">Oma Coby's</span>
            <img src={OLIEBOL_IMG} alt="" className="wof-affiche-bol" />
            <span className="wof-affiche-groot">Oliebollen</span>
            <span className="wof-affiche-klein">vers uit de pan</span>
          </span>
        </Frame>
      );
    case "dans":
      return (
        <Frame w={176} h={128} t={11} finish="donker" tilt={tilt}>
          <span className="wof-affiche wof-affiche-dans">
            <span className="grid gap-[calc(3*var(--u))]">
              <span className="wof-affiche-groot">Dans&shy;middag</span>
              <span className="wof-affiche-klein">voor ouderen, met jullie oliebollen</span>
            </span>
            <DiscoOudje cast={2} className="h-[calc(70*var(--u))]" />
          </span>
        </Frame>
      );
    case "prent":
      return (
        <Frame w={108} h={124} t={11} finish="eiken" opening="14% 15%" tilt={tilt}>
          <img src={OLIEBOL_IMG} alt="" className="wof-sepia h-[78%] w-[78%] object-contain" />
        </Frame>
      );
    case "foto":
      return (
        <Frame w={150} h={118} t={12} finish="ebben" opening="12% 11%" tilt={tilt}>
          <span className="wof-foto">
            {[4, 7, 1].map((c) => (
              <DiscoOudje key={c} cast={c} className="h-[calc(54*var(--u))]" />
            ))}
          </span>
        </Frame>
      );
  }
}

function FillerItem({ kinds, i, wide = false }: { kinds: FillerKind[]; i: number; wide?: boolean }) {
  return (
    <li className={`wof-hang ${kinds.length > 1 ? "wof-stapel" : ""} ${wide ? "" : "wof-extra"} ${kinds.includes("oma") ? "wof-met-plaatje" : ""}`} style={{ marginTop: dropOf(i + 2) }} aria-hidden="true">
      {kinds.map((k, j) => (
        <Filler key={k} kind={k} i={i + j} />
      ))}
    </li>
  );
}

/** Tussen de Zilver-lijsten, om de beurt. Geen spiegel of lege lijst: die leest als een bedrijf zonder logo. */
const BETWEEN: FillerKind[][] = [["dans"], ["foto"], ["prent", "foto"], ["affiche"], ["foto"], ["prent"]];

/** Het krijtbord: het totaal, en Brons met naam en ouderen. */
function Chalkboard({ brons, ouderen, count, empty }: { brons: PublicWallEntry[]; ouderen: number; count: number; empty: boolean }) {
  const anyEarly = brons.some((e) => e.early);
  return (
    <div className="wof-bord">
      <div className="wof-lei">
        <p className="wof-krijt wof-krijt-kop">{empty ? "Dit jaar erbij?" : `Samen ${formatNumber(ouderen)} ouderen aan de dans`}</p>
        <p className="wof-krijt wof-krijt-tekst">
          {empty
            ? "Vorig jaar lieten ruim honderd bedrijven ouderen dansen. Bestel voor je team, dan staat jullie naam hier."
            : `${count} ${count === 1 ? "bedrijf liet" : "bedrijven lieten"} dit jaar ouderen een middag dansen. Dit jaar erbij? Dan staat jullie naam hier.`}
        </p>
        {brons.length ? (
          <>
            <p className="wof-krijt wof-krijt-kop wof-krijt-tussen">Brons · op het bord</p>
            <ul className="wof-krijt-lijst">
              {brons.map((e) => (
                <li key={e.key} className="wof-krijt" aria-label={entryLabel(e)}>
                  {e.name} <span>· {ouderenText(e.ouderen)}</span>
                  {e.early ? <span aria-hidden="true"> ★</span> : null}
                </li>
              ))}
            </ul>
            {anyEarly ? <p className="wof-krijt wof-krijt-voet">★ vroeg erbij: besteld vóór 1 december</p> : null}
          </>
        ) : (
          <p className="wof-krijt wof-krijt-voet">Vanaf 50 oliebollen schrijven we jullie naam hier op het bord.</p>
        )}
        <img src={OLIEBOL_IMG} alt="" className="wof-krijt-bol" aria-hidden="true" />
      </div>
    </div>
  );
}

function Stool({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 110 196" aria-hidden="true">
      <ellipse cx="55" cy="188" rx="48" ry="6" fill="#120a04" opacity="0.4" filter="url(#wof-zacht)" />
      <path d="M40 46 C38 100 36 150 34 182 M70 46 C72 100 74 150 76 182" stroke="#5a3519" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="55" cy="132" rx="38" ry="8" fill="none" stroke="#6b4426" strokeWidth="4" />
      <path d="M22 44 C18 100 13 150 9 186 M88 44 C92 100 97 150 101 186" stroke="url(#wof-buighout)" strokeWidth="6.5" fill="none" strokeLinecap="round" />
      <path d="M7 32 v10 a48 13 0 0 0 96 0 v-10" fill="#3a2414" />
      <path d="M7 36 a48 13 0 0 0 96 0" fill="none" stroke="#8a5a33" strokeWidth="1.2" opacity="0.6" />
      <ellipse cx="55" cy="32" rx="48" ry="13" fill="url(#wof-leer)" />
      <ellipse cx="42" cy="27" rx="20" ry="4" fill="#fff" opacity="0.16" />
      {[30, 55, 80, 42, 68].map((x, j) => (
        <circle key={j} cx={x} cy={j < 3 ? 32 : 26 + (j - 3) * 12} r="1.3" fill="#3a0b05" />
      ))}
    </svg>
  );
}

function Table({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 220 230" aria-hidden="true">
      <ellipse cx="110" cy="222" rx="80" ry="7" fill="#120a04" opacity="0.4" filter="url(#wof-zacht)" />
      <path d="M110 196 C90 204 60 210 38 220 M110 196 C130 204 160 210 182 220 M110 196 L110 222" stroke="#151210" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="104" y="74" width="12" height="126" fill="url(#wof-ijzer)" />
      <ellipse cx="110" cy="140" rx="11" ry="5" fill="#26211c" />
      <ellipse cx="110" cy="84" rx="16" ry="5" fill="#1c1916" />
      <path d="M10 60 v8 a100 22 0 0 0 200 0 v-8" fill="#9d968a" />
      <ellipse cx="110" cy="60" rx="100" ry="22" fill="url(#wof-marmer-g)" />
      <ellipse cx="110" cy="60" rx="100" ry="22" fill="#fff" filter="url(#wof-marmer)" />
      {/* Een bord oliebollen met poedersuiker en een biertje: het café van Oma. */}
      <ellipse cx="82" cy="60" rx="38" ry="10" fill="#120a04" opacity="0.18" filter="url(#wof-zacht)" />
      <ellipse cx="80" cy="56" rx="36" ry="10" fill="#f7f3ea" stroke="#d6cfc2" strokeWidth="1" />
      <ellipse cx="80" cy="55" rx="26" ry="6.5" fill="none" stroke="#e7e1d5" strokeWidth="1" />
      <image href={OLIEBOL_IMG} x="52" y="28" width="28" height="28" />
      <image href={OLIEBOL_IMG} x="80" y="30" width="26" height="26" />
      <image href={OLIEBOL_IMG} x="64" y="16" width="27" height="27" />
      <path d="M144 20 L162 20 L159 62 L147 62 Z" fill="url(#wof-bier)" opacity="0.92" />
      <ellipse cx="153" cy="20" rx="9.5" ry="3.2" fill="#fbf6e8" />
      <path d="M147 16 q6-5 12 0" fill="#fbf6e8" />
      <path d="M147 26 L149 58" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.4" />
      <ellipse cx="153" cy="62" rx="6" ry="1.6" fill="#120a04" opacity="0.25" />
    </svg>
  );
}

/** Het raam links (buiten beeld) laat zijn ruitjes als zacht licht op de muur vallen. */
function WindowLight() {
  return (
    <svg className="wof-raamlicht" viewBox="0 0 400 420" preserveAspectRatio="none" aria-hidden="true">
      {[0, 1].map((col) =>
        [0, 1, 2].map((row) => <rect key={`${col}${row}`} x={40 + col * 150} y={30 + row * 128} width="136" height="112" rx="4" fill="#fff4d8" />)
      )}
    </svg>
  );
}

/**
 * De muur. `embed`: in een iframe op de website, dan openen links in het hele venster.
 * `today`: om te weten of "bestel vóór 1 december" nog geldt.
 */
export function WallOfFame({ wall, embed = false, today }: { wall: PublicWall; embed?: boolean; today: string }) {
  const target = embed ? "_top" : "_self";
  const goud = wall.entries.filter((e) => e.tier === "goud");
  const zilver = wall.entries.filter((e) => e.tier === "zilver");
  const brons = wall.entries.filter((e) => e.tier === "brons");
  const ouderen = wall.entries.reduce((s, e) => s + e.ouderen, 0);
  const empty = wall.entries.length === 0;
  const earlyOpen = today < earlyCutoff(wall.season);

  const plus = (i: number) => (
    <SilverFrame key="plus" i={i} href="#/bestellen" target={target}>
      <span className="wof-plus">+ jullie?</span>
    </SilverFrame>
  );

  // Goud in het midden van de bovenste rij, met Oma's portret en een affiche ernaast; daarna Zilver met af en toe wat café ertussen.
  const items: ReactNode[] = [<FillerItem key="links" kinds={["prent", "foto"]} i={0} />, <FillerItem key="oma" kinds={["oma"]} i={1} wide />];
  if (empty) {
    // Nog niemand: alleen wat er in het café hangt en de uitnodiging. Geen lege lijsten met een tekstje erin.
    items.push(<FillerItem key="affiche" kinds={["affiche"]} i={2} wide />);
    items.push(<FillerItem key="dans" kinds={["dans"]} i={3} />);
    items.push(plus(4));
  } else {
    goud.forEach((e, k) => items.push(<GoldFrame key={e.key} entry={e} i={k + 2} />));
    items.push(<FillerItem key="affiche" kinds={["affiche"]} i={goud.length + 2} wide />);
    zilver.forEach((e, k) => {
      items.push(<SilverFrame key={e.key} entry={e} i={k + 4} />);
      if (k % 2 === 1 && k < zilver.length - 1) items.push(<FillerItem key={`tussen-${k}`} kinds={BETWEEN[Math.floor(k / 2) % BETWEEN.length]} i={k + 5} />);
    });
    items.push(plus(zilver.length + 4));
  }

  return (
    <section className="wof-scene" aria-labelledby="wof-titel">
      <InkFilters />
      <SceneDefs />
      <div className="wof-set">
        <div className="wof-muur" aria-hidden="true" />
        <WindowLight />
        <div className="wof-plafond" aria-hidden="true" />

        <header className="wof-kop">
          <p className="wof-verf wof-verf-klein">Oma Coby's · seizoen {wall.season}</p>
          <h2 id="wof-titel" className="wof-verf wof-verf-titel">
            Wall of fame
          </h2>
          <p className="wof-verf wof-verf-sub">{empty ? "Wie laat dit jaar ouderen dansen?" : "Zij lieten dit jaar ouderen dansen"}</p>
          {earlyOpen ? <p className="wof-briefje">Bestel vóór 1 december: dan hangen jullie bovenaan en kies je als eerste je bezorgdag.</p> : null}
        </header>

        <ul className="wof-galerij">{items}</ul>

        <Chalkboard brons={brons} ouderen={ouderen} count={wall.entries.length} empty={empty} />

        <div className="wof-onder" aria-hidden="true">
          <div className="wof-lambris">
            <div className="wof-panelen">
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          </div>
          <div className="wof-vloer">
            <i />
          </div>
          <Stool className="wof-kruk wof-kruk-1" />
          <Table className="wof-tafel" />
          <Stool className="wof-kruk wof-kruk-2" />
        </div>
      </div>

      {/* Voorgrond en lens: gietijzeren zuil links, stenen pilaar rechts, vignet en korrel. */}
      <div className="wof-zuil" aria-hidden="true" />
      <div className="wof-pilaar" aria-hidden="true" />
      <div className="wof-vignet" aria-hidden="true" />
      <div className="wof-korrel" aria-hidden="true" />
    </section>
  );
}
