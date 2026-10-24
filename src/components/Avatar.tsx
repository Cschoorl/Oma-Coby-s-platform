import { useMemo } from "react";

/*
 * Every person gets a small drawn bust in their own outfit, so you see at a glance who is who
 * (and that it is you) instead of "Jij". The look follows from the name, so it is the same on
 * every screen and every device. Outfit plus colour is unique within the roster (see setAvatarRoster).
 */

const K = "#261f1f";
const WIT = "#fffdf6";

/** Outfit colours: the brand colours plus the blue and pink of the discozaal. */
const COLOURS = ["#d05438", "#69873c", "#dcc05d", "#5c4238", "#4f7a9a", "#c46b8c"];
const BACKGROUNDS = ["#f4e5a6", "#e7efd8", "#fbe5dd", "#f1e7df", "#dde7ee", "#f5e1ea"];
const SKINS = ["#f1d3b3", "#e7bf98", "#f3dcc4", "#c98e62", "#9c6644", "#6e4630"];
const HAIR_COLOURS = ["#ece8df", "#bfb9ae", "#6b4d3a", "#2f2622", "#d9a441", "#a8502c"];

export const OUTFITS = ["schort", "kersttrui", "streep", "stippen", "tuinbroek", "colbert", "ruit", "hoodie", "koksbuis", "sjaal"] as const;
export type Outfit = (typeof OUTFITS)[number];

export const outfitLabel: Record<Outfit, string> = {
  schort: "schort",
  kersttrui: "kersttrui",
  streep: "streepjestrui",
  stippen: "stippenjurk",
  tuinbroek: "tuinbroek",
  colbert: "colbert met strik",
  ruit: "ruitjeshemd",
  hoodie: "hoodie",
  koksbuis: "koksbuis",
  sjaal: "jas met sjaal"
};

type Hair = "kort" | "knot" | "krul" | "kaal" | "lang";
const HAIRS: Hair[] = ["kort", "knot", "krul", "kaal", "lang"];

export interface AvatarLook {
  outfit: Outfit;
  colour: string;
  background: string;
  skin: string;
  hair: Hair;
  hairColour: string;
  glasses: boolean;
}

/** Same name, same look: lowercase, single spaces. */
function normalise(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** FNV-1a: a small stable hash, the same in every browser. */
function hash(text: string, seed = 2166136261): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

const SLOTS = OUTFITS.length * COLOURS.length;

/** Outfit-and-colour slot per known name; filled by setAvatarRoster. */
let roster = new Map<string, number>();

/**
 * Gives everyone in the roster their own outfit-and-colour combination (up to 60 people).
 * Names are placed in hash order, not signup order, so adding someone rarely changes anyone else's look.
 */
export function setAvatarRoster(names: string[]): void {
  const unique = Array.from(new Set(names.map(normalise).filter(Boolean)));
  unique.sort((a, b) => hash(a) - hash(b) || a.localeCompare(b));
  // Outfits are handed out evenly: the first ten people all wear something different, then a
  // second round in other colours. Within that, each name keeps its own preferred outfit and colour.
  const used: number[][] = OUTFITS.map(() => []);
  const next = new Map<string, number>();
  for (const name of unique) {
    const h = hash(name);
    const fewest = Math.min(...used.map((u) => u.length));
    let outfit = h % OUTFITS.length;
    while (used[outfit].length > fewest) outfit = (outfit + 1) % OUTFITS.length;
    let colour = Math.floor(h / OUTFITS.length) % COLOURS.length;
    for (let tries = 0; used[outfit].includes(colour) && tries < COLOURS.length; tries++) colour = (colour + 1) % COLOURS.length;
    used[outfit].push(colour);
    next.set(name, colour * OUTFITS.length + outfit);
  }
  roster = next;
}

export function avatarLook(name: string): AvatarLook {
  const key = normalise(name);
  const slot = roster.get(key) ?? hash(key) % SLOTS;
  const extra = hash(key, 0x9e3779b9);
  return {
    outfit: OUTFITS[slot % OUTFITS.length],
    colour: COLOURS[Math.floor(slot / OUTFITS.length)],
    background: BACKGROUNDS[(extra >>> 3) % BACKGROUNDS.length],
    skin: SKINS[(extra >>> 7) % SKINS.length],
    hair: HAIRS[(extra >>> 11) % HAIRS.length],
    hairColour: HAIR_COLOURS[(extra >>> 15) % HAIR_COLOURS.length],
    glasses: (extra >>> 19) % 3 === 0
  };
}

const SHOULDERS = "M3 40C3 31 10 27.5 20 27.5S37 31 37 40Z";

function outfitSvg(look: AvatarLook, id: string): string {
  const c = look.colour;
  const body = (fill: string) => `<path d="${SHOULDERS}" fill="${fill}"/>`;
  const clip = (inner: string) => `<g clip-path="url(#${id}b)">${inner}</g>`;
  switch (look.outfit) {
    case "schort":
      return `${body(c)}<path d="M13 30h14v10H13z" fill="${WIT}"/><path d="M13 30l4.5-2.6M27 30l-4.5-2.6" stroke="${WIT}" stroke-width="1.3"/><path d="M16 35h8" stroke="${c}" stroke-width="1"/>`;
    case "kersttrui":
      return `${body(c)}${clip(`<path d="M0 33l2.5 2.5L5 33l2.5 2.5L10 33l2.5 2.5L15 33l2.5 2.5L20 33l2.5 2.5L25 33l2.5 2.5L30 33l2.5 2.5L35 33l2.5 2.5L40 33" stroke="${WIT}" stroke-width="1.4" fill="none"/><circle cx="12" cy="38.5" r="1" fill="${WIT}"/><circle cx="20" cy="38.5" r="1" fill="${WIT}"/><circle cx="28" cy="38.5" r="1" fill="${WIT}"/>`)}`;
    case "streep":
      return `${body(WIT)}${clip(`<path d="M0 30.5h40M0 34h40M0 37.5h40" stroke="${c}" stroke-width="1.8"/>`)}`;
    case "stippen":
      return `${body(c)}${clip(`<g fill="${WIT}"><circle cx="9" cy="33" r="1.3"/><circle cx="15" cy="30.5" r="1.3"/><circle cx="25" cy="30.5" r="1.3"/><circle cx="31" cy="33" r="1.3"/><circle cx="12" cy="37.5" r="1.3"/><circle cx="20" cy="35" r="1.3"/><circle cx="28" cy="37.5" r="1.3"/></g>`)}<path d="M16 28l4 3 4-3" fill="none" stroke="${WIT}" stroke-width="1.2"/>`;
    case "tuinbroek":
      return `${body(WIT)}<path d="M13.5 32h13v8h-13z" fill="${c}"/><path d="M14.5 32l-1.5-4.4M25.5 32l1.5-4.4" stroke="${c}" stroke-width="2"/><circle cx="15.5" cy="33.6" r=".9" fill="${K}"/><circle cx="24.5" cy="33.6" r=".9" fill="${K}"/>`;
    case "colbert":
      return `${body(c)}<path d="M16.5 27.8L20 36l3.5-8.2z" fill="${WIT}"/><path d="M17.4 29.3l2.6 1.2-2.6 1.2zM22.6 29.3L20 30.5l2.6 1.2z" fill="${K}"/><circle cx="20" cy="30.5" r=".8" fill="${K}"/><path d="M16.5 27.8L20 36M23.5 27.8L20 36" stroke="${K}" stroke-width=".6" opacity=".5"/>`;
    case "ruit":
      return `${body(c)}${clip(`<g stroke="${WIT}" opacity=".55"><path d="M6 26v14M12 26v14M18 26v14M24 26v14M30 26v14M36 26v14" stroke-width="1.2"/><path d="M0 31h40M0 36h40" stroke-width="1.2"/></g>`)}<path d="M16.5 28l3.5 2.5 3.5-2.5" fill="none" stroke="${WIT}" stroke-width="1.2"/>`;
    case "hoodie":
      return `<path d="M11 31c0-6 18-6 18 0" fill="${c}"/>${body(c)}<path d="M14 29.5c2 2.5 10 2.5 12 0" fill="none" stroke="${K}" stroke-width=".7" opacity=".45"/><path d="M18 31v4.5M22 31v4.5" stroke="${WIT}" stroke-width="1"/><path d="M14 37h12" stroke="${K}" stroke-width=".7" opacity=".35"/>`;
    case "koksbuis":
      return `${body(WIT)}<path d="M17 27.8l3 2.4 3-2.4-1 3h-4z" fill="${c}"/><g fill="${c}"><circle cx="17" cy="33" r=".9"/><circle cx="17" cy="36.5" r=".9"/><circle cx="23" cy="33" r=".9"/><circle cx="23" cy="36.5" r=".9"/></g><path d="M3 40C3 31 10 27.5 20 27.5S37 31 37 40" fill="none" stroke="${K}" stroke-width=".6" opacity=".35"/>`;
    case "sjaal":
      return `${body(look.colour === "#5c4238" ? "#69873c" : "#5c4238")}<path d="M13 27.5c3 2.6 11 2.6 14 0l.6 2.6c-3.6 2.4-11.6 2.4-15.2 0z" fill="${c}"/><path d="M23 30.5l1.4 7.5h-3.4l-.6-6.8z" fill="${c}"/><path d="M21 38h3.4" stroke="${WIT}" stroke-width=".8"/>`;
  }
}

function hairBack(look: AvatarLook): string {
  return look.hair === "lang" ? `<path d="M10.5 16c0-8 19-8 19 0v12h-19z" fill="${look.hairColour}"/>` : "";
}

function hairFront(look: AvatarLook): string {
  const h = look.hairColour;
  switch (look.hair) {
    case "kort":
    case "lang":
      return `<path d="M11.8 15.5C11.4 8 28.6 8 28.2 15.5 26 11.6 14 11.6 11.8 15.5z" fill="${h}"/>`;
    case "knot":
      return `<circle cx="20" cy="6.4" r="3.3" fill="${h}"/><path d="M11.8 15.5C11.4 8 28.6 8 28.2 15.5 26 11.6 14 11.6 11.8 15.5z" fill="${h}"/>`;
    case "krul":
      return `<g fill="${h}"><circle cx="13" cy="12.5" r="3"/><circle cx="17" cy="9.4" r="3.2"/><circle cx="23" cy="9.4" r="3.2"/><circle cx="27" cy="12.5" r="3"/><circle cx="20" cy="8.6" r="3"/></g>`;
    case "kaal":
      return `<path d="M11.9 17.5c-.6-2.6.2-4.2 1.6-5M28.1 17.5c.6-2.6-.2-4.2-1.6-5" stroke="${h}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
}

function hatSvg(look: AvatarLook): string {
  if (look.outfit === "koksbuis") return `<path d="M13 11.5h14v-2.5c2.6-.4 3.4-4.4.4-5.4-1-2.6-4.6-3-6.4-1.2-1.8-1.8-5.4-1.4-6.4 1.2-3 1-2.2 5 .4 5.4z" fill="${WIT}" stroke="${K}" stroke-width=".6"/>`;
  if (look.outfit === "kersttrui" && look.hair !== "lang") return `<path d="M11.6 13.5C11.6 5 28.4 5 28.4 13.5z" fill="${look.colour}"/><path d="M11.4 13.5h17.2" stroke="${WIT}" stroke-width="2"/><circle cx="20" cy="4.6" r="2" fill="${WIT}"/>`;
  return "";
}

export function avatarSvg(look: AvatarLook, id: string): string {
  const face = `<path d="M17.4 22h5.2v6.5h-5.2z" fill="${look.skin}"/><circle cx="20" cy="16.5" r="8" fill="${look.skin}"/>`;
  const eyes = `<circle cx="17.2" cy="17" r="1" fill="${K}"/><circle cx="22.8" cy="17" r="1" fill="${K}"/><path d="M18 20.4q2 1.4 4 0" stroke="${K}" stroke-width=".8" fill="none" stroke-linecap="round"/>`;
  const glasses = look.glasses ? `<g fill="none" stroke="${K}" stroke-width=".7"><circle cx="17.2" cy="17" r="2.1"/><circle cx="22.8" cy="17" r="2.1"/><path d="M19.3 17h1.4"/></g>` : "";
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}c"><circle cx="20" cy="20" r="20"/></clipPath><clipPath id="${id}b"><path d="${SHOULDERS}"/></clipPath></defs><g clip-path="url(#${id}c)"><rect width="40" height="40" fill="${look.background}"/>${hairBack(look)}${face}${outfitSvg(look, id)}${hairFront(look)}${eyes}${glasses}${hatSvg(look)}</g></svg>`;
}

let counter = 0;

/** The bust on its own, as a circle. The name goes in the title; next to a written name it is hidden for screen readers. */
export function Avatar({ name, size = 24, className = "", decorative = true }: { name: string; size?: number; className?: string; decorative?: boolean }) {
  const look = avatarLook(name);
  const id = useMemo(() => `av${++counter}`, []);
  const svg = useMemo(() => avatarSvg(look, id), [look.outfit, look.colour, look.background, look.skin, look.hair, look.hairColour, look.glasses, id]);
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : name}
      title={`${name} · ${outfitLabel[look.outfit]}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** First name only, for tight spots: "Ria de Vries" → "Ria". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * Avatar plus name in a soft pill. `mine` marks the logged-in person (gouwe ouwe tint), so you
 * recognise yourself by your own name and outfit instead of "Jij".
 */
export function NameTag({ name, mine = false, short = false, suffix }: { name: string; mine?: boolean; short?: boolean; suffix?: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-bold ${
        mine ? "bg-gouwe text-krent" : "bg-vul text-krent"
      }`}
    >
      <Avatar name={name} size={22} />
      <span className="truncate">
        {short ? firstName(name) : name}
        {suffix ? <span className="font-normal"> {suffix}</span> : null}
      </span>
    </span>
  );
}
