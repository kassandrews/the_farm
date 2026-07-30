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
import { tileAt, tileKey, isWalkable, refusesConstruction } from "./world";
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
 *  the town with the roofs of a house that isn't there any more.
 *
 *  ALSO CALLED BY sim/furniture.ts, and that is the counter's real definition
 *  rather than a favour done for a neighbour: what depends on it is villager
 *  ROUTES, and a route is only valid while `isWalkable` gives the same answers.
 *  `isWalkable` counts solid furniture, so a table dropped across a corridor
 *  invalidates a route exactly as a wall does. Read this counter as "the standing
 *  things moved", not "world.build moved" — it was named before furniture had a
 *  layer of its own, and the narrower reading is what let a villager walk through
 *  a table for three phases (ROADMAP §Known gaps). */
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
  if (refusesConstruction(world, x, y)) return false; // her trees' ground
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

// --- Doorsteps ----------------------------------------------------------------
// A door's doorstep is its only way in (ROADMAP §"A door needs a south wall and
// a doorstep"): the diagonals are blocked by the door's own wall run, and the
// pathfinder won't cut a corner between two walls. So one tree — or one
// misplaced shelf — in front of a doorway seals the building.
//
// The town's stamp already clears an apron in front of its own doors. Nothing
// did the same for a house the PLAYER built, and the failure is close to
// invisible: a villager who can't path home snaps there and looks completely
// normal doing it. Phase 3 judges houses the player built, so it stopped being
// acceptable for the game to know this and not say so.

/** The two cells a door is entered from — the ones perpendicular to its run.
 *
 *  Returns null for anything that isn't a door. A door in a north-south run is
 *  entered from the east and west; one in an east-west run from the north and
 *  south. Stepping off the SIDE of a doorway is not a way in, which is exactly
 *  why a blocked doorstep seals a building rather than merely inconveniencing
 *  it. */
export function doorApproaches(world: WorldState, x: number, y: number): { x: number; y: number }[] | null {
  if (structureAt(world, x, y)?.id !== "door") return null;
  const mask = wallMask(world, x, y);
  const sideOn = Boolean(mask & CONNECT_N) && Boolean(mask & CONNECT_S);
  return sideOn
    ? [
        { x: x - 1, y },
        { x: x + 1, y },
      ]
    : [
        { x, y: y - 1 },
        { x, y: y + 1 },
      ];
}

/** The approach cells of this door that nobody can stand on.
 *
 *  BOTH sides count, not just the outside one. A door whose inside step is
 *  blocked is just as sealed as one whose outside step is, and telling them
 *  apart needs the room index — a dependency this module doesn't have and
 *  shouldn't acquire to answer a question where the honest answer is the same
 *  either way: that step has to be clear.
 *
 *  Empty for a door that's fine, so callers read it as "what's wrong here". */
export function blockedDoorsteps(world: WorldState, x: number, y: number): { x: number; y: number }[] {
  const approaches = doorApproaches(world, x, y);
  if (!approaches) return [];
  // isWalkable, not a local check: it is the ONE predicate the player, the
  // villagers and the pathfinder all collide against (sim/path.ts leans on that
  // deliberately), so a doorstep is clear exactly when the person walking
  // through it agrees. A second opinion here would find gaps one of them could
  // use and the other couldn't. It also means solid FURNITURE counts — a table
  // pushed across the threshold seals a house as thoroughly as a tree.
  return approaches.filter((a) => !isWalkable(world, a.x, a.y));
}
