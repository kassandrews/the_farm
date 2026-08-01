// What a roof is made of.
//
// Its own module, and not a private helper in the renderer, because it is pure
// logic over sim state with no canvas anywhere in it — which means it can be
// unit-tested, and the bug it fixes is exactly the kind that a screenshot found
// and no test would have. Keeping it testable is the point.

import type { WorldState } from "../sim/types";
import type { Room } from "../sim/rooms";
import { shellFinish } from "../sim/structures";
import { FLOOR_DEFAULT_FINISH } from "../sim/world";
import type { SkinId } from "../content/skins";

/** What a room's roof is MADE of: the commonest finish among its own walls.
 *
 *  A ROOF IS ONE MATERIAL, and it took a screenshot from outside to notice that
 *  ours were not. `drawRoofCell` read the finish off `world.build` at the cell it
 *  was drawing — which is right over a wall and has nothing to read over the
 *  INTERIOR, where there is no build cell at all. Those fell back to the default
 *  pine. So every roofed building in the game was a picture frame: a rim in the
 *  wall's colour around a pale pine middle, on the whitewashed shop most of all,
 *  and it read as a courtyard rather than as a covered building.
 *
 *  Asked per ROOM rather than per cell, because the room is the thing that has
 *  one roof. A house built half in pine and half in walnut gets a roof in
 *  whichever it is mostly made of — the vote settles it rather than the wall
 *  that happens to be under your cursor, and no roof is ever two-toned again.
 *
 *  Through `shellFinish`, so a door in the shell votes with the wall it is set
 *  into rather than with its own leaf, and a repainted house gets a roof that
 *  followed the paint. */
export function roofFinish(world: WorldState, room: Room): SkinId {
  const tally = new Map<SkinId, number>();
  let best: SkinId = FLOOR_DEFAULT_FINISH;
  let bestN = 0;
  for (const key of room.shell) {
    const [x, y] = key.split(",").map(Number);
    const finish = shellFinish(world, x, y) ?? world.build[key]?.finish;
    if (!finish) continue;
    const n = (tally.get(finish) ?? 0) + 1;
    tally.set(finish, n);
    // Strictly greater, so a tie goes to whichever the walk reached first and
    // the answer is at least stable between frames rather than flickering
    // between two equally-common finishes.
    if (n > bestN) {
      bestN = n;
      best = finish;
    }
  }
  return best;
}

