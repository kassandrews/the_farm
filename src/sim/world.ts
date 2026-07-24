// The chunked tilemap. Nothing may assume a fixed world size (CLAUDE.md): the
// surface is generated lazily and deterministically from the seed, and the only
// stored terrain is the sparse set of player/town EDITS layered on top. That
// keeps saves tiny and away-sim honest — an unedited tile is always whatever
// generation says, forever.
//
// Layers: this slice ships the surface. The underground layer is future work
// (DESIGN); the generator is written so a `layer` axis can be added without
// reshaping callers.

import type { TileId } from "../content/tiles";
import { GRASS, STONE, WATER, DIRT, FARMLAND, FARMLAND_WET, tileDef } from "../content/tiles";
import type { WorldState, HomesteadSpot } from "./types";
import { hash2 } from "./rng";

export const CHUNK = 16; // tiles per chunk edge — chunks are a render/streaming unit

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

// --- Town layout --------------------------------------------------------------
// The town pre-exists around the origin (DESIGN §"Town and homestead"): a stone
// plaza with the town hall at its north edge. The player's homestead is a plot
// off to the +x/+y (south-east). These are the fixed anchors the generator and
// the cast positions share.
export const PLAZA = { x0: -5, y0: -5, x1: 5, y1: 3 }; // inclusive stone rectangle
export const HOME = { x: 6, y: 5 }; // homestead origin (tent sits here-ish)

/** Deterministic base terrain at a surface tile, before any edits. The plaza is
 *  paved; a river runs down the west side for the "riverside" flavour; the rest
 *  is grass with the odd generated water tile left out for now. */
export function generatedTile(_seed: number, spot: HomesteadSpot, x: number, y: number): TileId {
  // Plaza paving.
  if (x >= PLAZA.x0 && x <= PLAZA.x1 && y >= PLAZA.y0 && y <= PLAZA.y1) return STONE;
  // A river along the far west, so the riverside homestead reads true.
  if (spot === "riverside" && x <= -12 && (x + ((y * 3) % 2)) % 7 !== 0) {
    if (x <= -13) return WATER;
  }
  return GRASS;
}

/** The effective surface tile: a player/town edit wins, else generation. */
export function tileAt(world: WorldState, x: number, y: number): TileId {
  const edit = world.overrides[tileKey(x, y)];
  if (edit !== undefined) return edit;
  return generatedTile(world.seed, world.homestead.spot, x, y);
}

/** Write an edit (dig/place/till). Writing the tile that generation would
 *  already produce clears the override instead, so saves don't accumulate
 *  no-op edits. */
export function setTile(world: WorldState, x: number, y: number, id: TileId): void {
  const base = generatedTile(world.seed, world.homestead.spot, x, y);
  const k = tileKey(x, y);
  if (id === base) delete world.overrides[k];
  else world.overrides[k] = id;
}

/** Is this tile walkable? Solid tiles (water, and later structures) block. */
export function isWalkable(world: WorldState, x: number, y: number): boolean {
  return !tileDef(tileAt(world, x, y)).solid;
}

/** A cheap per-tile decoration hash (0..1) the renderer uses for grass tufts
 *  and plaza speckle — stable, so scenery doesn't shimmer between frames. */
export function decoHash(x: number, y: number, seed: number): number {
  return hash2(x, y, seed) / 4294967296;
}

// --- Terrain verbs (the two placeable tile types + tilling) ------------------
// These enforce what a tool is allowed to do; the game layer calls them from
// the action button. Each returns whether it changed anything (for feedback).

/** Shovel: grass → dug dirt. */
export function dig(world: WorldState, x: number, y: number): boolean {
  if (tileAt(world, x, y) !== GRASS) return false;
  setTile(world, x, y, DIRT);
  return true;
}

/** Place a wood plank on any non-solid, non-planted ground. */
export function placePlank(world: WorldState, x: number, y: number): boolean {
  const t = tileAt(world, x, y);
  if (tileDef(t).solid) return false;
  if (world.crops[tileKey(x, y)]) return false; // don't pave over a plant
  setTile(world, x, y, 2 /* PLANK */);
  return true;
}

/** Till grass/dirt into farmland (the first half of planting). */
export function till(world: WorldState, x: number, y: number): boolean {
  const t = tileAt(world, x, y);
  if (t === GRASS || t === DIRT) {
    setTile(world, x, y, FARMLAND);
    return true;
  }
  return false;
}

export { FARMLAND, FARMLAND_WET };
