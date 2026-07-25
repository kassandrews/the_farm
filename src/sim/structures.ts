// Placing and reading the structure layer — the things that stand up.
//
// This module owns WorldState.build. It deliberately knows nothing about how a
// wall is DRAWN; it answers what is standing where, whether a piece may go
// there, and how a piece connects to its neighbours. The renderer turns that
// last answer into a shape.
//
// The autotile rule (DESIGN §Structures): the player paints "wall" and the
// four-neighbour mask decides how it reads. That's why `wallMask` lives here
// rather than in the renderer — enclosure checks and commission scoring will
// want the same connectivity, and there must be exactly one definition of what
// "connected" means.

import type { WorldState, BuildCell } from "./types";
import type { StructureId } from "../content/structures";
import { structureDef, joinsWallRun } from "../content/structures";
import type { SkinId } from "../content/skins";
import { tileAt, tileKey } from "./world";
import { tileDef } from "../content/tiles";

/** What's standing on this tile, or null for open ground. */
export function structureAt(world: WorldState, x: number, y: number): BuildCell | null {
  return world.build[tileKey(x, y)] ?? null;
}

// --- Change tracking ----------------------------------------------------------
// Room detection is derived state that's expensive enough to want memoising and
// cheap enough to recompute whenever the layer actually moves. The counter lives
// HERE, with the mutations, so sim/rooms.ts can depend on this module without
// this module having to know rooms exist.

const revisions = new WeakMap<WorldState, number>();

/** Bumped by every structure edit. Not serialised — it's a cache key, not state. */
export function buildRevision(world: WorldState): number {
  return revisions.get(world) ?? 0;
}

function bump(world: WorldState): void {
  revisions.set(world, buildRevision(world) + 1);
}

/** Announce that the layer moved by some other hand than the ones above.
 *
 *  Exists for sim/undo.ts, which restores whole cells wholesale rather than
 *  replaying place/remove — it has to put back a wall that was painted OVER a
 *  door, which no single call here expresses. Everything that derives from the
 *  build layer keys off this counter, so a restore that skipped it would leave
 *  the town with the roofs of a house that isn't there any more. */
export function touchBuild(world: WorldState): void {
  bump(world);
}

/** Can a structure go here? Ground must be something you could stand on (no
 *  building into the river) and nothing already planted may be paved over —
 *  the same courtesy placePlank extends. An existing piece is NOT a blocker:
 *  painting a door over a wall is how you cut a doorway, and re-painting a
 *  wall in a new finish shouldn't require demolishing it first. */
export function canPlaceStructure(world: WorldState, x: number, y: number): boolean {
  if (tileDef(tileAt(world, x, y)).solid) return false;
  if (world.crops[tileKey(x, y)]) return false;
  return true;
}

/** Put a piece down. Returns false and changes nothing when it can't go there,
 *  or when the identical piece is already standing — so drag-painting across a
 *  wall you've already built doesn't charge you twice for it. */
export function placeStructure(
  world: WorldState,
  x: number,
  y: number,
  id: StructureId,
  finish: SkinId,
): boolean {
  if (!canPlaceStructure(world, x, y)) return false;
  const existing = structureAt(world, x, y);
  if (existing && existing.id === id && existing.finish === finish) return false;
  world.build[tileKey(x, y)] = { id, finish };
  bump(world);
  return true;
}

/** Take a piece back down. Returns what was there, so the caller can refund
 *  exactly what it cost — building and un-building must never quietly drain
 *  you (DESIGN §Materials: you can be slowed, never ground down). */
export function removeStructure(world: WorldState, x: number, y: number): BuildCell | null {
  const key = tileKey(x, y);
  const cell = world.build[key];
  if (!cell) return null;
  delete world.build[key];
  bump(world);
  return cell;
}

/** Is this tile blocked by something standing on it? */
export function structureBlocks(world: WorldState, x: number, y: number): boolean {
  const cell = structureAt(world, x, y);
  return cell !== null && structureDef(cell.id).solid;
}

// --- Autotiling ---------------------------------------------------------------
// A four-neighbour bitmask. North is -y (up the screen, away from the camera).
// The renderer maps the 16 combinations to shapes; nothing else should invent
// its own notion of "connected".

export const CONNECT_N = 1;
export const CONNECT_E = 2;
export const CONNECT_S = 4;
export const CONNECT_W = 8;

/** Which sides this wall joins to. A door counts as part of the run: a doorway
 *  in the middle of a wall should leave the wall reading as one continuous line
 *  with a hole in it, not two walls that happen to be adjacent. */
export function wallMask(world: WorldState, x: number, y: number): number {
  let mask = 0;
  if (joinsAt(world, x, y - 1)) mask |= CONNECT_N;
  if (joinsAt(world, x + 1, y)) mask |= CONNECT_E;
  if (joinsAt(world, x, y + 1)) mask |= CONNECT_S;
  if (joinsAt(world, x - 1, y)) mask |= CONNECT_W;
  return mask;
}

function joinsAt(world: WorldState, x: number, y: number): boolean {
  const cell = structureAt(world, x, y);
  return cell !== null && joinsWallRun(cell.id);
}
