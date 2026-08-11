// What a roof is made of.
//
// Its own module, and not a private helper in the renderer, because it is pure
// logic over sim state with no canvas anywhere in it — which means it can be
// unit-tested, and the bug it fixes is exactly the kind that a screenshot found
// and no test would have. Keeping it testable is the point.

import type { WorldState } from "../sim/types";
import type { Room } from "../sim/rooms";
import { tileKey } from "../sim/world";
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

// --- Pitch --------------------------------------------------------------------
//
// A roof is a flat lid until something says which way it falls. 8j's one open
// yield was a distance-to-edge value ramp, held back until it could be squared
// with 8f's rule — grain the surfaces the player looks AT, leave the ones they
// look ACROSS alone — which, read literally, says a roof is a top cap and gets
// nothing.
//
// THE RECONCILIATION. 8f's rule is about TEXTURE COMPETING ACROSS ONE OBJECT:
// a wall cap is flat because a third material texture 16px from the face and
// the floor makes a house read as a mashup of materials meeting. The roof
// already carries shingle courses and they work, so the rule was never "no
// marks on top surfaces". A pitch ramp is not a third texture; it is a value
// model, the same family as the eave line, the ridge, and the overhang that
// carries height everywhere else in this renderer. So it is allowed, on two
// conditions that are the rule's actual content:
//
//   • It REPLACES the flat darkening the roof used to wear, rather than
//     stacking on it. One value model per surface, not two.
//   • Its range stays under the shingle courses' contrast, or the courses wash
//     out at the bright end and the roof loses the texture it already had.
//
// WHAT IT MAY NOT DO is step per cell. A ramp measured in CELLS from the edge
// puts its bands on the tile grid, which is the per-cell edges rule (CLAUDE.md)
// for the fourth time. This model is in tile SPACE — fractional, continuous
// across cell boundaries — and its bands land at fractions of the roof's own
// depth, so a five-deep roof and a nine-deep roof get the same slope rather
// than the same period.

/** Where a roof creases, and how far it has to fall.
 *
 *  `ridge` and `reach` are in tile SPACE, where a cell `ty` spans `[ty, ty+1)`:
 *  the crease sits on a tile boundary or through the middle of a row, and a
 *  pixel partway down a cell has a fractional position between them. That is
 *  what keeps the ramp continuous across cells. */
export interface RoofSlope {
  /** Tile-space coordinate of the crease, on the axis the roof falls along. */
  ridge: number;
  /** Tile-space distance from the crease to the eave. Never below 1.5 — a
   *  shallower roof gets no slope at all rather than a compressed one. */
  reach: number;
}

export interface RoofPitch {
  /** Which way the RIDGE runs, and so which axis the roof falls along: "ew" is
   *  a ridge running east-west with slopes to the north and south. */
  axis: "ew" | "ns";
  /** The crease over this cell, or null where the roof is too shallow to have
   *  one. Per COLUMN (or per row), not per building: an L-shaped house is two
   *  wings, and each wing's ridge follows its own span the way a real one
   *  would, stepping where the arm begins. */
  slopeAt(tx: number, ty: number): RoofSlope | null;
}

/** The shallowest roof that gets a slope, in tiles. Two rows have no middle to
 *  put a ridge in — the crease would land on the seam between the only two
 *  courses and read as a roof cut in half, not as one folded. */
const MIN_SPAN = 3;

/** Read a room's covered cells as a pitched roof.
 *
 *  THE RIDGE RUNS ALONG THE LONGER SIDE. That is what houses do — the ridge
 *  parallels the front — and it agrees with the light this renderer already
 *  draws by, which comes from the north-west: with an east-west ridge the north
 *  slope faces the light and the south slope is the lee, which is the asymmetry
 *  the drawing then leans on.
 *
 *  A SQUARE ROOM HAS NO LONGER SIDE, so the tie is a free choice and it goes
 *  NORTH-SOUTH — the gable end faces south, over the door. Gable-front is a real
 *  vernacular for a square building, it is the only silhouette this view can
 *  show you a whole triangle of, and it is what makes the barn a barn: the doors
 *  are under the gable, the way they are on every barn anyone has drawn.
 *
 *  It used to go east-west, and the barn is why it does not. Nothing the town
 *  builds is square, so this reaches only rooms the player made square. */
export function roofPitch(cover: Set<string>): RoofPitch {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const key of cover) {
    const [x, y] = key.split(",").map(Number);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  // Strictly greater: a tie is a square room and goes north-south, per above.
  const axis: "ew" | "ns" = maxX - minX > maxY - minY ? "ew" : "ns";

  // One span per column (or per row), measured min-to-max. A room shaped like a
  // U has a column that leaves the building and comes back; spanning the gap
  // roofs the courtyard, which is wrong and is also what the flood fill already
  // did when it called those cells one room. Not worth a second model.
  const spans = new Map<number, { lo: number; hi: number }>();
  for (const key of cover) {
    const [x, y] = key.split(",").map(Number);
    const along = axis === "ew" ? x : y;
    const across = axis === "ew" ? y : x;
    const span = spans.get(along);
    if (!span) spans.set(along, { lo: across, hi: across });
    else {
      if (across < span.lo) span.lo = across;
      if (across > span.hi) span.hi = across;
    }
  }

  const slopes = new Map<number, RoofSlope | null>();
  for (const [along, span] of spans) {
    // Tile space: the span's outer edges are `lo` and `hi + 1`.
    const reach = (span.hi + 1 - span.lo) / 2;
    slopes.set(along, reach < MIN_SPAN / 2 ? null : { ridge: span.lo + reach, reach });
  }

  return {
    axis,
    slopeAt(tx, ty) {
      if (!cover.has(tileKey(tx, ty))) return null;
      return slopes.get(axis === "ew" ? tx : ty) ?? null;
    },
  };
}

