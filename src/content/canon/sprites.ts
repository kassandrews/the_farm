// VENDORED FROM cozy_sprites (src/render/sprites.ts). Copied, not imported —
// The Meadow stays untouched (see CLAUDE.md). This is the canon pixel art: a
// 16×16 silhouette per life stage and adult form, mood faces, and accessories.
//
// Only the *pure* half lives here — renderPixels composites into a DOM-free
// RGBA buffer, so it stays testable and belongs with the content. The canvas
// side (buildCreatureFrames, drawSpriteQuantized) is a rendering concern and
// lives in src/render/sprites.ts.
//
// Trimmed vs. the original: the teen "audition" accents and the sleep-poke
// "peek" frame are Meadow-only mechanics with no Farm surface, so they're
// dropped. Everything else is the art as shipped.

import type { AdultForm, Stage } from "./forms";

export const CELL = 16; // sprite grid is 16×16 cells

export type Palette = Record<string, string>;

const OUTLINE = "#402e3a";
const EYE = "#3a2b3f";

// --- Mood faces ---------------------------------------------------------------
const FACE_NEUTRAL = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "....ee....ee....",
  "....ee....ee....",
  "................",
  "................",
  ".......ee.......",
  "................",
  "................",
];

const FACE_HAPPY = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "....ee....ee....",
  "....ee....ee....",
  "................",
  ".....e....e.....",
  "......eeee......",
  "................",
  "................",
];

const FACE_SAD = [
  "................",
  "................",
  "................",
  "................",
  "...e........e...",
  "....ee....ee....",
  "....ee....ee....",
  "................",
  "......eeee......",
  ".....e....e.....",
  "................",
  "................",
];

const FACE_SLEEP = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....ee....ee....",
  "................",
  "..............z.",
  "............z...",
  "................",
  "................",
];

const SMALL_NEUTRAL = ["e...e", ".....", ".eee."];
const SMALL_HAPPY = SMALL_NEUTRAL;
const SMALL_SAD = ["e...e", ".....", ".e.e.", "..e.."];
const SMALL_SLEEP = ["ee.ee", ".....", "..e.."];

const DOG_NEUTRAL = ["e...e", ".nnn.", "..e..", ".eee."];
const DOG_HAPPY = DOG_NEUTRAL;
const DOG_SAD = ["e...e", ".nnn.", "..e..", ".e.e.", "..e.."];
const DOG_SLEEP = ["ee.ee", ".nnn.", "..e..", ".eee."];

const MOLE_NOSE_TIP_CENTER = "..nnn..";
const MOLE_NOSE_TIP_LEFT = ".nnnp..";
const MOLE_NOSE_TIP_RIGHT = "..pnnn.";
const MOLE_MUZZLE = [".ppppp.", "..ppp.."];
const MOLE_SNOUT = [MOLE_NOSE_TIP_CENTER, ...MOLE_MUZZLE];
const MOLE_EYE_ROWS = 3;
const MOLE_NEUTRAL = [".......", ".e...e.", ".......", ...MOLE_SNOUT];
const MOLE_HAPPY = MOLE_NEUTRAL;
const MOLE_SAD = ["ee...ee", ".e...e.", ".......", ...MOLE_SNOUT];
const MOLE_SLEEP = [".......", "ee...ee", ".......", ...MOLE_SNOUT];

const FACE_PALETTE: Palette = { e: EYE, z: "#9a9ab0", n: "#2b2030" };

export type Mood = "neutral" | "happy" | "sad" | "sleep";

type FaceKind = "standard" | "small" | "dog" | "mole";

function faceFor(kind: FaceKind, mood: Mood): string[] {
  if (kind === "standard") {
    switch (mood) {
      case "happy":
        return FACE_HAPPY;
      case "sad":
        return FACE_SAD;
      case "sleep":
        return FACE_SLEEP;
      default:
        return FACE_NEUTRAL;
    }
  }
  if (kind === "dog") {
    switch (mood) {
      case "happy":
        return DOG_HAPPY;
      case "sad":
        return DOG_SAD;
      case "sleep":
        return DOG_SLEEP;
      default:
        return DOG_NEUTRAL;
    }
  }
  if (kind === "mole") {
    switch (mood) {
      case "happy":
        return MOLE_HAPPY;
      case "sad":
        return MOLE_SAD;
      case "sleep":
        return MOLE_SLEEP;
      default:
        return MOLE_NEUTRAL;
    }
  }
  switch (mood) {
    case "happy":
      return SMALL_HAPPY;
    case "sad":
      return SMALL_SAD;
    case "sleep":
      return SMALL_SLEEP;
    default:
      return SMALL_NEUTRAL;
  }
}

// --- Bodies -------------------------------------------------------------------
interface BodyDef {
  rows: string[];
  extra?: Palette;
  fill: string;
  shade: string;
  face: FaceKind;
  faceDx: number;
  faceDy: number;
  faceExtra?: Palette;
  overlay?: { rows: string[]; palette: Palette };
  alt?: { rows: string[]; palette: Palette };
}

const BABY: BodyDef = {
  rows: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "......kkkk......",
    ".....kBBBBk.....",
    "....kBBBBBBk....",
    "....kBBBBBBk....",
    "....kBBBBBBk....",
    "....kBBBBBBk....",
    "....kSBBBBSk....",
    ".....kSSSSk.....",
    "......kkkk......",
    "................",
  ],
  fill: "#ffd884",
  shade: "#eab24a",
  face: "small",
  faceDx: 6,
  faceDy: 9,
};

const CHILD: BodyDef = {
  rows: [
    "................",
    ".......L........",
    "......LGL.......",
    ".......G........",
    ".....kkkkk......",
    "....kBBBBBk.....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kSBBBBBSk....",
    "....kSSSSSk.....",
    ".....kkkkk......",
    "................",
    "................",
  ],
  extra: { L: "#8fd06a", G: "#5fa347" },
  fill: "#ffcf70",
  shade: "#e8a94a",
  face: "small",
  faceDx: 5,
  faceDy: 7,
};

const TEEN: BodyDef = {
  rows: [
    "................",
    "....k...k.......",
    ".....k.k.k......",
    ".....kkkkk......",
    "....kSSBBBk.....",
    "....kBBBBBk.....",
    "....kBBBBBk.....",
    "....kBBBBBk.....",
    "....kBBBBBk.....",
    "....kBBBBBk.....",
    "....kBBBBBk.....",
    "....kBBBBBk.....",
    "....kSBBBSk.....",
    ".....kSSSk......",
    "......kkk.......",
    "................",
  ],
  fill: "#b9a8d8",
  shade: "#927cba",
  face: "small",
  faceDx: 5,
  faceDy: 6,
};

const DOG: BodyDef = {
  rows: [
    "................",
    "..k........k....",
    ".kDk......kDk...",
    "kDDDk....kDDDk..",
    ".kkBBkkkkBBkk...",
    "..kBBBBBBBBk....",
    ".kBBBBBBBBBBk...",
    ".kBBBBBBBBBBk...",
    ".kBBBBBBBBBBk...",
    ".kBBBBBBBBBBk...",
    "..kBBBBBBBBk.kk.",
    "..kBBWWWWBBkkDk.",
    "..kSBWWWWBSkkk..",
    "...kSSWWSSk.....",
    "....kkkkkk......",
    "................",
  ],
  extra: { D: "#4a4a56", W: "#eef0f2" },
  fill: "#7a7a8a",
  shade: "#5a5a68",
  face: "dog",
  faceDx: 5,
  faceDy: 6,
  alt: {
    rows: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      ".............xx.",
      ".............kx.",
      ".............Dk.",
      ".............kk.",
    ],
    palette: { k: OUTLINE, D: "#4a4a56", x: "ERASE" },
  },
};

const BLOB: BodyDef = {
  rows: [
    "................",
    "................",
    "................",
    "................",
    "......kkkk......",
    "....kkBBBBkk....",
    "...kBBBBBBBBk...",
    "..kBBBBBBBBBBk..",
    "..kBBBBBBBBBBk..",
    ".kBBBBBBBBBBBBk.",
    ".kBBBBBBBBBBBBk.",
    "kBBBBBBBBBBBBBBk",
    "kSBBBBBBBBBBBBSk",
    "kSSBBBBBBBBBBSSk",
    ".kkkkkkkkkkkkkk.",
    "................",
  ],
  fill: "#79c7d4",
  shade: "#4fa2b0",
  face: "small",
  faceDx: 5,
  faceDy: 8,
};

const GREMLIN: BodyDef = {
  rows: [
    "................",
    ".k..........k...",
    ".kGk........kGk.",
    ".kGGk......kGGk.",
    "..kGGkkkkkkGGk..",
    "...kGBBBBBBGk...",
    "....kBBBBBBk....",
    "....kBBBBBBk....",
    "....kBBBBBBk....",
    "....kBBBBBBk....",
    "....kBBBBBBk....",
    "....kBBBBBBk....",
    "....kSBBBBSk....",
    ".....kSSSSk.....",
    "......kkkk......",
    "................",
  ],
  extra: { G: "#4c8f3c" },
  fill: "#8fce76",
  shade: "#5da84a",
  face: "small",
  faceDx: 5,
  faceDy: 7,
  overlay: {
    rows: ["......w.w......"],
    palette: { w: "#ffffff" },
  },
};

const SCHOLAR: BodyDef = {
  rows: [
    "................",
    "....kkkkkkk.....",
    "...kBBBBBBBk....",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "...kBBBBBBBk....",
    "....kBBBBBk.....",
    "....kBBBBBk.....",
    "....kBBBBBk.....",
    "....kSBBBSk.....",
    ".....kSSSk......",
    "......kkk.......",
    "................",
  ],
  fill: "#b6a1e2",
  shade: "#8f77c6",
  face: "small",
  faceDx: 5,
  faceDy: 4,
  overlay: {
    rows: [
      "................",
      "................",
      "................",
      "....www.www.....",
      "....www.www.....",
      "....www.www.....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    palette: { w: "#dbe7ff" },
  },
};

const OFFICE: BodyDef = {
  rows: [
    "................",
    "................",
    "................",
    "...kkkkkkkkk....",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBTBBBBBBk...",
    "..kBBTBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kSBBBBBBBSk...",
    "..kSSSSSSSSSk...",
    "...kkkkkkkkk....",
    "................",
  ],
  extra: { T: "#6f6a80" },
  fill: "#c4c6d4",
  shade: "#9a9cb0",
  face: "standard",
  faceDx: 0,
  faceDy: 1,
  overlay: {
    rows: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "....bb....bb....",
      "................",
      "................",
      "................",
    ],
    palette: { b: "#6f6a80" },
  },
};

const MENACE: BodyDef = {
  rows: [
    "................",
    ".....y.y.y......",
    ".....yyyyy......",
    ".....kkkkk......",
    "....kBBBBBk.....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "..wkBBBBBBBkw...",
    "..wwkSBBBSkww...",
    "...wkSSSSSkw....",
    "....kkkkkk......",
    "................",
    "................",
  ],
  extra: { y: "#f5d572", w: "#fdf3e0" },
  fill: "#efa6cf",
  shade: "#c977a6",
  face: "small",
  faceDx: 5,
  faceDy: 6,
};

const GHOST: BodyDef = {
  rows: [
    "................",
    ".....kkkkk......",
    "....kBBBBBk.....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBBBBBBBk....",
    "...kBkBBBkBk....",
    "....k.kBk.k.....",
    "......k.k.......",
    "................",
    "................",
  ],
  fill: "#dce8f4",
  shade: "#b0c4dc",
  face: "small",
  faceDx: 5,
  faceDy: 5,
};

const HUMCUBE: BodyDef = {
  rows: [
    "................",
    ".......kk.......",
    ".....kTTTTk.....",
    "...kTgTTTTTTk...",
    ".kTTgTTTTTTTTTk.",
    ".kBTTTTTTTTTTSk.",
    ".kBBBTTTTTTSSSk.",
    ".kBBBBBTTSSSSSk.",
    ".kBBBBBBiSSSSSk.",
    ".kBBBBBBiSSSSSk.",
    ".kBBBBBBiSSSSSk.",
    "..kBBBBBiSSSSk..",
    "....kBBBiSSSk...",
    "......kBSk......",
    "................",
    "................",
  ],
  extra: { k: "#3f6470", T: "#e2f6fc", g: "#ffffff", i: "#eafaff" },
  fill: "#6bb6cd",
  shade: "#a3d9ea",
  face: "small",
  faceDx: 5,
  faceDy: 8,
};

const CARROT: BodyDef = {
  rows: [
    "......L...L.....",
    "......LL.LL.....",
    ".......GGG......",
    "....kkkkkkkk....",
    "...kSBBBBBBBk...",
    "...kSBBBBBBBk...",
    "...kSBBBBBBBk...",
    "....kSBBBBBk....",
    "....kSBBBBBk....",
    ".....kSBBBk.....",
    ".....kSBBBk.....",
    "......kSBk......",
    "......kSBk......",
    ".......kk.......",
    "................",
    "................",
  ],
  extra: { L: "#8fd06a", G: "#5fa347" },
  fill: "#f08c3a",
  shade: "#d06a24",
  face: "small",
  faceDx: 5,
  faceDy: 6,
};

const COSMOS: BodyDef = {
  rows: [
    "................",
    "................",
    "................",
    ".......kk.......",
    "......kNNk...w..",
    ".....kUNNUk.....",
    "...kkUNPPNUkk...",
    ".kkUUNPPPPNUUkk.",
    "kUUNPPPPPPPPNUUk",
    ".kkUNPPPPPPNUkk.",
    "..kkUNPPPPNUkk..",
    "....kUNPPNUk....",
    ".....kUNNUk.....",
    "..w...kNNk......",
    ".......kk.......",
    "................",
  ],
  extra: {
    U: "#6a4a9e",
    N: "#e07ac2",
    P: "#f6d7ee",
    w: "#ffffff",
    k: "#241d47",
  },
  fill: "#6a4a9e",
  shade: "#4e3680",
  face: "small",
  faceDx: 6,
  faceDy: 8,
  alt: {
    rows: [
      "................",
      "................",
      "................",
      "................",
      ".............x..",
      "...w........w...",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "...w........w...",
      "..x.............",
      "................",
      "................",
    ],
    palette: { w: "#ffffff", x: "ERASE" },
  },
};

const MOLE: BodyDef = {
  rows: [
    "................",
    "................",
    ".....kkkkk......",
    "...kkBBBBBkk....",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kBBBBBBBBBk...",
    "..kSBBBBBBBSk...",
    "..kcccSSSccck...",
    "..kkkkkkkkkkk...",
    "................",
  ],
  extra: { c: "#f0dfc6" },
  faceExtra: { p: "#d7a9a4" },
  fill: "#8a7466",
  shade: "#6b584c",
  face: "mole",
  faceDx: 4,
  faceDy: 4,
  overlay: {
    rows: [
      "................",
      "................",
      "................",
      "................",
      "....www.www.....",
      "....www.www.....",
      "....www.www.....",
    ],
    palette: { w: "#dbe7ff" },
  },
};

const BODIES: Record<string, BodyDef> = {
  baby: BABY,
  child: CHILD,
  teen: TEEN,
  dog: DOG,
  blob: BLOB,
  gremlin: GREMLIN,
  scholar: SCHOLAR,
  office: OFFICE,
  menace: MENACE,
  ghost: GHOST,
  humcube: HUMCUBE,
  carrot: CARROT,
  cosmos: COSMOS,
  mole: MOLE,
};

// The egg (its own art + palette).
export const EGG_SPRITE = [
  "................",
  "......kkkk......",
  "....kkccCCkk....",
  "...kcccccccCk...",
  "..kccooccccCk...",
  "..kccccccccCk...",
  ".kcccccccccCCk..",
  ".kccccooccccCk..",
  ".kcccccccccCCk..",
  ".kccooccccccCk..",
  ".kcccccccccCCk..",
  "..kCcccccccCk...",
  "..kCCcccccCCk...",
  "...kCCCCCCCk....",
  ".....kkkkkk.....",
  "................",
];

const EGG_PALETTE: Palette = {
  k: OUTLINE,
  c: "#f7e7c4",
  C: "#e3cb98",
  o: "#c69a6a",
};

export interface PixelBuffer {
  w: number;
  h: number;
  data: Uint8ClampedArray; // RGBA
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Blit one char-grid over an RGBA buffer at an offset (later layers win).
 *  A palette entry of "ERASE" clears the pixel instead. */
function blit(buf: PixelBuffer, rows: string[], palette: Palette, dx = 0, dy = 0): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    const by = y + dy;
    if (by < 0 || by >= buf.h) continue;
    for (let x = 0; x < row.length; x++) {
      const bx = x + dx;
      if (bx < 0 || bx >= buf.w) continue;
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const color = palette[ch];
      if (!color) continue;
      const i = (by * buf.w + bx) * 4;
      if (color === "ERASE") {
        buf.data[i] = 0;
        buf.data[i + 1] = 0;
        buf.data[i + 2] = 0;
        buf.data[i + 3] = 0;
        continue;
      }
      const [r, g, b] = hexToRgb(color);
      buf.data[i] = r;
      buf.data[i + 1] = g;
      buf.data[i + 2] = b;
      buf.data[i + 3] = 255;
    }
  }
}

/** Animation micro-frames: `base` rests, `blink` closes the eyes, `glanceL`/
 *  `glanceR` slide the gaze one pixel, `alt` is a per-body pose patch (the
 *  dog's tail, mid-wag) that falls back to `base`. */
export type SpriteFrame = "base" | "blink" | "glanceL" | "glanceR" | "alt";
export const SPRITE_FRAMES: SpriteFrame[] = ["base", "blink", "glanceL", "glanceR", "alt"];

function eyeSplit(kind: FaceKind): number {
  if (kind === "standard") return 8;
  if (kind === "mole") return MOLE_EYE_ROWS;
  return 1;
}

/** The visual key for a sprite at a given stage/form. */
export function creatureKey(stage: Stage, form: AdultForm | null): string {
  if (stage === "adult" && form) return form;
  if (stage === "egg") return "egg";
  return stage;
}

/** Composite a creature into a DOM-free RGBA pixel buffer: body + mood face +
 *  overlay accessory. Pure — renderable off-screen or in tests. */
export function renderPixels(key: string, mood: Mood, frame: SpriteFrame = "base"): PixelBuffer {
  const buf: PixelBuffer = { w: CELL, h: CELL, data: new Uint8ClampedArray(CELL * CELL * 4) };
  if (key === "egg") {
    blit(buf, EGG_SPRITE, EGG_PALETTE);
    return buf;
  }
  const body = BODIES[key] ?? BODIES.baby;
  blit(buf, body.rows, { k: OUTLINE, B: body.fill, S: body.shade, ...body.extra });
  if (frame === "alt" && body.alt) blit(buf, body.alt.rows, body.alt.palette);
  if (body.overlay) {
    const isSmallOverlay = body.overlay.rows.length <= 2;
    blit(buf, body.overlay.rows, body.overlay.palette, 0, isSmallOverlay ? body.faceDy + 3 : 0);
  }
  // Face goes last so mood eyes/mouths always read over accessories.
  const facePalette = {
    ...(body.face === "small" ? { ...FACE_PALETTE, e: EYE } : FACE_PALETTE),
    ...body.faceExtra,
  };
  let rows = faceFor(body.face, mood);
  const split = eyeSplit(body.face);
  if (frame === "blink") {
    const sleep = faceFor(body.face, "sleep");
    rows = rows.map((r, i) => (i < split ? (sleep[i] ?? r) : r));
  }
  const shift = frame === "glanceL" ? -1 : frame === "glanceR" ? 1 : 0;
  if (body.face === "mole" && shift !== 0) {
    rows = [...rows];
    rows[split] = shift < 0 ? MOLE_NOSE_TIP_LEFT : MOLE_NOSE_TIP_RIGHT;
  }
  if (shift === 0) {
    blit(buf, rows, facePalette, body.faceDx, body.faceDy);
  } else {
    const shifted = rows.slice(0, split).map((r, gy) => {
      const brow = body.rows[body.faceDy + gy] ?? "";
      const cells = Array.from({ length: CELL }, () => ".");
      for (let x = 0; x < r.length; x++) {
        const ch = r[x];
        if (ch === "." || ch === " ") continue;
        const from = body.faceDx + x;
        const to = from + shift;
        const col = brow[to] === "k" ? from : to;
        if (col >= 0 && col < CELL) cells[col] = ch;
      }
      return cells.join("");
    });
    blit(buf, shifted, facePalette, 0, body.faceDy);
    blit(buf, rows.slice(split), facePalette, body.faceDx, body.faceDy + split);
  }
  return buf;
}
