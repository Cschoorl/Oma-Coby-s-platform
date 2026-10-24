import { useMemo } from "react";

/*
 * Every person gets a small drawn oudje: a head in a flat, slightly unusual colour, grey or white
 * hair (or a hat, cap or scarf), and fine black lines for an expressive face with smile lines,
 * blush and now and then glasses, a moustache or pearls. You see at a glance who is who (and that
 * it is you) instead of "Jij". The look follows from the name, so it is the same on every screen
 * and device. Hair plus colour is unique within the roster (see setAvatarRoster).
 */

/** Dark chocolate instead of near-black: a friendlier, more hand-drawn line. */
const K = "#403634";
const WHITE = "#fffdf7";
/** One soft salmon for every cheek, so the faces read as one family. */
const BLUSH = "#d99294";
const TONGUE = "#c97a7c";
const GOLD = "#dcb867";

/**
 * Six fantasy colours for the face, greyed a little rather than lightened: warm and nostalgic like a
 * children's book, never candy or face paint. Not skin tones, so nobody is sorted by skin colour.
 * Lavendel, saliegroen, perzik, honinggeel, mistblauw, oudroze; illustrations only, like the discozaal.
 */
const COLOURS = ["#b3a8cc", "#a8b88f", "#e3ae94", "#dfc07e", "#9fb2c2", "#cf9fa3"];
/** White to steel grey: everybody here has been around a while. */
const TONES = [WHITE, "#e4ded5", "#c7beb3", "#a0978c"];
/** Hats, caps, scarves and hairbands. */
const ACCENTS = ["#56617f", "#a65d50", "#567467", "#7a5f80"];

export const HAIRS = ["krul", "knot", "kaal", "pet", "hoed", "scheiding", "bob", "lang", "baret", "hoofddoek", "kuif", "muts"] as const;
type Hair = (typeof HAIRS)[number];

export const FACES = ["glim", "lach", "knipoog", "verbaasd", "tevreden", "giechel", "schalks"] as const;
type Face = (typeof FACES)[number];

type Extra = "geen" | "bril" | "leesbril" | "snor" | "parels";
const EXTRAS: Extra[] = ["geen", "bril", "geen", "leesbril", "snor", "parels", "geen", "bril"];

export interface AvatarLook {
  hair: Hair;
  colour: string;
  face: Face;
  extra: Extra;
  tone: string;
  accent: string;
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
 * Gives everyone in the roster their own hair-and-colour combination (up to 72 people).
 * Names are placed in hash order, not signup order, so adding someone rarely changes anyone else's look.
 */
export function setAvatarRoster(names: string[]): void {
  const unique = Array.from(new Set(names.map(normalise).filter(Boolean)));
  unique.sort((a, b) => hash(a) - hash(b) || a.localeCompare(b));
  // Hair is handed out evenly: the first twelve people all have a different head, then a second
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

/** Hair that covers the ears: no ears drawn, so no pearls either. */
const NO_EARS = new Set<Hair>(["bob", "hoofddoek"]);

export function avatarLook(name: string): AvatarLook {
  const key = normalise(name);
  const slot = roster.get(key) ?? hash(key) % SLOTS;
  const more = hash(key, 0x9e3779b9);
  const hair = HAIRS[slot % HAIRS.length];
  let extra = EXTRAS[(more >>> 11) % EXTRAS.length];
  if (extra === "parels" && NO_EARS.has(hair)) extra = "geen";
  return {
    hair,
    colour: COLOURS[Math.floor(slot / HAIRS.length)],
    face: FACES[(more >>> 5) % FACES.length],
    extra,
    tone: TONES[(more >>> 17) % TONES.length],
    accent: ACCENTS[(more >>> 21) % ACCENTS.length]
  };
}

/*
 * Drawn on a 64 × 64 canvas. The head is an egg from (14, 13) to (50, 56); the eyes sit at
 * (25, 34) and (39, 34). Shapes are drawn in order: hair behind the head, ears, head, face, hair in front, extras.
 */

/** A path or circle; fill and stroke are tokens resolved per look ("face", "hair", "accent") or a colour. */
interface Shape {
  d?: string;
  c?: [number, number, number];
  fill?: string;
  /** "line" is the outline, "fine" the thinner detail; "none" for flat colour only. */
  stroke?: "line" | "fine" | "none";
  colour?: string;
  opacity?: number;
  dash?: boolean;
  /** Wrinkles and other small detail, left out when the face is drawn small. */
  small?: false;
}

type Pt = [number, number];
const r2 = (n: number) => Math.round(n * 100) / 100;

/** A row of little round bumps through the points: curls, tufts, a pompom. sweep 1 bulges left of the direction of travel. */
function bumps(points: Pt[], sweep: 0 | 1, move = true): string {
  let d = move ? `M${r2(points[0][0])} ${r2(points[0][1])}` : `L${r2(points[0][0])} ${r2(points[0][1])}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x, y] = points[i];
    const r = r2(Math.hypot(x - x0, y - y0) * 0.6);
    d += `A${r} ${r} 0 0 ${sweep} ${r2(x)} ${r2(y)}`;
  }
  return d;
}

/** Points on a circle, from one angle to another in degrees (counted counter-clockwise from the right). */
function onCircle(cx: number, cy: number, r: number, from: number, to: number, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as Pt;
  });
}

const mirror = (points: Pt[]) => points.map(([x, y]) => [64 - x, y] as Pt);

/** Grey curls peeking out under a hat or cap, on both temples. */
function sideCurls(top: number): Shape {
  const left: Pt[] = [
    [14.4, top],
    [12.8, top + 3.6],
    [13, top + 7.4],
    [14.8, top + 10.6]
  ];
  const close = (pts: Pt[], x: number) => `L${x} ${pts[pts.length - 1][1] - 2}L${x} ${pts[0][1] + 0.4}Z`;
  return {
    d: bumps(left, 0) + close(left, 17) + bumps(mirror(left), 1) + close(mirror(left), 47),
    fill: "hair"
  };
}

const HEAD = "M32 13C42.6 13 50 20.6 50 31.6 50 45.2 42 56 32 56S14 45.2 14 31.6C14 20.6 21.4 13 32 13Z";
const EARS = "M14.8 32.6C11.4 31.2 9.8 33.6 10.4 36.4 11 39.4 13 40.6 15.4 40M49.2 32.6C52.6 31.2 54.2 33.6 53.6 36.4 53 39.4 51 40.6 48.6 40";
const SEAM = { colour: WHITE, opacity: 0.55, stroke: "fine" as const };

const HAIR_SHAPES: Record<Hair, { back?: Shape[]; front: Shape[] }> = {
  krul: {
    front: [
      {
        // A perm: a cloud of curls over the head, little curls along the forehead.
        d:
          bumps(onCircle(32, 30, 19.6, 200, -20, 10), 1) +
          bumps(
            [
              [50.4, 36.7],
              [47, 28.6],
              [41, 23.8],
              [32, 22.8],
              [23, 23.8],
              [17, 28.6],
              [13.6, 36.7]
            ],
            1,
            false
          ) +
          "Z",
        fill: "hair"
      },
      { d: "M24.6 15.6q2 1.4 1.2 3.4M36 14.6q2.4.6 2.4 2.8M30.4 18.6q1.4-1.8 3.2-1", stroke: "fine" }
    ]
  },
  knot: {
    back: [
      { c: [32, 10, 6.2], fill: "hair" },
      { d: "M28.4 10.4q3.6-4 7.2 0M36.4 6.2l3.8-2.4M37.4 8.4l3.8-1.6", stroke: "fine" }
    ],
    front: [
      { d: "M14.3 33C13.6 20 21.5 12.6 32 12.6S50.4 20 49.7 33C48 26.5 41 21.6 32 21.6S16 26.5 14.3 33Z", fill: "hair" },
      { d: "M31.6 21.2C29 17.4 25 15.6 20.6 16.8M32.4 21.2C35 17.4 39 15.6 43.4 16.8", stroke: "fine" }
    ]
  },
  kaal: {
    front: [
      {
        // Bald on top with fluffy tufts above the ears, a shine and two brave hairs.
        d:
          bumps(
            [
              [15.6, 37],
              [12.6, 34.4],
              [12.2, 30.4],
              [13.8, 26.8],
              [17, 24.8]
            ],
            1
          ) +
          "Q16.8 30 15.6 37Z" +
          bumps(
            mirror([
              [15.6, 37],
              [12.6, 34.4],
              [12.2, 30.4],
              [13.8, 26.8],
              [17, 24.8]
            ]),
            0
          ) +
          "Q47.2 30 48.4 37Z",
        fill: "hair"
      },
      { d: "M38.6 17.2q4 .8 6.2 4M30.2 13.2q-.8-2.8 1.2-4.4M33.4 13.1q.8-2.6 3.2-3.4", stroke: "fine" }
    ]
  },
  pet: {
    front: [
      sideCurls(29.4),
      { d: "M12.8 28.5C11.5 17.5 20 11 32 11S52.6 17.5 51.2 28.5C45 25.5 19 25.5 12.8 28.5Z", fill: "accent" },
      { d: "M12.8 28.5C19 25.5 45 25.5 51.2 28.5 50.2 31.2 45.4 30.4 32 30.4S13.8 31.2 12.8 28.5Z", fill: "accent" },
      { d: "M32 11.6V26M20 14.6Q24 20 23.4 26.4M44 14.6Q40 20 40.6 26.4", ...SEAM },
      { c: [32, 11.4, 1.3], fill: "accent" }
    ]
  },
  hoed: {
    front: [
      sideCurls(25.8),
      { d: "M19.5 21C19 12 24.5 8 32 8S45 12 44.5 21Z", fill: "accent" },
      { d: "M10.6 23.6C10.6 20.7 20 19 32 19S53.4 20.7 53.4 23.6 45 26.6 32 26.6 10.6 26.5 10.6 23.6Z", fill: "accent" },
      { d: "M19.6 17.8Q32 20.4 44.4 17.8", ...SEAM },
      // A little flower on the band.
      ...([
        [42.6, 14.6],
        [45, 16.4],
        [44.2, 19.2],
        [41.2, 19.2],
        [40.2, 16.4]
      ] as Pt[]).map(([x, y]): Shape => ({ c: [x, y, 1.9], fill: WHITE, stroke: "fine" })),
      { c: [42.6, 17.2, 1.3], fill: GOLD, stroke: "fine" }
    ]
  },
  scheiding: {
    front: [
      { d: "M14.3 34C13 20 20.5 12.4 32 12.4S51 20 49.7 34C48.6 27.5 46.2 23 40.5 20.4 34 23.6 23.5 24.5 14.3 34Z", fill: "hair" },
      { d: "M40 20.6Q34 15 22 20M41.6 15.6Q46 18 48.3 24M37 17.4Q30 15.6 24.6 17.4", stroke: "fine" }
    ]
  },
  bob: {
    back: [{ d: "M11.2 46C8 27 15.5 10.6 32 10.6S56 27 52.8 46C50.5 48 47.6 47.2 46.6 44.6 46 38 18 38 17.4 44.6 16.4 47.2 13.5 48 11.2 46Z", fill: "hair" }],
    front: [
      { d: "M14.6 34C14 20.5 21.5 12.8 32 12.8S50 20.5 49.4 34C47.5 28 45 24 41 23 37 25 27 25 23 23 19 24 16.5 28 14.6 34Z", fill: "hair" },
      { d: "M23 23Q24.5 17 29 14.4M41 23Q39.5 17 35 14.4M12.6 40.6q.6 3.4 2.4 5M51.4 40.6q-.6 3.4-2.4 5", stroke: "fine" }
    ]
  },
  lang: {
    back: [
      { d: "M12.5 58C6 38 11.5 10.6 32 10.6S58 38 51.5 58C45 61 19 61 12.5 58Z", fill: "hair" },
      { d: "M13.6 45q1 6.4 3.4 10M50.4 45q-1 6.4-3.4 10", stroke: "fine" }
    ],
    front: [
      { d: "M14.6 35C14 20.6 21.5 12.6 32 12.6S50 20.6 49.4 35C47.6 26 41.5 18.6 32 17.2 22.5 18.6 16.4 26 14.6 35Z", fill: "hair" },
      { d: "M15.8 25.2Q32 9.6 48.2 25.2", stroke: "none", colour: "accent" }
    ]
  },
  baret: {
    front: [
      sideCurls(27.6),
      { d: "M12.2 25.8C9.5 17.8 19 10.4 33 10.6S56.4 17 51.6 25.4C44.6 22.4 21.6 21.8 12.2 25.8Z", fill: "accent" },
      { d: "M14.6 23.6Q32 20.4 49.4 23", ...SEAM },
      { d: "M33.6 10.8q.4-2.4 1.8-3.4" }
    ]
  },
  hoofddoek: {
    back: [
      { d: "M9.4 45C7 24 16 9.2 32 9.2S57 24 54.6 45C52.6 55 44 61 32 61S11.4 55 9.4 45Z", fill: "accent" },
      { d: "M13.4 47q3 7.4 9.4 10.4M50.6 47q-3 7.4-9.4 10.4", ...SEAM }
    ],
    front: [
      { d: "M15.2 32C15 19.6 22.4 14.2 32 14.2S49 19.6 48.8 32C45 25.6 39.6 23 32 23S19 25.6 15.2 32Z", fill: "accent" },
      ...([
        [12.2, 31],
        [11.8, 41],
        [51.8, 31],
        [52.2, 41],
        [20.6, 13.4],
        [43.4, 13.4],
        [32, 11.6],
        [26, 18.6],
        [38, 18.6],
        [32, 19.6],
        [16.4, 51],
        [47.6, 51]
      ] as Pt[]).map(([x, y]): Shape => ({ c: [x, y, 0.9], fill: WHITE, stroke: "none", opacity: 0.8 }))
    ]
  },
  kuif: {
    front: [
      { d: "M15 32C14 23 17 17 22 14.5 25 9 33 6.5 41 8.5 46 10 47.5 13 45 14.5 48.5 18 50 24 49.5 32 47 25 42 21 34 20.5 26 21 19 25 15 32Z", fill: "hair" },
      { d: "M24 15Q31 11 40 12M27.5 18.4Q34 14.6 43 15.4", stroke: "fine" }
    ]
  },
  muts: {
    front: [
      sideCurls(30.6),
      { d: bumps(onCircle(32, 7.4, 3.8, 90, -270, 8), 1) + "Z", fill: WHITE },
      { d: "M13.2 27C12.4 16.4 21 9.8 32 9.8S51.6 16.4 50.8 27Z", fill: "accent" },
      { d: "M12 28.2C12 25.4 21 24 32 24S52 25.4 52 28.2 51 32 49.6 32C42 29.8 22 29.8 14.4 32 13 32 12 30.8 12 28.2Z", fill: "accent" },
      { d: "M17 25.6v4.6M22 25v4.4M27 24.6v4.4M32 24.4v4.4M37 24.6v4.4M42 25v4.4M47 25.6v4.6", ...SEAM }
    ]
  }
};

const dot = (x: number, y: number): Shape[] => [
  { c: [x, y, 1.7], fill: K, stroke: "none" },
  { c: [x + 0.6, y - 0.6, 0.5], fill: WHITE, stroke: "none" }
];

/** Eyes, brows and mouth per face: the expression. The nose, blush and wrinkles are the same for everyone. */
const FACE_SHAPES: Record<Face, Shape[]> = {
  glim: [
    ...dot(25, 34),
    ...dot(39, 34),
    { d: "M21.6 29.6q3.2-2 6.4-.2M36 29.4q3.2-1.8 6.4.2M27.2 46.4q4.8 4 9.6 0" },
    { d: "M22.6 43q-1.2 2.8.6 5.2M41.4 43q1.2 2.8-.6 5.2", stroke: "fine" }
  ],
  lach: [
    { d: "M21.8 34.6q3.2-3.6 6.4 0M35.8 34.6q3.2-3.6 6.4 0M21.4 28.6q3.4-2.4 6.8-.4M35.8 28.2q3.4-2 6.8.4" },
    { d: "M25.4 44.6h13.2q-.8 7.6-6.6 7.6t-6.6-7.6Z", fill: K },
    { d: "M28.8 50.4q3.2-2.4 6.4 0-1.4 1.6-3.2 1.6t-3.2-1.6Z", fill: TONGUE, stroke: "none" }
  ],
  knipoog: [
    ...dot(39, 34),
    { d: "M21.8 34.2q3.2 2.4 6.4 0M21.6 30.6q3.2-.8 6.4.4M36 28.6q3.2-2.2 6.4-.2M27 46q5.4 4.6 10.6-.8" },
    { d: "M38.4 44.4q1 .6.6 1.8", stroke: "fine" }
  ],
  verbaasd: [
    { c: [25, 34, 2.4], fill: WHITE },
    { c: [39, 34, 2.4], fill: WHITE },
    { c: [25.3, 34.3, 1.1], fill: K, stroke: "none" },
    { c: [39.3, 34.3, 1.1], fill: K, stroke: "none" },
    { d: "M21.4 27.4q3.4-2.6 6.8-.8M35.8 26.6q3.4-1.8 6.8.8" },
    { d: "M32 44.8c1.3 0 2.2 1.2 2.2 2.8S33.3 50.4 32 50.4 29.8 49.2 29.8 47.6 30.7 44.8 32 44.8Z", fill: K }
  ],
  tevreden: [
    { d: "M21.8 33.8q3.2 2.8 6.4 0M35.8 33.8q3.2 2.8 6.4 0M21.8 29.4q3-1.4 6 0M36.2 29.4q3-1.4 6 0M28 46.4q4 2.8 8 0" },
    { d: "M21.6 33.4l-1.2-.6M42.4 33.4l1.2-.6", stroke: "fine" }
  ],
  giechel: [
    { d: "M22.4 31.8l4.6 2.2-4.6 2.2M41.6 31.8l-4.6 2.2 4.6 2.2M21.4 28q3.4-2.6 6.8-.6M35.8 27.4q3.4-2 6.8.6" },
    { d: "M25.6 44.2q6.4 1.6 12.8 0-1.4 8-6.4 8t-6.4-8Z", fill: K },
    { d: "M29 50.4q3-2.2 6 0-1.3 1.6-3 1.6t-3-1.6Z", fill: TONGUE, stroke: "none" }
  ],
  schalks: [
    ...dot(25, 34.4),
    ...dot(39, 34.4),
    { d: "M22.4 32.8q2.6-1 5.2 0M36.4 32.8q2.6-1 5.2 0M21.6 30q3.2-.4 6.4.4M36 28.4q3.4-3 6.6-.6M27.4 47q3.6 1.6 8.2-2" }
  ]
};

const FACE_COMMON: Shape[] = [
  { c: [22.6, 41.8, 3], fill: BLUSH, stroke: "none", opacity: 0.45 },
  { c: [41.4, 41.8, 3], fill: BLUSH, stroke: "none", opacity: 0.45 },
  // Laughter lines, bags under the eyes and a line on the forehead: an oudje, not a toddler.
  { d: "M19.4 33.2l-1.8-.6M19.6 35.6l-1.6.8M44.6 33.2l1.8-.6M44.4 35.6l1.6.8M23.2 37.8q1.8.8 3.6 0M37.2 37.8q1.8.8 3.6 0M27.8 25.8q4.2-1.2 8.4 0M30.4 53.2q1.6.7 3.2 0", stroke: "fine", small: false },
  { d: "M32.4 36.2c-1.4 2.4-2.6 4.6-1.2 5.2.9.4 1.8.3 2.6-.1" }
];

const EXTRA_SHAPES: Record<Extra, { under?: Shape[]; over?: Shape[] }> = {
  geen: {},
  // Over the mouth but under the hair, in the colour of the hair.
  snor: { under: [{ d: "M32 42.6c-1.8-1.6-6.2-1.8-8.4 1.4 2.8 1.2 6 .8 8.4-.8 2.4 1.6 5.6 2 8.4.8-2.2-3.2-6.6-3-8.4-1.4Z", fill: "hair" }] },
  bril: {
    over: [
      { c: [25, 34, 4.6], fill: WHITE, opacity: 0.22, stroke: "none" },
      { c: [39, 34, 4.6], fill: WHITE, opacity: 0.22, stroke: "none" },
      { d: "M29.6 34a4.6 4.6 0 1 1-9.2 0 4.6 4.6 0 1 1 9.2 0M43.6 34a4.6 4.6 0 1 1-9.2 0 4.6 4.6 0 1 1 9.2 0M29.6 33.6q2.4-1.6 4.8 0M20.4 33.4l-6-.8M43.6 33.4l6-.8" }
    ]
  },
  // Half-moon reading glasses low on the nose, on a beaded cord.
  leesbril: {
    over: [
      { d: "M22.4 37.4h6.4q-.2 3.6-3.2 3.6t-3.2-3.6ZM35.2 37.4h6.4q-.2 3.6-3.2 3.6t-3.2-3.6Z", fill: WHITE, opacity: 0.9 },
      { d: "M28.8 37.8q3.2-1.4 6.4 0" },
      { d: "M22.4 37.8Q15.4 46 18 56.4M41.6 37.8Q48.6 46 46 56.4", stroke: "line", colour: "accent", dash: true }
    ]
  },
  parels: {
    over: [
      { c: [12.6, 41.8, 1.5], fill: WHITE, stroke: "fine" },
      { c: [51.4, 41.8, 1.5], fill: WHITE, stroke: "fine" }
    ]
  }
};

/** The drawing as SVG markup. Below 40 px the lines get a little heavier and the wrinkles drop out, so it stays clear. */
export function avatarSvg(look: AvatarLook, size = 64): string {
  const small = size < 40;
  const width = { line: small ? 1.8 : 1.3, fine: small ? 1.15 : 0.85 };
  const token = (v: string | undefined) => (v === "face" ? look.colour : v === "hair" ? look.tone : v === "accent" ? look.accent : v);
  const draw = (s: Shape) => {
    if (small && s.small === false) return "";
    const fill = token(s.fill) ?? "none";
    // The hairband is a thick coloured line with no outline.
    const band = s.stroke === "none" && s.colour === "accent" && !s.fill;
    const stroke = band ? look.accent : s.stroke === "none" ? "none" : (token(s.colour) ?? K);
    const w = band ? (small ? 3.4 : 2.8) : width[s.stroke === "fine" ? "fine" : "line"];
    const attrs = `fill="${fill}" stroke="${stroke}"${stroke === "none" ? "" : ` stroke-width="${w}"`}${s.opacity !== undefined ? ` opacity="${s.opacity}"` : ""}${
      s.dash ? ` stroke-dasharray="0.1 ${small ? 2.6 : 2}"` : ""
    }`;
    return s.c ? `<circle cx="${s.c[0]}" cy="${s.c[1]}" r="${s.c[2]}" ${attrs}/>` : `<path d="${s.d}" ${attrs}/>`;
  };
  const hair = HAIR_SHAPES[look.hair];
  const extra = EXTRA_SHAPES[look.extra];
  const shapes: Shape[] = [
    ...(hair.back ?? []),
    ...(NO_EARS.has(look.hair) ? [] : [{ d: EARS, fill: "face" }, { d: "M12.6 35q1.6-.4 2 1.4M51.4 35q-1.6-.4-2 1.4", stroke: "fine" as const }]),
    { d: HEAD, fill: "face" },
    ...FACE_COMMON,
    ...FACE_SHAPES[look.face],
    ...(extra.under ?? []),
    ...hair.front,
    ...(extra.over ?? [])
  ];
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">${shapes.map(draw).join("")}</svg>`;
}

/** The face on its own. The name goes in the title; next to a written name it is hidden for screen readers. */
export function Avatar({ name, size = 24, className = "", decorative = true }: { name: string; size?: number; className?: string; decorative?: boolean }) {
  const look = avatarLook(name);
  const svg = useMemo(() => avatarSvg(look, size), [look.hair, look.colour, look.face, look.extra, look.tone, look.accent, size]);
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
