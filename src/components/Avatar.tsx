import { useMemo } from "react";

/*
 * Every person gets a drawn oudje in flat colour, without outlines: a wide, softly square face on a
 * disc in a dark tint of that same face colour, grey or white hair (or a hat, cap or scarf), and the
 * eyes, brows and mouth as solid shapes in that dark tint. Contrast does the work, not lines. You see
 * at a glance who is who (and that it is you) instead of "Jij". The look follows from the name, so it
 * is the same on every screen and device. Hair plus colour is unique within the roster (see setAvatarRoster).
 *
 * There are two drawings of the same person. Large (44 px and up: profile, panels) adds small detail:
 * laughter lines, strands, the flower on the hat, the cord of the reading glasses, pearls. Small
 * (rosters, lists, name tags) is its own simpler version with only the big shapes, in fuller colours.
 */

const WHITE = "#fffdf7";
/** The deep brown every dark tint is mixed with. */
const DEEP = "#2b2321";
/** One soft salmon for every cheek, so the faces read as one family. */
const BLUSH = "#d99294";
const TONGUE = "#c97a7c";
const GOLD = "#dcb867";

/**
 * Six fantasy colours for the face, greyed a little rather than lightened: warm and nostalgic like a
 * children's book, never candy or face paint. Not skin tones, so nobody is sorted by skin colour.
 * Lavendel, saliegroen, perzik, honinggeel, mistblauw, oudroze; illustrations only, like the discozaal.
 */
const COLOURS = ["#aea1d0", "#a3b887", "#e6a98c", "#e1bd70", "#98afc6", "#d1989d"];
/** The same six a step fuller, for the small drawing and for hats: at 26 px soft colours blur together. */
const FULL = ["#a091cb", "#93ae74", "#e09a7a", "#dcb25a", "#859fbd", "#c9868c"];
/** White to steel grey: everybody here has been around a while. */
const TONES = [WHITE, "#e4ded5", "#c7beb3", "#a0978c"];

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
  /** Hat, cap, scarf or hairband: one of the other five colours, so it stands apart from the face. */
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

/** Mixes two hex colours: t = 0 gives a, t = 1 gives b. */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, "0")).join("")}`;
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
  const colour = Math.floor(slot / HAIRS.length);
  let extra = EXTRAS[(more >>> 11) % EXTRAS.length];
  if (extra === "parels" && NO_EARS.has(hair)) extra = "geen";
  return {
    hair,
    colour: COLOURS[colour],
    face: FACES[(more >>> 5) % FACES.length],
    extra,
    tone: TONES[(more >>> 17) % TONES.length],
    accent: FULL[(colour + 1 + ((more >>> 21) % (COLOURS.length - 1))) % COLOURS.length]
  };
}

/*
 * Drawn on a 64 × 64 canvas: a disc, on it a wide rounded face from (12, 17) to (52, 55) with the
 * eyes at (25, 36.5) and (39, 36.5). The hair was drawn for a narrower head, so it is widened to fit
 * (see HAIR_FIT). Order: disc, hair behind, ears, face, features, hair in front, extras.
 */

/**
 * A path, circle or ellipse. Fill and stroke are colours or tokens resolved per look: "face", "hair",
 * "accent", "ink" (the dark tint of the face, for eyes, brows and mouth) and "mid" (ears, nose).
 */
interface Shape {
  d?: string;
  c?: [number, number, number];
  e?: [number, number, number, number];
  fill?: string;
  /** A filled shape has no outline. A line is "feature" (glasses, a smile; the default for unfilled shapes) or "fine" detail. */
  stroke?: "feature" | "fine" | "none";
  colour?: string;
  opacity?: number;
  dash?: boolean;
  /** Only in the large or only in the small drawing. Everything "fine" is large only. */
  only?: "big" | "small";
  /** A brow: a short bar, thicker than a line. */
  brow?: true;
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

const SEAM = { colour: WHITE, opacity: 0.55, stroke: "fine" as const, only: "big" as const };

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
      { d: "M28.4 10.4q3.6-4 7.2 0", stroke: "fine" },
      { d: "M36.4 6.2l3.8-2.4M37.4 8.4l3.8-1.6", stroke: "fine", colour: "accent" }
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
      { d: "M38.6 17.2q4 .8 6.2 4", stroke: "fine" },
      { d: "M30.2 13.2q-.8-2.8 1.2-4.4M33.4 13.1q.8-2.6 3.2-3.4", stroke: "fine", colour: "hair" }
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
      ] as Pt[]).map(([x, y]): Shape => ({ c: [x, y, 1.9], fill: WHITE, stroke: "fine", only: "big" })),
      { c: [42.6, 17.2, 1.3], fill: GOLD, stroke: "fine", only: "big" }
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
      { d: "M33.6 10.8q.4-2.4 1.8-3.4", colour: "accent" }
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
      ] as Pt[]).map(([x, y]): Shape => ({ c: [x, y, 0.9], fill: WHITE, stroke: "none", opacity: 0.8, only: "big" }))
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

const HEAD = "M26 17h12c8 0 14 6 14 14v9c0 9-6.4 15-15 15H27c-8.6 0-15-6-15-15v-9c0-8 6-14 14-14Z";
/** Widens the hair (drawn for a 36-wide head) to the 40-wide face and lowers it onto the forehead. */
const HAIR_FIT = "translate(32 3) scale(1.12 1) translate(-32 0)";

/** Brows as short solid bars, not lines: [x1, y1, x2, y2] per brow. */
const brows = (left: [number, number, number, number], right: [number, number, number, number]): Shape => ({
  d: `M${left[0]} ${left[1]}L${left[2]} ${left[3]}M${right[0]} ${right[1]}L${right[2]} ${right[3]}`,
  colour: "ink",
  brow: true
});
const BROW = 3;

/** Open eyes: solid ovals. */
const ovals = (y = 36.5): Shape[] => [
  { e: [25, y, 2.3, 2.9], fill: "ink" },
  { e: [39, y, 2.3, 2.9], fill: "ink" }
];

/** The expression: eyes, brows and mouth as solid shapes in the dark tint, the same build for everyone. */
const FACE_SHAPES: Record<Face, Shape[]> = {
  glim: [...ovals(), brows([21.6, 30.6, 28, 30], [36, 30, 42.4, 30.6]), { d: "M26.6 45.4h10.8c0 3.4-2.4 5.6-5.4 5.6s-5.4-2.2-5.4-5.6Z", fill: "ink" }],
  lach: [
    { d: "M22 37.6q3-3.6 6 0M36 37.6q3-3.6 6 0", colour: "ink" },
    brows([21.6, 29.6, 28, 28.8], [36, 28.8, 42.4, 29.6]),
    { d: "M25 44.4h14c0 4.8-3.2 7.8-7 7.8s-7-3-7-7.8Z", fill: "ink" },
    { d: "M28.6 50.6q3.4-2.6 6.8 0-1.4 1.6-3.4 1.6t-3.4-1.6Z", fill: TONGUE }
  ],
  knipoog: [
    { d: "M22 37q3 2.2 6 0", colour: "ink" },
    { e: [39, 36.5, 2.3, 2.9], fill: "ink" },
    brows([21.6, 31.4, 28, 31.4], [36, 29.6, 42.4, 29]),
    { d: "M27 46q5.4 4.4 10.4-.6", colour: "ink" }
  ],
  verbaasd: [
    { c: [25, 36.5, 3.1], fill: "ink" },
    { c: [39, 36.5, 3.1], fill: "ink" },
    { c: [25.9, 35.6, 0.9], fill: WHITE, only: "big" },
    { c: [39.9, 35.6, 0.9], fill: WHITE, only: "big" },
    brows([21.6, 28.6, 28, 27.6], [36, 27.6, 42.4, 28.6]),
    { e: [32, 47.6, 2.4, 3], fill: "ink" }
  ],
  tevreden: [
    { d: "M22 36q3 3 6 0M36 36q3 3 6 0", colour: "ink" },
    brows([21.8, 30.6, 28, 30.6], [36, 30.6, 42.2, 30.6]),
    { d: "M28 46.4q4 2.8 8 0", colour: "ink" }
  ],
  giechel: [
    { d: "M22.6 34.6l4.4 2.2-4.4 2.2M41.4 34.6l-4.4 2.2 4.4 2.2", colour: "ink" },
    brows([21.6, 29.4, 28, 28.6], [36, 28.6, 42.4, 29.4]),
    { d: "M25.4 44.4h13.2c-.6 5-3.2 7.6-6.6 7.6s-6-2.6-6.6-7.6Z", fill: "ink" },
    { d: "M28.8 50.4q3.2-2.4 6.4 0-1.4 1.6-3.2 1.6t-3.2-1.6Z", fill: TONGUE }
  ],
  schalks: [
    // Half-closed: the top of each oval cut off by a level lid.
    { d: "M22.6 36h4.8c0 2-1 3.2-2.4 3.2s-2.4-1.2-2.4-3.2ZM36.6 36h4.8c0 2-1 3.2-2.4 3.2s-2.4-1.2-2.4-3.2Z", fill: "ink" },
    brows([21.6, 31.4, 28, 31.4], [36, 29.6, 42.4, 28]),
    { d: "M27.4 47q3.6 1.8 8.2-1.8", colour: "ink" }
  ]
};

/** Nose and blush for everyone; laughter lines only large. */
const FACE_COMMON: Shape[] = [
  { e: [21, 43, 3.6, 2.4], fill: BLUSH, opacity: 0.6 },
  { e: [43, 43, 3.6, 2.4], fill: BLUSH, opacity: 0.6 },
  { e: [32, 41.4, 2.4, 1.8], fill: "mid" },
  { d: "M18.4 36.6l-1.6-.4M45.6 36.6l1.6-.4M28.4 25.8q3.6-.9 7.2 0", stroke: "fine" }
];

const EXTRA_SHAPES: Record<Extra, { under?: Shape[]; over?: Shape[] }> = {
  geen: {},
  // Under the nose, over the mouth, in a slightly deeper shade of the hair.
  snor: { under: [{ d: "M32 43.2c-1.8-1.6-6.4-1.8-8.6 1.6 2.8 1.2 6.2.8 8.6-.8 2.4 1.6 5.8 2 8.6.8-2.2-3.4-6.8-3.2-8.6-1.6Z", fill: "moustache" }] },
  bril: {
    over: [{ d: "M30 36.5a5 5 0 1 1-10 0 5 5 0 1 1 10 0M44 36.5a5 5 0 1 1-10 0 5 5 0 1 1 10 0M30 36q2-1.4 4 0M20 35.6l-7-.8M44 35.6l7-.8", colour: "ink" }]
  },
  // Half-moon reading glasses low on the nose; large, they hang on a beaded cord.
  leesbril: {
    over: [
      { d: "M22 39.4h7q-.2 4-3.5 4t-3.5-4ZM35 39.4h7q-.2 4-3.5 4t-3.5-4Z", fill: WHITE, opacity: 0.55 },
      { d: "M22 39.4h7q-.2 4-3.5 4t-3.5-4ZM35 39.4h7q-.2 4-3.5 4t-3.5-4ZM29 39.8q3-1.4 6 0", colour: "ink" },
      { d: "M22 39.8Q14.6 48 17.6 58M42 39.8Q49.4 48 46.4 58", colour: "accent", dash: true, only: "big" }
    ]
  },
  parels: {
    over: [
      { c: [10.6, 42.4, 1.7], fill: WHITE, only: "big" },
      { c: [53.4, 42.4, 1.7], fill: WHITE, only: "big" }
    ]
  }
};

/** Below this size the small drawing is used. */
const SMALL_BELOW = 44;

/** The drawing as SVG markup: the large one, or from SMALL_BELOW down its own simpler version. */
export function avatarSvg(look: AvatarLook, size = 64): string {
  const small = size < SMALL_BELOW;
  const index = Math.max(0, COLOURS.indexOf(look.colour));
  const face = small ? FULL[index] : look.colour;
  const colours: Record<string, string> = {
    face,
    hair: look.tone,
    accent: look.accent,
    ink: mix(face, DEEP, 0.62),
    mid: mix(face, DEEP, 0.2),
    moustache: mix(look.tone, DEEP, 0.12)
  };
  const token = (v: string | undefined) => (v ? (colours[v] ?? v) : undefined);
  const width = { feature: small ? 2.8 : 2.2, fine: 1.1 };
  const draw = (s: Shape) => {
    // Filled shapes never get an outline; "fine" detail (lines or small shapes) only shows large.
    const weight = s.fill ? "none" : (s.stroke ?? "feature");
    if ((small && (s.only === "big" || s.stroke === "fine")) || (!small && s.only === "small")) return "";
    // The hairband and brows are thick coloured strokes; detail lines are the dark tint, half see-through.
    const band = s.stroke === "none" && s.colour === "accent" && !s.fill;
    const stroke = band ? look.accent : weight === "none" ? "none" : (token(s.colour) ?? colours.ink);
    const w = band ? (small ? 3.8 : 3) : s.brow ? BROW + (small ? 0.6 : 0) : weight === "none" ? 0 : width[weight];
    const opacity = s.opacity ?? (weight === "fine" && !s.colour ? 0.45 : undefined);
    const attrs = `fill="${token(s.fill) ?? "none"}" stroke="${stroke}"${stroke === "none" ? "" : ` stroke-width="${w}"`}${opacity !== undefined ? ` opacity="${opacity}"` : ""}${
      s.dash ? ' stroke-dasharray="0.1 2.2"' : ""
    }`;
    if (s.c) return `<circle cx="${s.c[0]}" cy="${s.c[1]}" r="${s.c[2]}" ${attrs}/>`;
    if (s.e) return `<ellipse cx="${s.e[0]}" cy="${s.e[1]}" rx="${s.e[2]}" ry="${s.e[3]}" ${attrs}/>`;
    return `<path d="${s.d}" ${attrs}/>`;
  };
  const hair = HAIR_SHAPES[look.hair];
  const extra = EXTRA_SHAPES[look.extra];
  const group = (shapes: Shape[] | undefined) => (shapes?.length ? `<g transform="${HAIR_FIT}">${shapes.map(draw).join("")}</g>` : "");
  // Identical people share an id, which is harmless: their clip paths are the same.
  const clip = `oc-av-${small ? "s" : "l"}-${hash(JSON.stringify(look)).toString(36)}`;
  const ears = NO_EARS.has(look.hair) ? "" : [{ e: [11.4, 38.4, 3.6, 4.6], fill: "mid" } as Shape, { e: [52.6, 38.4, 3.6, 4.6], fill: "mid" } as Shape].map(draw).join("");
  const body = [
    `<circle cx="32" cy="32" r="32" fill="${colours.ink}"/>`,
    group(hair.back),
    ears,
    draw({ d: HEAD, fill: "face" }),
    ...[...FACE_COMMON, ...FACE_SHAPES[look.face], ...(extra.under ?? [])].map(draw),
    group(hair.front),
    ...(extra.over ?? []).map(draw)
  ].join("");
  // Small zooms in on the face, so the eyes and mouth are bigger; the round frame comes from the disc.
  const view = small ? "4 5 56 56" : "0 0 64 64";
  return `<svg viewBox="${view}" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round"><clipPath id="${clip}"><circle cx="32" cy="32" r="32"/></clipPath><g clip-path="url(#${clip})">${body}</g></svg>`;
}

/** The face on its own. The name goes in the title; next to a written name it is hidden for screen readers. */
export function Avatar({ name, size = 24, className = "", decorative = true }: { name: string; size?: number; className?: string; decorative?: boolean }) {
  const look = avatarLook(name);
  const svg = useMemo(() => avatarSvg(look, size), [look.hair, look.colour, look.face, look.extra, look.tone, look.accent, size]);
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full ${className}`}
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
