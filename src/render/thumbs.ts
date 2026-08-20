// Portraits of buildable things, for the catalogue tiles in the build menu.
//
// THE TILE IS THE GAME'S OWN PIXELS, not a picture of them. The build bar's
// 12x12 icons are hand-drawn and say what a CATEGORY is — "this button places
// chairs" — which is the right job for a button that never changes. A catalogue
// says which chair, and the moment there are four of them the drawing has to
// agree with the piece exactly, in the finish you are holding, or the menu is
// lying about the thing it is selling. So a thumb is the same raster the world
// draws, blitted at an integer scale into a small canvas.
//
// Consequences that make this cheap rather than clever:
//
//   • `pieceCanvas` already caches per id/facing/finish, so the first tile of a
//     walnut chair costs one rasterize and every later one costs a blit.
//   • New art needs no new thumb. A piece converted from the fallback box to a
//     grid changes its tile the same day it changes in the room.
//   • The finish is a parameter, so a row of tiles repaints when you pick ash,
//     and what you see is what lands on the floor.
//
// INTEGER SCALE ONLY (CLAUDE.md §Sprite rendering). The art is doubled by a
// whole number and then sits at its own size in a box sized to the largest piece
// there is (`thumbBox`) — never fitted to the box. Fitting is a fractional
// scale wearing a CSS property's name, and it cost one revision of this file:
// `object-fit: contain` gave the sofa a doubled outline and the bench a missing
// row. A stool therefore looks small and a wardrobe looks big, which is the
// truth about them.

import { SET_ART, artFor } from "../content/sets";
import type { SetId } from "../content/sets";
import { FURNITURE, furnitureDef, type FurnitureId, type Facing } from "../content/furniture";
import { skinDef, type SkinId } from "../content/skins";
import { gridFor, pieceCanvas } from "./furnishings";
import { forEachGrainMark, GRAIN } from "./grain";
import { mixHex } from "./palette";

/** Scene px per world tile — the renderer's own TILE, which the art is authored
 *  against. Repeated rather than exported from renderer.ts because that module
 *  pulls in the whole scene, and a thumb needs one number from it. */
const TILE = 16;
/** A wall's height and the lit strip along its top, the renderer's own numbers,
 *  repeated for the same reason TILE is. A wall swatch is a piece of wall, so it
 *  is exactly one storey tall and wears its cap. */
const STOREY = 24;
const WALL_CAP = 3;

/** The swatch box, in scene px: two tiles across, one storey tall.
 *
 *  TWO TILES, and the width is doing real work. A board butts every 47px against
 *  a flagstone's 9, and that difference is most of what tells the two surfaces
 *  apart — so a swatch narrow enough to miss the joints shows boards and
 *  flagstones as two colours. At 16px wide, the stepped bond puts a joint inside
 *  only one course in three; at 32 it puts one in every course (asserted in
 *  thumbs.test.ts). It is the same arithmetic the floor pass reasons about when
 *  it withholds joints from a lone tile — 16px is not long enough to have a
 *  joint in — read from the other end.
 *
 *  One storey tall so the wall swatch is a wall rather than a crop of one, and
 *  the floor swatch shares the box so a row of both sits on one line. */
const SWATCH_W = 2 * TILE;
const SWATCH_H = STOREY;

const urls = new Map<string, string>();

/** A furniture piece as a data URL, drawn at `scale` device px per scene px.
 *
 *  Cached on everything that changes the pixels — piece, facing, finish, scale.
 *  The facing is a parameter rather than always `s` because the catalogue is
 *  where you choose a piece, and the piece you are about to place is turned the
 *  way the rotate button says. A tile showing the front of a wardrobe you are
 *  about to put against the north wall is a small lie of exactly the kind this
 *  module exists to stop. */
export function furnitureThumb(
  id: FurnitureId,
  facing: Facing,
  finish: SkinId,
  scale: number,
  set: SetId = "core",
): string {
  const key = `${id}:${set}:${facing}:${finish}@${scale}`;
  const hit = urls.get(key);
  if (hit) return hit;

  const def = furnitureDef(id);
  const art = artFor(id, set);
  const canvas = document.createElement("canvas");

  // The box the world would give this piece: its footprint, plus how far it
  // stands off the floor, plus whatever the art reaches above that. Identical to
  // the arithmetic in renderer.ts's furniture pass, and deliberately so — a
  // thumb sized by anything else would crop the tall pieces or float the short
  // ones.
  const turned = facing === "e" || facing === "w";
  const w = (turned ? def.h : def.w) * TILE;
  const h = (turned ? def.w : def.h) * TILE + def.height;

  if (art) {
    const { grid, mirror } = gridFor(art, facing);
    const rise = art.rise ?? 0;
    // THE SET BELONGS IN THIS KEY, not only in the url key above. `pieceCanvas`
    // memoizes on the string it is handed, so a key without the set hands the
    // first-rasterized set's picture to every other one — which is invisible
    // while a form has one tile on screen and glaring the moment *all* puts
    // core's chair and moderne's chair side by side and draws the same chair
    // twice.
    const raster = pieceCanvas(`${id}:${set}:${facing}:${finish}`, grid, skinDef(finish), mirror);
    canvas.width = raster.width * scale;
    canvas.height = raster.height * scale;
    const ctx = canvas.getContext("2d")!;
    // Nearest-neighbour and an integer factor, which together are the whole of
    // the sprite rule: every source pixel lands on the same number of device
    // pixels, so no row of an outline doubles or vanishes.
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(raster, 0, 0, canvas.width, canvas.height);
    void rise; // the grid already carries it; the box above is for the fallback
  } else {
    // A piece with no art yet gets the box the renderer would draw it as, in its
    // own finish. Not a placeholder glyph and not an empty tile: the fallback
    // box IS what that piece looks like in the room today, and a catalogue that
    // hid it would be hiding the game's actual state from the person building.
    const skin = skinDef(finish);
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = skin.color;
    ctx.fillRect(0, def.height * scale, w * scale, (h - def.height) * scale);
    ctx.fillStyle = skin.top;
    ctx.fillRect(0, 0, w * scale, def.height * scale);
    ctx.fillStyle = skin.shade;
    ctx.fillRect(0, (h - 2) * scale, w * scale, 2 * scale);
  }

  const url = canvas.toDataURL();
  urls.set(key, url);
  return url;
}

/** A patch of laid floor or standing wall in `finish`, as a data URL.
 *
 *  THE SWATCH IS THE SURFACE, not a colour chip of it. The finish row this
 *  replaced showed an 18px square of `skin.color` beside a name, which is enough
 *  to tell walnut from pine and cannot tell BOARDS from FLAGSTONES — and that is
 *  the difference the player is actually choosing between when they open the
 *  floor menu. Granite and slate are two grey squares; grained, one is a floor
 *  laid in nine-pixel stones and the other is a floor laid in nine-pixel stones
 *  of a different grey, which is at least the truth.
 *
 *  It is the renderer's own arithmetic, deliberately — the same GRAIN table, the
 *  same fill-then-grain-then-cap order, the same coprime periods (render/grain.ts).
 *  The one thing it cannot share is the world: a swatch has no neighbours, so it
 *  is grained from world origin (0,0) and always jointed. A floor tile in game
 *  withholds its joints when nothing runs on beside it; a swatch is showing you
 *  what a RUN of this material looks like, and a run has joints.
 *
 *  Integer scale only, like every other thumb here (CLAUDE.md §Sprite rendering).
 *  The marks are 1px lines; at a fractional scale they land between device pixels
 *  and a floor's seams come back doubled in places and missing in others. */
export function surfaceThumb(kind: "floor" | "wall", finish: SkinId, scale: number): string {
  const key = `surface:${kind}:${finish}@${scale}`;
  const hit = urls.get(key);
  if (hit) return hit;

  const skin = skinDef(finish);
  const g = GRAIN[skin.applies];
  const canvas = document.createElement("canvas");
  canvas.width = SWATCH_W * scale;
  canvas.height = SWATCH_H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = skin.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (g) {
    const seam = mixHex(skin.color, { color: "#000000", amount: g.seam });
    const joint = mixHex(skin.color, { color: "#000000", amount: g.joint_ink });
    // A wall face is planking stood on end in wood and horizontal masonry in
    // stone, and that difference is most of what makes a stone wall read as
    // stone at this size — so the swatch has to make it too, or the menu shows
    // two colours where the wall shows two materials. Straight off the wall
    // pass in renderer.ts, including the `wy` trick: the courses are measured
    // from the top of the FACE, not from the world row, because every wall in
    // the game stands the same height.
    const stone = skin.applies === "stone";
    const cap = kind === "wall" ? WALL_CAP : 0;
    forEachGrainMark(
      {
        wx: 0,
        wy: cap,
        w: SWATCH_W,
        h: SWATCH_H - cap,
        axis: kind === "wall" && !stone ? "v" : "h",
        course: g.course,
        joint: kind === "wall" && !stone ? null : g.joint,
        bond: g.bond,
      },
      (mx, my, mw, mh, ink) => {
        ctx.fillStyle = ink === "seam" ? seam : joint;
        ctx.fillRect(mx * scale, (my + cap) * scale, mw * scale, mh * scale);
      },
    );
  }

  // The lit top, last, over the grain — a wall is seen from slightly above and
  // the cap is the part of it you look down on. A floor has no cap: you are
  // already looking at its top.
  if (kind === "wall") {
    ctx.fillStyle = skin.top;
    ctx.fillRect(0, 0, canvas.width, WALL_CAP * scale);
  }

  const url = canvas.toDataURL();
  urls.set(key, url);
  return url;
}

/** The swatch box at `scale`, for the CSS that lays the buttons out — the same
 *  ask-the-content move `thumbBox` makes for the catalogue tiles. */
export function swatchBox(scale: number): { w: number; h: number } {
  return { w: SWATCH_W * scale, h: SWATCH_H * scale };
}

/** The largest thumb any piece produces in any facing, at `scale`.
 *
 *  DERIVED, NOT MEASURED BY EYE. The tiles are a fixed box with the art sitting
 *  on its floor line, so the box has to clear the biggest thing in the table —
 *  and "the biggest thing" is not the piece with the biggest footprint. Today it
 *  is the sofa TURNED, at 64×104, because turning swaps `w` and `h` and a
 *  two-tile couch seen end-on is the tallest silhouette in the game. That is not
 *  a fact anyone would arrive at by looking at the table, and a hardcoded 84
 *  from the south-facing pass is precisely what shipped a dresser overflowing
 *  its own tile.
 *
 *  So the HUD asks the content, and the day a four-tile piece lands the tiles
 *  grow to fit it without anyone remembering to. Cheap enough to call once at
 *  startup: it reads row counts, and rasterizes nothing. */
export function thumbBox(scale: number): { w: number; h: number } {
  let w = 0;
  let h = 0;
  for (const id of Object.keys(FURNITURE) as FurnitureId[]) {
    const def = FURNITURE[id];
    // EVERY SET, and not only core. The tile has to clear the biggest drawing in
    // the whole catalogue, and a set is a free hand at the silhouette — the day
    // one of them draws a taller wardrobe, the HUD grows to fit it without
    // anybody remembering to, which is this function's whole argument one axis
    // further out.
    for (const table of Object.values(SET_ART)) {
      const art = table[id];
      for (const facing of ["s", "n", "e", "w"] as Facing[]) {
        if (art) {
          const { grid } = gridFor(art, facing);
          w = Math.max(w, grid.rows.reduce((m, r) => Math.max(m, r.length), 0));
          h = Math.max(h, grid.rows.length);
        } else {
          const turned = facing === "e" || facing === "w";
          w = Math.max(w, (turned ? def.h : def.w) * TILE);
          h = Math.max(h, (turned ? def.w : def.h) * TILE + def.height);
        }
      }
    }
  }
  return { w: w * scale, h: h * scale };
}

/** Drop every thumb. For tests, and for anything that invalidates the art. */
export function clearThumbCache(): void {
  urls.clear();
}
