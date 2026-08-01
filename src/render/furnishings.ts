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

/** Which grid to draw, and whether to flip it.
 *
 *  Total, never null: `s` is required by the type and every other facing falls
 *  back to it. That is what lets a piece ship one grid and gain the rest later
 *  — a half-authored piece draws as its front view, which is a real chair seen
 *  from the wrong side rather than a hole in the room. */
export function gridFor(art: PieceArt, facing: Facing): { grid: Grid; mirror: boolean } {
  if (facing === "s") return { grid: art.s, mirror: false };
  if (facing === "n") return art.n ? { grid: art.n, mirror: false } : { grid: art.s, mirror: false };
  if (facing === "e") return art.e ? { grid: art.e, mirror: false } : { grid: art.s, mirror: false };
  // West: an explicit grid wins, then the mirrored east view, then south.
  if (art.w) return { grid: art.w, mirror: false };
  if (art.e && art.mirrorW) return { grid: art.e, mirror: true };
  return { grid: art.s, mirror: false };
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
      const finishKey = FINISH_KEY[ch];
      const color = finishKey ? skin[finishKey] : grid.palette[ch];
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
