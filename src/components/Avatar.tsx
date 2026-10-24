import { useMemo } from "react";

/*
 * Every person gets a small drawn face: a flat coloured circle with loose black lines for hair,
 * face and accessories, in the doodle style of corporate memphis. You see at a glance who is who
 * (and that it is you) instead of "Jij". The look follows from the name, so it is the same on every
 * screen and device. Hair plus colour is unique within the roster (see setAvatarRoster).
 */

const K = "#261f1f";

/** Bright, flat colours that sit well on meel; illustrations only, like the discozaal. */
const COLOURS = ["#4fa36c", "#e25a3f", "#c9c43a", "#5a6fe0", "#5fb6e6", "#ec6fae", "#9a82dc", "#f08c3a"];

export const HAIRS = ["krul", "lus", "zwiep", "lang", "pet", "baret", "hoed", "pony", "kuif", "golf", "kaal"] as const;
type Hair = (typeof HAIRS)[number];

const FACES = ["lach", "open", "neus", "knipoog", "blij", "opzij"] as const;
type Face = (typeof FACES)[number];

type Extra = "geen" | "bril" | "hoekbril" | "snor";
const EXTRAS: Extra[] = ["geen", "geen", "bril", "geen", "hoekbril", "snor"];

export interface AvatarLook {
  hair: Hair;
  colour: string;
  face: Face;
  extra: Extra;
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

const SLOTS = HAIRS.length * COLOURS.length;

/** Hair-and-colour slot per known name; filled by setAvatarRoster. */
let roster = new Map<string, number>();

/**
 * Gives everyone in the roster their own hair-and-colour combination (up to 88 people).
 * Names are placed in hash order, not signup order, so adding someone rarely changes anyone else's look.
 */
export function setAvatarRoster(names: string[]): void {
  const unique = Array.from(new Set(names.map(normalise).filter(Boolean)));
  unique.sort((a, b) => hash(a) - hash(b) || a.localeCompare(b));
  // Hair is handed out evenly: the first eleven people all have a different head, then a second
  // round in other colours. Within that, each name keeps its own preferred hair and colour.
  const used: number[][] = HAIRS.map(() => []);
  const next = new Map<string, number>();
  for (const name of unique) {
    const h = hash(name);
    const fewest = Math.min(...used.map((u) => u.length));
    let hair = h % HAIRS.length;
    while (used[hair].length > fewest) hair = (hair + 1) % HAIRS.length;
    let colour = Math.floor(h / HAIRS.length) % COLOURS.length;
    for (let tries = 0; used[hair].includes(colour) && tries < COLOURS.length; tries++) colour = (colour + 1) % COLOURS.length;
    used[hair].push(colour);
    next.set(name, colour * HAIRS.length + hair);
  }
  roster = next;
}

export function avatarLook(name: string): AvatarLook {
  const key = normalise(name);
  const slot = roster.get(key) ?? hash(key) % SLOTS;
  const extra = hash(key, 0x9e3779b9);
  const face = FACES[(extra >>> 5) % FACES.length];
  // Glasses only on faces that look straight ahead; a moustache only where the mouth sits low enough.
  let more = EXTRAS[(extra >>> 11) % EXTRAS.length];
  if ((more === "bril" || more === "hoekbril") && face === "opzij") more = "geen";
  if (more === "snor" && face !== "neus") more = "geen";
  return { hair: HAIRS[slot % HAIRS.length], colour: COLOURS[Math.floor(slot / HAIRS.length)], face, extra: more };
}

// Drawn on a 48 × 48 canvas; the face is a circle at (24, 26) with radius 16, hair may stick out.

const HAIR_PATHS: Record<Hair, string> = {
  krul: "M9.6 21.4c-3.4-4.6 2.2-9.4 5.2-4.8-.8-6.2 6.6-7.4 6.6-1.6.2-6.2 7.8-6.2 7.2-.2 1.4-5.8 8.8-4.4 6.6 1.4 3.6-3.4 8.6 1 4.6 5.6",
  lus: "M21.4 11.6C15.8 5.6 24.4-.4 28.2 3.4c3.4 3.4-2.8 8-4.6 4.4-1.4-2.8 3.6-5.6 7.8-2.4",
  zwiep: "M6.8 31C3.6 13.6 19 4.4 30.4 7c7 1.6 11.4 6.6 13.4 13",
  lang: "M10.4 41C.6 25.4 8 5.8 24 5.8S47.4 25.4 37.6 41",
  pet: "M12.4 19.2C14.6 8.8 32.4 7 37 16.2M2.4 25.4C12.6 18 25.6 13.4 40 15",
  baret: "M10.8 16.8Q24 4.6 37.2 16.8Q24 20.4 10.8 16.8ZM24 9.4l.8-3.2",
  hoed: "M4.8 16Q24 23.8 43.2 16M14.6 16.6l2.2-10 4.4 3.4 2.8-4 2.8 4 4.4-3.4 2.2 10",
  pony: "M15.4 11.8l2.8 6M20.6 9.8l1.8 6.8M26.4 9.6l.2 7M31.8 11.2l-1.6 6.4",
  kuif: "M14.4 14.6c0-5.4 4.6-5.4 4.8-.6.2-5.6 5-5.6 5.2-.2.2-5.4 5-5.4 5.2.4M12 13.2l-2.2-2.4",
  golf: "M5.8 20.2c2.6-5.6 6.2-1 8.8-4.4s6.2 1 8.8-2.8 6.2 1 8.8-2.6 6.8 1.4 9 4.4",
  kaal: ""
};

/** Eyes, nose and mouth per face; the eye centres matter for the glasses. */
const FACE_PATHS: Record<Face, { lines: string; dots: Array<[number, number]> }> = {
  lach: { lines: "M16.8 30Q24 38.4 31.2 30", dots: [[19.5, 24], [28.5, 24]] },
  open: { lines: "M16.6 29.2H31.4Q31 39.4 24 39.4T16.6 29.2Z", dots: [[19.5, 24], [28.5, 24]] },
  neus: { lines: "M19.5 22.4v2.8M28.5 22.4v2.8M24.6 24l-2 5h3M19 32.6Q24 36 29 32.6", dots: [] },
  knipoog: { lines: "M17.7 24.6q1.8-2.2 3.6 0M16.8 30Q24 37.6 31.2 30M22.2 33.6q1.8 4 3.6 0", dots: [[28.5, 24]] },
  blij: { lines: "M17.7 25q1.8-2.6 3.6 0M26.7 25q1.8-2.6 3.6 0M16.4 29.6Q24 39 31.6 29.6", dots: [] },
  opzij: { lines: "M27.4 24.6l-1.6 3.8h2.4M21 32.2Q26 35.4 30.6 31", dots: [[23, 23.6], [31, 23.2]] }
};

const EXTRA_PATHS: Record<Extra, string> = {
  geen: "",
  bril: "M23.1 24h1.8M19.5 20.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 1 0 0-7.2M28.5 20.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 1 0 0-7.2",
  hoekbril: "M15.6 21h7.4v5.8h-7.4zM25 21h7.4v5.8H25zM23 23h2",
  snor: "M20.2 30.2q1.9-2 3.8 0 1.9-2 3.8 0"
};

export function avatarSvg(look: AvatarLook): string {
  const face = FACE_PATHS[look.face];
  const lines = [HAIR_PATHS[look.hair], face.lines, EXTRA_PATHS[look.extra]].filter(Boolean).join("");
  const dots = face.dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join("");
  return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" overflow="visible"><circle cx="24" cy="26" r="16" fill="${look.colour}"/><path d="${lines}" fill="none" stroke="${K}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><g fill="${K}">${dots}</g></svg>`;
}

/** The face on its own. The name goes in the title; next to a written name it is hidden for screen readers. */
export function Avatar({ name, size = 24, className = "", decorative = true }: { name: string; size?: number; className?: string; decorative?: boolean }) {
  const look = avatarLook(name);
  const svg = useMemo(() => avatarSvg(look), [look.hair, look.colour, look.face, look.extra]);
  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : name}
      title={name}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** First name only, for tight spots: "Ria de Vries" → "Ria". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * Face plus name in a soft pill. `mine` marks the logged-in person (gouwe ouwe tint), so you
 * recognise yourself by your own name and face instead of "Jij".
 */
export function NameTag({ name, mine = false, short = false, suffix }: { name: string; mine?: boolean; short?: boolean; suffix?: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-bold ${
        mine ? "bg-gouwe text-krent" : "bg-vul text-krent"
      }`}
    >
      <Avatar name={name} size={26} />
      <span className="truncate">
        {short ? firstName(name) : name}
        {suffix ? <span className="font-normal"> {suffix}</span> : null}
      </span>
    </span>
  );
}
