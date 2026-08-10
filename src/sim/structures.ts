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
import { structureDef, joinsWallRun, joinsFenceRun } from "../content/structures";
import type { SkinId } from "../content/skins";
import { tileAt, tileKey, isWalkable, refusesConstruction, refusesFooting } from "./world";
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
 *  the same courtesy placeFloor extends. An existing piece is NOT a blocker:
 *  painting a door over a wall is how you cut a doorway, and re-painting a
 *  wall in a new finish shouldn't require demolishing it first. */
export function canPlaceStructure(world: WorldState, x: number, y: number): boolean {
  if (tileDef(tileAt(world, x, y)).solid) return false;
  if (refusesFooting(world, x, y)) return false; // you can't found a wall in the shallows
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

/** Which sides this FENCE joins to — the same four-neighbour mask, over a
 *  different run (content/structures.ts §joinsFenceRun). Fences and walls are
 *  deliberately blind to each other: a fence that reaches a house meets it and
 *  stops, which is what a real one does. */
export function fenceMask(world: WorldState, x: number, y: number): number {
  let mask = 0;
  if (isFence(world, x, y - 1)) mask |= CONNECT_N;
  if (isFence(world, x + 1, y)) mask |= CONNECT_E;
  if (isFence(world, x, y + 1)) mask |= CONNECT_S;
  if (isFence(world, x - 1, y)) mask |= CONNECT_W;
  return mask;
}

function isFence(world: WorldState, x: number, y: number): boolean {
  const cell = structureAt(world, x, y);
  return cell !== null && joinsFenceRun(cell.id);
}

/** Does this wall show its TOP SURFACE rather than its face?
 *
 *  Exactly when there is a wall in front of it — to the SOUTH. That is the whole
 *  geometric fact: a face you cannot see is a face nobody should draw, and what
 *  you see instead is the wall's top.
 *
 *  It was `N && S` in the renderer — run-mates both behind and in front — which
 *  is the same answer in the middle of a side run and the wrong one at a CORNER.
 *  A north-west corner has run-mates east and south and no north, so it failed
 *  the test and drew a face: the back wall's surface carried straight across both
 *  corners, and the solid side walls stopped short at the back wall's near edge
 *  instead of running up to meet it. Standing in a real room you see the side
 *  walls solid all the way to the back, and the back wall's surface only BETWEEN
 *  them.
 *
 *  The south wall's corners are the check that this is the RIGHT rule and not
 *  merely a looser one: a south-west corner has run-mates north and east and no
 *  south, so it still draws a face — correctly, since the front of a house is a
 *  thing you look straight at, corners included.
 */
export function showsTop(mask: number): boolean {
  return (mask & CONNECT_S) !== 0;
}

/** The finish of the WALL a cell's shell is built from — which for a door is
 *  its neighbours' finish rather than its own.
 *
 *  The note on `door.finishes` in content/structures.ts already states this:
 *  "the stone finishes reach the wall it sits in; they stop at the door itself."
 *  Nothing implemented it. A door carries a wood finish by construction (it was
 *  `finishes: ["wood"]` then and is `[]` now, which defaults to the same pine),
 *  so a doorway cut into a granite wall drew its lintel
 *  and both jambs — the whole cell — in pine, and every stone house in the game
 *  had a plank of timber let into it at the front door.
 *
 *  It lives in sim rather than in the renderer because it is a question about
 *  the build layer ("which run does this door belong to"), and because it is
 *  worth a test: it was invisible in the source and obvious in a screenshot,
 *  which is this project's whole argument for looking.
 *
 *  Deterministic west-east-north-south. That only matters for a doorway between
 *  two runs finished differently, where there is no right answer — and a stable
 *  wrong one beats one that changes with iteration order.
 */
export function shellFinish(world: WorldState, x: number, y: number): SkinId | null {
  const cell = structureAt(world, x, y);
  if (!cell) return null;
  // Only a WALL is its own shell. Everything else here is a made object set into
  // a run — a door, a window — and takes the run's material for the masonry
  // around its opening while its own finish paints just the frame. Written as
  // "is a wall" rather than "is not a door" so the next such piece inherits the
  // right answer instead of the old one: when windows arrived, a `!== "door"`
  // test would have let a wooden sash paint a marble cell pine, which is exactly
  // the bug this function was written to fix, one structure later.
  if (cell.id === "wall") return cell.finish;
  // ALONG THE RUN, not just next door. Three windows in a row is one gallery
  // (render/renderer.ts §drawWindow), and the middle one of those has no wall
  // touching it at all — its west and east neighbours are the other two panes,
  // and its north and south are the inside and the outside of the house. Asking
  // only the four adjacent cells, it found nothing and fell through to its own
  // sash finish, so the middle pane of every run painted its cell a different
  // colour from the two beside it. A wall with a window in it does not change
  // material halfway along.
  //
  // Each direction is walked outward until it leaves the run — through further
  // openings, stopping at the first gap — and the rings are walked in step so
  // the NEAREST wall still wins. At distance 1 that is exactly the old
  // west-east-north-south answer, which is what keeps a doorway between two
  // differently finished runs deciding the way it always did.
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const live = dirs.map(() => true);
  // Long enough for any run somebody builds as one wall, short enough that this
  // stays a handful of lookups — it runs per visible cell, per frame.
  for (let d = 1; d <= 16; d++) {
    let searching = false;
    for (let i = 0; i < dirs.length; i++) {
      if (!live[i]) continue;
      const n = structureAt(world, x + dirs[i][0] * d, y + dirs[i][1] * d);
      // A gap ends that direction: the wall on the far side of the yard is not
      // the run this window is set into.
      if (!n) {
        live[i] = false;
        continue;
      }
      if (n.id === "wall") return n.finish;
      searching = true;
    }
    if (!searching) break;
  }
  // A door standing on its own is its own wall, and wears what it was placed
  // in. Rare, legal, and the only case where a door's finish paints anything
  // larger than the frame around its opening.
  return cell.finish;
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
