// Pinning the ground under what people have built (ROADMAP §Phase 11).
//
// THE PROBLEM THIS CLOSES. Base terrain is a total function of (seed, x, y) with
// nothing stored, so every unedited cell is regenerated on every load. That is
// the rule the whole world rests on and it stays — but it means a change to the
// generator re-landscapes towns that already exist. `HOME_REGION_REACH` answers
// that for the town by making the meadow row an identity, and answers nothing
// for the house somebody built five hundred tiles out.
//
// Measured before building this, over 39k cells of open country: 23% of it is
// solid. A terrain pass perturbs rather than rerolls, so the number that matters
// is marginal — one percent of added solid decor gives a 25-cell room interior a
// 22% chance of gaining a tree inside it. A solid cell in a room breaks the
// room, the roof derived from it, and the villager's route to the bed in it, and
// a villager who cannot path snaps rather than walks, so it reads as teleporting
// rather than as a broken house.
//
// THE ROOM, NEVER A RADIUS. Freezing is a one-way ratchet: nothing removes an
// entry, so a cell frozen by mistake cannot be fixed in place. `rooms()` already
// answers exactly the question worth asking — which cells are enclosed by
// something the player made — and it is already memoised against the build
// revision, so this is not a second definition of "built on" that can drift from
// the first.
//
// IT FREEZES THE AUTHORED TOWN TOO, which is a consequence rather than a
// decision: `rooms()` answers about every enclosed room and the town's buildings
// are ordinary built cells (DESIGN — you can demolish and extend them). Harmless
// and slightly useful, since most of that ground is already a `town.ts` floor
// override; the belt is that the town's rooms stop depending on the meadow row
// staying an identity. It is worth knowing when reading a save: a brand-new
// world acquires a few hundred frozen cells on its first load, before the player
// has built anything.
//
// WHAT IT DELIBERATELY DOES NOT COVER. Open ground you farm is already an edit
// (tilling writes an override). A path you walk is nobody's. A tree in your
// garden is allowed to change, because a garden is not a room and the world
// healing where you are not invested is a rule this must not quietly repeal.

import type { WorldState } from "./types";
import { rooms } from "./rooms";
import { baseTileAt } from "./world";

/** Pin the ground under every enclosed room to what generation says right now.
 *
 *  Idempotent and additive — an already-frozen cell is left exactly as it is,
 *  because re-reading generation for it would be asking the question this
 *  function exists to stop asking. Returns how many cells it newly pinned, which
 *  is what the tests assert on and what makes "did the catch-up do anything"
 *  answerable.
 *
 *  Cheap enough to call on a build action: `rooms()` is a bounded flood fill off
 *  the structure layer, already recomputed on every build for the pathfinder's
 *  sake (§5b), and the loop below is a map write per enclosed cell. Measured at
 *  465 cells across eleven rooms for a five-house town — about 5.5 KB of save.
 *
 *  IT WRITES `world.frozen` DIRECTLY AND MUST NOT USE `setTile`. `setTile`
 *  deletes an edit whose value equals the generated base, which is every cell
 *  this touches; routed through it, the freeze would be a loop that stores
 *  nothing. See types.ts §frozen for why this is a separate record at all. */
export function freezeBuilt(world: WorldState): number {
  let pinned = 0;
  for (const room of rooms(world)) {
    for (const key of room.interior) pinned += pin(world, key);
    // The shell too — the walls' own cells. A wall stands ON ground, that ground
    // is drawn, and a doorway's floor is a cell you walk across. Freezing the
    // interior alone would leave a ring of live generation around every house.
    for (const key of room.shell) pinned += pin(world, key);
  }
  return pinned;
}

function pin(world: WorldState, key: string): number {
  if (world.frozen[key] !== undefined) return 0;
  const [x, y] = key.split(",").map(Number);
  world.frozen[key] = baseTileAt(world, x, y);
  return 1;
}
