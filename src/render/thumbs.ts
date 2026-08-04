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

import { FURNITURE_ART } from "../content/furnishings";
import { FURNITURE, furnitureDef, type FurnitureId, type Facing } from "../content/furniture";
import { skinDef, type SkinId } from "../content/skins";
import { gridFor, pieceCanvas } from "./furnishings";

/** Scene px per world tile — the renderer's own TILE, which the art is authored
 *  against. Repeated rather than exported from renderer.ts because that module
 *  pulls in the whole scene, and a thumb needs one number from it. */
const TILE = 16;

const urls = new Map<string, string>();

/** A furniture piece as a data URL, drawn at `scale` device px per scene px.
 *
 *  Cached on everything that changes the pixels — piece, facing, finish, scale.
 *  The facing is a parameter rather than always `s` because the catalogue is
 *  where you choose a piece, and the piece you are about to place is turned the
 *  way the rotate button says. A tile showing the front of a wardrobe you are
 *  about to put against the north wall is a small lie of exactly the kind this
 *  module exists to stop. */
export function furnitureThumb(id: FurnitureId, facing: Facing, finish: SkinId, scale: number): string {
  const key = `${id}:${facing}:${finish}@${scale}`;
  const hit = urls.get(key);
  if (hit) return hit;

  const def = furnitureDef(id);
  const art = FURNITURE_ART[id];
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
    const raster = pieceCanvas(`${id}:${facing}:${finish}`, grid, skinDef(finish), mirror);
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
    const art = FURNITURE_ART[id];
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
  return { w: w * scale, h: h * scale };
}

/** Drop every thumb. For tests, and for anything that invalidates the art. */
export function clearThumbCache(): void {
  urls.clear();
}
