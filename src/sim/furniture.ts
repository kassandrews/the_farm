// Placing and reading furniture — the things you put IN a room.
//
// Furniture is its own layer rather than more rows in `world.build`, because it
// answers different questions: pieces are MULTI-TILE, they have a FACING, they
// never seal a room, and they never autotile. Walls and furniture only look
// alike from far away.
//
// A piece is stored ONCE, at its anchor (the north-west cell of its footprint).
// There is deliberately no second "these cells are occupied" map: two records of
// the same fact drift apart, and the drift shows up as furniture you can walk
// through or ground you can't build on for no visible reason. Instead, "what is
// on this cell" searches the handful of cells an anchor could possibly be in —
// bounded by MAX_SPAN, so it's a fixed four lookups, not a scan.

import type { WorldState, FurnitureCell } from "./types";
import type { FurnitureId, Facing } from "../content/furniture";
import { furnitureDef, footprint, covers, MAX_SPAN } from "../content/furniture";
import type { SkinId } from "../content/skins";
import { tileAt, tileKey } from "./world";
import { tileDef } from "../content/tiles";

export interface PlacedFurniture {
  /** Anchor cell — where the piece is stored, and where the renderer draws from. */
  ax: number;
  ay: number;
  cell: FurnitureCell;
}

/** The piece covering this cell, or null. Searches only the cells an anchor
 *  could occupy given the largest footprint in the table. */
export function furnitureAt(world: WorldState, x: number, y: number): PlacedFurniture | null {
  for (let ay = y - MAX_SPAN + 1; ay <= y; ay++) {
    for (let ax = x - MAX_SPAN + 1; ax <= x; ax++) {
      const cell = world.furniture[tileKey(ax, ay)];
      if (!cell) continue;
      if (covers(ax, ay, furnitureDef(cell.id), cell.facing, x, y)) return { ax, ay, cell };
    }
  }
  return null;
}

/** Every cell a piece anchored here would occupy. */
export function cellsFor(ax: number, ay: number, id: FurnitureId, facing: Facing): [number, number][] {
  const { w, h } = footprint(furnitureDef(id), facing);
  const out: [number, number][] = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) out.push([ax + dx, ay + dy]);
  }
  return out;
}

/** Can this piece go here? Every cell of its footprint has to be clear — of
 *  solid ground, of crops, of walls, and of other furniture. A multi-tile piece
 *  that could be placed half-overlapping something would be a piece you could
 *  never remove cleanly. */
export function canPlaceFurniture(
  world: WorldState,
  ax: number,
  ay: number,
  id: FurnitureId,
  facing: Facing,
): boolean {
  for (const [x, y] of cellsFor(ax, ay, id, facing)) {
    const key = tileKey(x, y);
    if (tileDef(tileAt(world, x, y)).solid) return false;
    if (world.crops[key]) return false;
    if (world.build[key]) return false; // no furniture inside a wall
    if (furnitureAt(world, x, y)) return false;
  }
  return true;
}

/** Put a piece down at an anchor. Returns false and changes nothing when it
 *  won't fit. */
export function placeFurniture(
  world: WorldState,
  ax: number,
  ay: number,
  id: FurnitureId,
  facing: Facing,
  finish: SkinId,
): boolean {
  if (!canPlaceFurniture(world, ax, ay, id, facing)) return false;
  world.furniture[tileKey(ax, ay)] = { id, facing, finish };
  return true;
}

/** Take back whatever covers this cell — you point at any part of a bed, not
 *  just its corner. Returns the piece so the caller can refund it exactly. */
export function removeFurnitureAt(world: WorldState, x: number, y: number): FurnitureCell | null {
  const found = furnitureAt(world, x, y);
  if (!found) return null;
  delete world.furniture[tileKey(found.ax, found.ay)];
  return found.cell;
}

/** Is this cell blocked by furniture standing on it? */
export function furnitureBlocks(world: WorldState, x: number, y: number): boolean {
  const found = furnitureAt(world, x, y);
  return found !== null && furnitureDef(found.cell.id).solid;
}
