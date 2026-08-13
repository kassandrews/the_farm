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
//
// THAT RULE IS ABOUT ONE PIECE, not one cell. A rug and the table standing on
// it are two pieces sharing a cell, which is the whole point of a rug, and the
// invariant survives by giving the floor its own record: each record still says
// "one cell, one piece", and neither can see the other. `floorAt` is the second
// record's `furnitureAt`; `anyFurnitureAt` is for the few callers that mean "is
// this cell spoken for at all". See types.ts §floor.
//
// There are TWO of those records now, one per layer, and `layer` is the last
// argument everywhere with "surface" as its default. That is deliberate rather
// than tidy: furniture is a surface idea in every module that reads it except
// the single tool that isn't one (the lamp), so the default keeps every existing
// caller both unchanged and correct. See types.ts §underFurniture.
//
// Both mutations here call `touchBuild`. That is not a favour to the structure
// layer: villager routes are memoised against that counter and `isWalkable`
// counts solid furniture, so a table dropped across a corridor invalidates a
// route exactly as a wall does. Placement does NOT check whether the piece is
// solid or which layer it went on before announcing — that would buy a bounded
// flood fill with a second rule about when invalidation matters, and the wrong
// version of that rule is invisible until somebody walks through a table.

import type { WorldState, FurnitureCell, Layer } from "./types";
import type { FurnitureId, Facing } from "../content/furniture";
import { furnitureDef, footprint, covers, MAX_SPAN } from "../content/furniture";
import type { SkinId } from "../content/skins";
import { defaultSkin } from "../content/skins";
import type { SetId } from "../content/sets";
import { tileAt, tileKey, refusesConstruction, refusesFooting } from "./world";
import { touchBuild } from "./structures";
import { overhead } from "../content/structures";
import { tileDef } from "../content/tiles";

export interface PlacedFurniture {
  /** Anchor cell — where the piece is stored, and where the renderer draws from. */
  ax: number;
  ay: number;
  cell: FurnitureCell;
}

/** The record for a layer. Two records, picked here, exactly as `editsFor` picks
 *  between `overrides` and `under` in sim/world.ts — see types.ts for why the
 *  underground got its own object rather than a prefix on the keys.
 *
 *  Every function below takes `layer` LAST and defaults it to "surface", which
 *  is what let the underground arrive without touching a single existing caller:
 *  furniture is a surface idea everywhere except the one tool that isn't. */
export function furnitureFor(world: WorldState, layer: Layer): Record<string, FurnitureCell> {
  return layer === "under" ? world.underFurniture : world.furniture;
}

/** What is LAID on this cell, or null — the floor record's `furnitureAt`.
 *
 *  A separate function rather than a third value of `layer`, because it is not a
 *  layer: `layer` picks which WORLD you are in, and both of these are the
 *  surface. This picks which of two things sharing a cell you mean. Callers that
 *  want "what is standing here" must not silently start getting rugs.
 *
 *  Same bounded search as `furnitureAt`, and for the same reason — a rug is 2x2,
 *  so the cell you point at may be three cells from the anchor that holds it. */
export function floorAt(world: WorldState, x: number, y: number): PlacedFurniture | null {
  for (let ay = y - MAX_SPAN + 1; ay <= y; ay++) {
    for (let ax = x - MAX_SPAN + 1; ax <= x; ax++) {
      const cell = world.floor[tileKey(ax, ay)];
      if (!cell) continue;
      if (covers(ax, ay, furnitureDef(cell.id), cell.facing, x, y)) return { ax, ay, cell };
    }
  }
  return null;
}

/** Is anything at all on this cell — standing OR laid?
 *
 *  For the callers that mean "is this cell spoken for" rather than "what is
 *  standing here": siting a commissioned house, stamping the town, and anything
 *  else that needs a genuinely empty cell. They are the minority, which is why
 *  this is named and not the default. */
export function anyFurnitureAt(world: WorldState, x: number, y: number): PlacedFurniture | null {
  return furnitureAt(world, x, y) ?? floorAt(world, x, y);
}

/** The piece covering this cell, or null. Searches only the cells an anchor
 *  could occupy given the largest footprint in the table. */
export function furnitureAt(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): PlacedFurniture | null {
  const record = furnitureFor(world, layer);
  for (let ay = y - MAX_SPAN + 1; ay <= y; ay++) {
    for (let ax = x - MAX_SPAN + 1; ax <= x; ax++) {
      const cell = record[tileKey(ax, ay)];
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
  layer: Layer = "surface",
  /** An anchor to pretend is empty — the piece BEING MOVED (see `moveFurniture`).
   *
   *  Without it nothing could ever be nudged one tile: a 2x2 rug shifted east
   *  overlaps three of its own cells, and the piece would refuse to move on the
   *  grounds that it is already there. Passing the anchor rather than a flag,
   *  because "ignore whatever is under me" would also ignore the OTHER piece
   *  standing on the destination, which is the collision that must still bite. */
  ignore?: { ax: number; ay: number },
): boolean {
  // A WALL-MOUNTED piece inverts every test below rather than skipping them.
  // The floor rows refuse a cell that already holds a wall ("no furniture inside
  // a wall"); a painting requires one, and cares about nothing else — not the
  // ground under it, not the shallows, not a crop, because it is not standing on
  // any of them. It hangs on the face of the wall.
  //
  // Surface only, and a DOOR is not a wall: hanging a picture over the doorway
  // would put it across the one cell you walk through, and the renderer draws a
  // door's opening over the same pixels.
  if (furnitureDef(id).mount === "wall") {
    if (layer !== "surface") return false;
    const cell = world.build[tileKey(ax, ay)];
    if (!cell || cell.id !== "wall") return false;
    const hung = furnitureAt(world, ax, ay, layer);
    return hung === null || (ignore !== undefined && hung.ax === ignore.ax && hung.ay === ignore.ay);
  }

  // A FLOOR PIECE and a standing piece are asked the same questions about the
  // ground and opposite questions about each other. `laid` decides which record
  // this placement is checking itself against, and it is the ONLY difference:
  // everything below — solid ground, shallows, her trees, crops, walls — is
  // asked of both, because a rug is still something you put down on a floor.
  const laid = furnitureDef(id).floor === true;
  if (laid && layer !== "surface") return false; // no rugs in the rock

  for (const [x, y] of cellsFor(ax, ay, id, facing)) {
    const key = tileKey(x, y);
    // Solidity on the piece's OWN layer. Underground this is the whole test that
    // matters: it refuses a lamp in rock you haven't cut, which is the rock's
    // version of "no furniture inside a wall".
    if (tileDef(tileAt(world, x, y, layer)).solid) return false;
    // Each record refuses ITSELF and ignores the other. A rug goes under a table
    // and a table goes onto a rug; two rugs still cannot share a cell, because
    // the thing that makes layering safe is that each record keeps its own "one
    // cell, one piece" — see types.ts §floor.
    const blocking = laid ? floorAt(world, x, y) : furnitureAt(world, x, y, layer);
    if (blocking && !(ignore && blocking.ax === ignore.ax && blocking.ay === ignore.ay)) return false;
    if (layer === "under") continue;
    if (refusesFooting(world, x, y)) return false; // nothing stands in the shallows
    if (refusesConstruction(world, x, y)) return false; // her trees' ground
    if (world.crops[key]) return false;
    // No furniture inside a wall — but a SKYLIGHT is not in the way of
    // anything. It is a hole in the roof a storey above this cell, and the cell
    // itself is open floor you can stand on; refusing a table under one would
    // mean the one structure you place from inside a room made the room's floor
    // unusable. Asked as "does it stand up" rather than by naming the skylight,
    // so anything else overhead inherits the right answer.
    const built = world.build[key];
    if (built && !overhead(built.id)) return false;
  }
  // AND WHAT IS BEHIND IT, for the one piece that needs something there.
  //
  // Asked AFTER the footprint rather than inside the loop, because it is a
  // question about the piece's northernmost ROW and not about each cell: a 2x1
  // fireplace needs a wall behind both halves, and a cell in the middle of a
  // taller footprint has its own piece behind it, not a wall.
  //
  // A DOOR IS NOT A WALL, on the painting's argument one object along — backing
  // a fireplace onto the doorway would stand a chimney breast across the one
  // cell you walk through. A window is not a wall either: you would be blocking
  // your own glass with the only piece in the game tall enough to do it.
  if (furnitureDef(id).backs === "wall") {
    if (layer !== "surface") return false; // no chimneys in the rock
    const { w } = footprint(furnitureDef(id), facing);
    for (let dx = 0; dx < w; dx++) {
      if (world.build[tileKey(ax + dx, ay - 1)]?.id !== "wall") return false;
    }
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
  /** Which set's drawing. Beside `finish` because they are the two style axes,
   *  and defaulted to the starter set for the same reason `layer` defaults to
   *  the surface: it is the answer in every case but the one that says
   *  otherwise. */
  set: SetId = "core",
  layer: Layer = "surface",
  trim?: SkinId,
): boolean {
  if (!canPlaceFurniture(world, ax, ay, id, facing, layer)) return false;
  const record = furnitureDef(id).floor ? world.floor : furnitureFor(world, layer);
  record[tileKey(ax, ay)] = { id, facing, finish, set, ...(trim ? { trim } : {}) };
  touchBuild(world); // the standing things moved — see structures.ts
  return true;
}

/** Take back whatever covers this cell — you point at any part of a bed, not
 *  just its corner. Returns the piece so the caller can refund it exactly. */
export function removeFurnitureAt(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): FurnitureCell | null {
  const found = furnitureAt(world, x, y, layer);
  if (found) {
    delete furnitureFor(world, layer)[tileKey(found.ax, found.ay)];
    touchBuild(world); // the standing things moved — see structures.ts
    return found.cell;
  }
  // TOP DOWN, which is what a finger means. Point at a table standing on a rug
  // and the table comes up; point again and the rug follows. The other order
  // would pull the carpet out from under the furniture, which is a joke and not
  // an interaction — and it would make the rug the only thing in the game you
  // remove by aiming at something else.
  //
  // Surface only, because the floor record is (types.ts §floor). Underground
  // this is the null it always was.
  if (layer !== "surface") return null;
  const laid = floorAt(world, x, y);
  if (!laid) return null;
  delete world.floor[tileKey(laid.ax, laid.ay)];
  touchBuild(world);
  return laid.cell;
}

/** Pick a piece up and set it down somewhere else, keeping everything about it
 *  but where it is — finish, set, trim, and its facing unless you turned it.
 *
 *  NOT ERASE-THEN-PLACE, though that is what a player could already do by hand
 *  at no material cost (erase refunds in full). Three things make it a verb of
 *  its own:
 *
 *    • IT IS ALL OR NOTHING. A move that fails leaves the piece exactly where it
 *      was, because the destination is tested BEFORE the source is emptied. The
 *      by-hand version has a window where your sofa is in your pockets and the
 *      wall you meant to put it against turns out to be one tile short.
 *    • IT COSTS AND REFUNDS NOTHING. Not "refunds then spends the same" — the
 *      inventory is never touched, so a move cannot be a way to launder a finish
 *      you no longer have the materials for, and cannot fail for want of wood.
 *    • IT KEEPS THE STYLE. The by-hand version re-places whatever the bar is
 *      loaded with, so moving a walnut chair across a room repaints it pine.
 *
 *  `from` is any cell of the piece, not its anchor — you point at the end of the
 *  bed you can reach. `to` IS an anchor, because that is what the ghost under
 *  your finger is showing you.
 *
 *  Top down, like erase: the table before the rug it stands on. */
export function moveFurniture(
  world: WorldState,
  fromX: number,
  fromY: number,
  toAx: number,
  toAy: number,
  facing: Facing,
  layer: Layer = "surface",
  /** WHICH RECORD to take it out of, when the caller already knows.
   *
   *  Undefined means top down, which is what a bare "move whatever is here"
   *  should do. The UI passes it because it resolved the piece on the FIRST tap
   *  and must move that one: the anchor of a rug with a table standing on it
   *  answers "table" to a top-down lookup, so a hold on the rug would otherwise
   *  put the table down instead. */
  laid?: boolean,
): boolean {
  const standing = laid === true ? null : furnitureAt(world, fromX, fromY, layer);
  const found =
    standing ??
    (layer === "surface" && laid !== false ? floorAt(world, fromX, fromY) : null);
  if (!found) return false;
  const record = standing ? furnitureFor(world, layer) : world.floor;

  // Ignoring ITSELF, so a piece can be nudged one tile onto cells it already
  // occupies — see `canPlaceFurniture`'s `ignore`.
  if (!canPlaceFurniture(world, toAx, toAy, found.cell.id, facing, layer, found)) return false;
  // A no-op is a success, not a failure: tapping a piece back down where it
  // started is a player changing their mind, and refusing it would flash an
  // error at somebody who did nothing wrong.
  delete record[tileKey(found.ax, found.ay)];
  record[tileKey(toAx, toAy)] = { ...found.cell, facing };
  touchBuild(world); // the standing things moved — see structures.ts
  return true;
}

/** The finish a piece's TRIM is drawn in — its own, or the default for its
 *  class. THE ONE PLACE that fallback lives, so a cell written before trim
 *  existed and a cell whose trim was never chosen resolve identically. */
export function trimOf(cell: FurnitureCell): SkinId | undefined {
  const classes = furnitureDef(cell.id).trim;
  if (!classes?.length) return undefined;
  return cell.trim ?? defaultSkin(classes[0]);
}

/** Is this cell blocked by furniture standing on it? */
export function furnitureBlocks(world: WorldState, x: number, y: number): boolean {
  const found = furnitureAt(world, x, y);
  return found !== null && furnitureDef(found.cell.id).solid;
}
