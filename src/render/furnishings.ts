// Furniture art — char grids rasterized against the piece's own finish.
//
// The build bar has always known what a chair looks like. Its icons are 12x12
// char grids (`content/canon/icons.ts`) and they are legible at a glance: the
// chair has legs and a back, the table has legs, the cushion is round. In the
// WORLD every one of those was a rectangle — a top surface plus a front face,
// with a handful of `fillRect` details switched on the piece id, and cushion and
// rug had no case at all. The lamp was the only thing in a furnished room that
// was not a box, and it got there by leaving the generic path entirely.
//
// So this is the icons' authoring format, at world scale. NOT the icons
// themselves, which cannot be reused: they are a 12x12 orthographic front view
// with frozen hexes, and the world is 3/4, sized to a footprint, turned four
// ways, and painted in whichever of thirteen finishes the piece wears.
//
// TWO THINGS THE ICON FORMAT DOES NOT HAVE, and both are why this module exists
// rather than a call to `gridUrl`:
//
//   1. THE FINISH. Three palette keys are reserved — `c`, `t`, `s` — and resolve
//      to the SkinDef's `color`, `top` and `shade` at raster time. Everything
//      else in a piece's palette is a literal, which is how the brass of a lamp
//      head and the paper on a notice board stay themselves in a walnut room.
//      An icon's `WOOD = "#a87c4a"` could never do that.
//   2. THE GEOMETRY. A grid is exactly the box the old code drew: `w * TILE`
//      wide and `h * TILE + height` tall, blitted at the anchor's top-left
//      lifted by the height. So art and fallback occupy the same pixels and a
//      piece can be converted one at a time.
//
// Cached per id/facing/finish and blitted once, because a chair is 480 cells and
// filling them individually every frame, for every piece in the room, is a few
// hundred thousand fills a second. Same argument grain.ts makes about
// allocation, one level up.

import type { SkinDef } from "../content/skins";
import type { Facing } from "../content/furniture";

/** Rows of single-char palette keys, top to bottom. `.` is transparent, and so
 *  is any char with no entry in the palette. Short rows are legal — the missing
 *  cells are transparent, exactly as in the icon rasterizer. */
export interface Grid {
  rows: string[];
  palette: Record<string, string>;
}

/** How a piece looks, per facing.
 *
 *  `s` is required and is the fallback for any facing not authored, so a piece
 *  can ship one grid and gain the others later without a code change. `mirrorW`
 *  says the west view is the east view flipped, which is true of anything whose
 *  silhouette is symmetric about the axis it faces along — most things — and
 *  saves authoring a second grid that would be the first one backwards. */
export interface PieceArt {
  s: Grid;
  n?: Grid;
  e?: Grid;
  w?: Grid;
  mirrorW?: boolean;
  /** Extra scene px the art may use ABOVE the box the fallback would draw, so
   *  the grid is `rise + h * TILE + height` tall and hangs that much higher.
   *
   *  This is the field that lets a piece stop being a box. `height` is where the
   *  piece's TOP SURFACE sits — a seat, a tabletop — and the old draw path had
   *  nothing above it, so a chair's back could only ever be a band painted on
   *  the far edge of its own seat. A back is not on the seat; it is over it.
   *
   *  Keep it under half a tile. `hides()` fades anything whose art overhangs by
   *  more than that, and a chair that made the player transparent when they
   *  stood behind it would be the occlusion machinery firing on the wrong
   *  furniture — roofs are meant to be its first real user. */
  rise?: number;
  /** A part of the FRONT view that moves.
   *
   *  A band of rows, and a list of replacement bands to cycle through — so the
   *  fireplace's flame can lean and change height without a second copy of the
   *  thirty rows of masonry around it, which would drift the moment either was
   *  edited. `row` is where the band starts in the `s` grid, and every frame
   *  must be exactly as many rows, each the same width as what it replaces.
   *
   *  FRONT VIEW ONLY, deliberately: it applies wherever `gridFor` chose `s`,
   *  which is the front and any facing that falls back to it. A piece whose
   *  back is authored separately (the fireplace's is a blank slab) keeps a
   *  still back, which is what it should have — there is no fire to see.
   *
   *  Everything else in a furnished room is still. Use this for a thing that is
   *  ON — a fire, not a chair. */
  anim?: {
    /** First row of the band, indexed into `s.rows`. */
    row: number;
    /** How long one frame holds. Slow: this is a cycle, not a flicker, and at
     *  60Hz an un-held frame is noise rather than a flame. */
    holdMs: number;
    /** The bands, in order. Frame 0 should be the same art the still grid has,
     *  so a piece reads identically the instant it is placed. */
    frames: string[][];
  };
}

/** The outline ink, shared with the icons for the same reason they share it:
 *  a silhouette drawn in the piece's own dark shade disappears against a wall in
 *  the same finish, which is the problem the old code solved with a flat 38%
 *  black rectangle around every box. */
export const INK = "#2b2540";

/** Palette keys that mean "ask the finish", rather than naming a colour. */
const FINISH_KEY: Record<string, keyof Pick<SkinDef, "color" | "top" | "shade">> = {
  c: "color",
  t: "top",
  s: "shade",
};

/** How dark a piece's outline is, as a fraction of its own shade. */
const OUTLINE_MIX = 0.52;

/** The outline colour for a piece in this finish.
 *
 *  `k` USED TO BE FLAT INK, and that is the single reason this furniture read
 *  heavier than the pixel art it is modelled on. A saturated navy laid round
 *  every edge of every piece is a LINE somebody drew; the same edge in a dark
 *  version of the object's own timber is a SHADOW, and a shadow is what an edge
 *  actually is. It is the difference between a sticker and a thing in a room.
 *
 *  Derived from `shade` rather than authored per finish, so a walnut chair
 *  outlines in dark walnut and a pine one in dark pine without anybody keeping
 *  thirteen extra hexes in step — the same argument `c`/`t`/`s` already make.
 *
 *  THE UI ICONS ARE NOT TOUCHED and must not be: `content/icons.ts` requires a
 *  shared outline ink precisely so a row of them reads as one set, and an icon
 *  that outlined in its own material would look pasted in from elsewhere. That
 *  rule is about a strip of 12px glyphs on a bar; this is about objects standing
 *  in a lit room, and they want opposite things. */
function outlineFor(skin: SkinDef): string {
  const n = parseInt(skin.shade.slice(1), 16);
  if (!Number.isFinite(n)) return skin.shade;
  const r = Math.round(((n >> 16) & 255) * OUTLINE_MIX);
  const g = Math.round(((n >> 8) & 255) * OUTLINE_MIX);
  const b = Math.round((n & 255) * OUTLINE_MIX);
  return `rgb(${r},${g},${b})`;
}

/** Which grid to draw, and whether to flip it.
 *
 *  Total, never null: `s` is required by the type and every other facing falls
 *  back to it. That is what lets a piece ship one grid and gain the rest later
 *  — a half-authored piece draws as its front view, which is a real chair seen
 *  from the wrong side rather than a hole in the room.
 *
 *  `frame` picks an `anim` band and is ignored by everything without one, which
 *  is every piece but the fireplace. It only ever reaches the front view — see
 *  `PieceArt.anim`. */
export function gridFor(art: PieceArt, facing: Facing, frame = 0): { grid: Grid; mirror: boolean } {
  const front = animated(art, frame);
  if (facing === "s") return { grid: front, mirror: false };
  if (facing === "n") return art.n ? { grid: art.n, mirror: false } : { grid: front, mirror: false };
  if (facing === "e") return art.e ? { grid: art.e, mirror: false } : { grid: front, mirror: false };
  // West: an explicit grid wins, then the mirrored east view, then south.
  if (art.w) return { grid: art.w, mirror: false };
  if (art.e && art.mirrorW) return { grid: art.e, mirror: true };
  return { grid: front, mirror: false };
}

/** Spliced front views, per piece, built once each and then handed back.
 *
 *  `gridFor` runs for every piece EVERY FRAME, and the raster cache below only
 *  saves the fills — a fresh `rows` array per call would allocate a few hundred
 *  arrays a second for one fireplace. Same argument as the raster cache, one
 *  step earlier: the frames are a fixed, tiny set, so build them all once. */
const frameCache = new WeakMap<PieceArt, Grid[]>();

/** The front view at a frame — the still `s` grid for anything unanimated, and
 *  for a piece with `anim`, that grid with its band swapped out. */
function animated(art: PieceArt, frame: number): Grid {
  const anim = art.anim;
  if (!anim) return art.s;

  let built = frameCache.get(art);
  if (!built) {
    built = anim.frames.map((band) => ({
      ...art.s,
      rows: art.s.rows.map((row, i) => band[i - anim.row] ?? row),
    }));
    frameCache.set(art, built);
  }
  // Modulo, not a clamp: the caller counts frames off a clock that never stops.
  return built[((frame % built.length) + built.length) % built.length];
}

const cache = new Map<string, HTMLCanvasElement>();

/** Rasterize a grid at one scene pixel per cell, painted for one finish.
 *
 *  `key` must vary with everything that changes the pixels — the piece, the
 *  facing and the FINISH — or a walnut chair gets served the pine one. That is
 *  the whole reason this cache is keyed on three things and the icon cache on
 *  one: an icon has no finish to vary by. */
export function pieceCanvas(key: string, grid: Grid, skin: SkinDef, mirror: boolean): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;

  const h = grid.rows.length;
  const w = grid.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  for (let y = 0; y < h; y++) {
    const row = grid.rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      // `k` is resolved from the SKIN, not from the grid's palette — see
      // `outlineFor`. The palettes still declare `k: INK`, which is now
      // documentation of intent rather than the value used; every piece wants an
      // outline and this is what an outline is made of.
      const finishKey = FINISH_KEY[ch];
      const color = ch === "k" ? outlineFor(skin) : finishKey ? skin[finishKey] : grid.palette[ch];
      if (!color) continue; // undeclared chars are transparent, like "."
      ctx.fillStyle = color;
      ctx.fillRect(mirror ? w - 1 - x : x, y, 1, 1);
    }
  }

  cache.set(key, canvas);
  return canvas;
}

/** Drop every raster. For tests, and for anything that invalidates the palette. */
export function clearPieceCache(): void {
  cache.clear();
}
