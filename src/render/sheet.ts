// The survey sheet — the Bureau's regional map, in the corner of the screen.
//
// THIS FEATURE OVERTURNED A SETTLED REFUSAL, and it is built to be taken back
// out. DESIGN §"The plaza is the datum" said there would never be a minimap, for
// two reasons that were not the same reason:
//
//   1. A map would show you the grove and the humming cube. TRUE, and answered
//      structurally rather than by care — `sheetRegionAt` cannot see a prop, a
//      node, a structure or a found place, so no amount of drawing code here can
//      put one on the page. Read its docblock before changing what this samples;
//      `biomeAt` is the obvious substitution and it leaks the blossom.
//   2. The world should stay explored rather than routed. NOT answered. Giving
//      this up was a deliberate call: a region is scenery rather than content, so
//      steering at the strange country gets you strange scenery, and the far
//      country being unreachable-by-accident was judged to cost more.
//
// Reason 2 is a judgement about how it FEELS to play, which is the one kind of
// question a doc cannot settle. So the whole feature is this file, one canvas in
// the HUD, one CSS block and one call in the frame loop — and it stores NOTHING
// IN THE SAVE, which is the part that makes reverting free. Ripping it out is a
// delete and a doc revert, with no migration owed to anybody living in a town.
//
// NOTHING BUT REGIONS, YOUR POSITION AND THE DATUM MAY EVER BE DRAWN HERE. Not a
// found place, not a villager, not a node, not a shaft, not a house. The rule is
// absolute because the defence is structural: the moment this file imports
// something that knows where a secret is, the argument that lets it exist is
// gone.

import { BIOMES, type BiomeId } from "../content/biomes";
import { GRASS, tileDef } from "../content/tiles";
import { seasonOn } from "../content/seasons";
import { mixHex } from "./palette";
import { sheetRegionAt } from "../sim/world";
import type { HomesteadSpot } from "../sim/types";

/** Source pixels across. The canvas is rendered at exactly this and upscaled by
 *  a WHOLE number in CSS — the sheet is not sprite art, but it is drawn on the
 *  same grid as everything else and a fractional scale would soften the region
 *  edges into exactly the mush this has to avoid. */
export const SHEET_PX = 72;

/** World tiles per sheet pixel.
 *
 *  Eight is chosen against BIOME_CELL (68), not against the screen: a region is
 *  about eight and a half pixels across here, so the sheet shows roughly seven
 *  regions edge to edge and a region reads as a SHAPE rather than as a dot or as
 *  a wall of one colour. Drop it much below this and the sheet becomes one
 *  region; raise it and the shapes turn to noise. */
export const TILES_PER_PX = 8;

const HALF = SHEET_PX / 2;

/** The colour a region takes on the sheet.
 *
 *  DERIVED, because a biome states a TINT and never a colour (content/biomes.ts,
 *  and it is a rule with a reason: tint is what lets biome and season compose
 *  instead of overriding). So the swatch is this season's grass pulled the way
 *  the region pulls it — the same `mixHex` the ground itself goes through, which
 *  is why the sheet's greens are the greens you are standing on and why the map
 *  turns over in autumn along with the world.
 *
 *  The meadow's tint is `amount: 0`, so the town's own region is plain grass and
 *  every other region reads as a departure from it. That is the same baseline
 *  argument the season table makes about summer. */
export function regionSwatch(id: BiomeId, now: number): string {
  const season = seasonOn(now);
  const base = season.ground[GRASS]?.color ?? tileDef(GRASS).color;
  return mixHex(base, BIOMES[id].ground);
}

/** Repaint the sheet, centred on the tile the player is standing on.
 *
 *  Called only when the player has crossed a whole sheet pixel or the season has
 *  turned — see `sheetKey`. At eight tiles to the pixel there is nothing to show
 *  for a smaller move, so this is not an optimisation that costs accuracy. */
export function drawSheet(
  ctx: CanvasRenderingContext2D,
  seed: number,
  spot: HomesteadSpot,
  cx: number,
  cy: number,
  now: number,
): void {
  // One lookup per region rather than per pixel: there are six regions and five
  // thousand pixels, and `mixHex` parses two hex strings every time.
  const swatch = new Map<BiomeId, string>();

  for (let py = 0; py < SHEET_PX; py++) {
    for (let px = 0; px < SHEET_PX; px++) {
      const wx = cx + (px - HALF) * TILES_PER_PX;
      const wy = cy + (py - HALF) * TILES_PER_PX;
      const id = sheetRegionAt(seed, spot, wx, wy);
      let fill = swatch.get(id);
      if (fill === undefined) {
        fill = regionSwatch(id, now);
        swatch.set(id, fill);
      }
      ctx.fillStyle = fill;
      ctx.fillRect(px, py, 1, 1);
    }
  }

  // The datum — the peg in the plaza, which is the one mark that makes this
  // sheet useful for getting home and the reason the survey chip exists at all.
  // A cross rather than a dot, because a dot at this scale is indistinguishable
  // from a one-pixel region and there are no labels to tell you otherwise.
  const dx = Math.round(HALF - cx / TILES_PER_PX);
  const dy = Math.round(HALF - cy / TILES_PER_PX);
  if (dx >= 0 && dx < SHEET_PX && dy >= 0 && dy < SHEET_PX) {
    ctx.fillStyle = "#2b2540";
    ctx.fillRect(dx - 2, dy, 5, 1);
    ctx.fillRect(dx, dy - 2, 1, 5);
  }

  // You. Always dead centre, because the sheet is centred on you — so this is
  // not a position readout, it is the anchor the rest of the page is relative
  // to. Ringed in the panel's paper so it stays legible on a dark region;
  // without the ring it vanished entirely in the dusk wood.
  ctx.fillStyle = "#f4ecdd";
  ctx.fillRect(HALF - 2, HALF - 2, 5, 5);
  ctx.fillStyle = "#c98a3a";
  ctx.fillRect(HALF - 1, HALF - 1, 3, 3);
}

/** What the drawn sheet depends on. Rebuild when this changes and not otherwise.
 *
 *  Quantised to the sheet pixel, so walking eight tiles is what moves the map by
 *  one — the same reason the survey chip reads off the tile and not off
 *  `player.x`: a map that redrew every frame would shimmer while you stood
 *  still, and five thousand region lookups per frame is not affordable anyway. */
export function sheetKey(cx: number, cy: number, now: number): string {
  const gx = Math.floor(cx / TILES_PER_PX);
  const gy = Math.floor(cy / TILES_PER_PX);
  return `${gx},${gy},${seasonOn(now).id}`;
}
