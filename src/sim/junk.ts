// Digging things up. See content/junk.ts for what junk is and why it rides on
// the shovel; this file is the two questions the game layer asks.
//
// Both are pure functions of (seed, x, y) plus one fact about the world — has
// this ground been turned before. Nothing here is stored: the world already
// records which tiles have been edited, and "has anyone dug here" is a question
// that record can answer, so a `dug` set would be the same fact written twice.

import type { WorldState } from "./types";
import { hash2 } from "./rng";
import { tileKey, canDig, dig, canCarve, carve, depthAt } from "./world";
import { JUNK_DENSITY, JUNK_FINDS, DEEP_JUNK_DENSITY, DEEP_FINDS } from "../content/junk";
import { add } from "./inventory";

/** Its own salt, so junk doesn't correlate with where the trees and rocks are —
 *  the same reason generation uses two hashes for tree and rock. */
const JUNK_SALT = 0x5c4a;

/** And its own again for the rock, so a cell doesn't hold the same answer above
 *  and below. Sharing the salt would put the deep finds directly under the
 *  shallow ones, which nobody would ever notice and which would nonetheless be
 *  the two layers secretly being one map. */
const DEEP_SALT = 0x9b17;

/** How far from your nearest shaft the rock starts having things in it.
 *
 *  The threshold is fiction, not balance (DESIGN §Materials): close to a shaft
 *  you are under ground you have already turned from above, so there is nothing
 *  left there to find. Past it, nobody has been near.
 *
 *  Same measure as slate and one tile short of it, so the first deep find lands
 *  before the finish does. That ordering is deliberate — slate is the louder
 *  moment and it should not be the *first* thing that says "you are somewhere
 *  else now". */
export const DEEP_FIND_DEPTH = 11;

/** Is there something under this tile, in this town, forever?
 *
 *  Total function of the seed and the coordinate — no world state, no roll, no
 *  memory. That is what makes it un-farmable: the answer for a tile is fixed
 *  before anyone ever stands on it, so there is nothing to re-roll. */
export function buriedAt(world: WorldState, x: number, y: number): boolean {
  return hash2(x, y, world.seed ^ JUNK_SALT) / 4294967296 < JUNK_DENSITY;
}

/** Which find's flavour this tile produces. Deterministic for the same reason
 *  and to the same end; it also means a test can assert an exact line. */
export function findLine(world: WorldState, x: number, y: number): string {
  const h = hash2(x, y, (world.seed ^ JUNK_SALT) + 1);
  return JUNK_FINDS[h % JUNK_FINDS.length];
}

/** Has this ground been turned before?
 *
 *  An override means somebody — the player, the town stamp, the away sim — has
 *  already decided what this tile is. Virgin ground is ground the world
 *  generated and nobody has touched, and it is the only ground that pays out.
 *  Digging writes an override, so a dug tile is spent; and since `canDig` takes
 *  grass and not dirt, a spent tile can't even be re-dug.
 *
 *  ONE seam, known and left open. `setTile` DELETES an override when you write
 *  back exactly what generation says, so ground restored to its generated state
 *  reads as virgin again. Nothing the player can do reaches this: digging is
 *  one-way (dirt isn't diggable), and undo covers build strokes, not ACT. The
 *  single path is the Gremlin's away event moving a plank off a tile that was
 *  dug and then paved, which reverts it to grass — after which it can pay out a
 *  second time. That is a handful of coincidences deep, capped at one per
 *  absence, and it amounts to the Gremlin having put something back in your
 *  ground while you were out. Buying a `dug` set and a schema field to prevent
 *  it would cost more than the bug does, and would be less true to him. */
export function isVirginGround(world: WorldState, x: number, y: number): boolean {
  return !(tileKey(x, y) in world.overrides);
}

/** Dig a tile and hand over whatever was under it. THE way the shovel digs.
 *
 *  This owns both halves on purpose, because the un-farmable rule is entirely a
 *  rule about ORDER: the payout has to be decided while the ground is still
 *  virgin, and the dig is what stops it being virgin. Split across two calls,
 *  that ordering lives at a call site where nobody can see it, and getting it
 *  wrong is silent and unbounded in the player's favour — the first draft here
 *  paid out on generated TREES (virgin ground, no override, and a failed dig
 *  writes nothing to mark the tile spent), which is infinite junk from one tap
 *  repeated. So there is one function, and it cannot be called out of order.
 *
 *  `find` is null when the ground had nothing in it, which is most of the time
 *  and says nothing rather than reporting the absence — "you find nothing" on
 *  six tiles in seven turns a free verb into a slot machine that mostly tells
 *  you that you lost. */
export function digWithFind(
  world: WorldState,
  x: number,
  y: number,
): { dug: boolean; find: string | null } {
  if (!canDig(world, x, y)) return { dug: false, find: null };
  const payout = isVirginGround(world, x, y) && buriedAt(world, x, y);
  if (!dig(world, x, y)) return { dug: false, find: null };
  if (!payout) return { dug: true, find: null };
  add(world.inventory, "junk", 1);
  return { dug: true, find: findLine(world, x, y) };
}

/** Is there something in this piece of rock, forever? Total function of the
 *  seed and the coordinate, exactly like `buriedAt` — the depth question is
 *  asked separately (below) because depth is the one part of this that ISN'T a
 *  property of the cell: it moves when you sink a shaft. */
export function embeddedAt(world: WorldState, x: number, y: number): boolean {
  return hash2(x, y, world.seed ^ DEEP_SALT) / 4294967296 < DEEP_JUNK_DENSITY;
}

/** Which deep find's flavour this cell produces. */
export function deepFindLine(world: WorldState, x: number, y: number): string {
  const h = hash2(x, y, (world.seed ^ DEEP_SALT) + 1);
  return DEEP_FINDS[h % DEEP_FINDS.length];
}

/** Cut a rock face and hand over whatever was in it. THE way the pick cuts.
 *
 *  One function for the same reason `digWithFind` is one: the payout depends on
 *  the state of the cell and the cut is what changes that state. Underground
 *  the hazard is smaller — uncut rock is un-edited rock by construction, so
 *  there is no "virgin ground" question to get wrong, and carving writes the
 *  override that spends it — but the shape that made surface junk infinite is
 *  worth not rebuilding on the other layer.
 *
 *  Depth is read BEFORE the cut, and it matters that it can't matter: carving
 *  doesn't move a shaft, so the depth here is the same either side of the call.
 *  It is read first anyway, so that the rule is "the rock you swung at" rather
 *  than "the rock after you hit it" — the day something does move depth, this
 *  reads correctly without anyone remembering why. */
export function carveWithFind(
  world: WorldState,
  x: number,
  y: number,
): { carved: boolean; find: string | null } {
  if (!canCarve(world, x, y)) return { carved: false, find: null };
  const payout = depthAt(world, x, y) >= DEEP_FIND_DEPTH && embeddedAt(world, x, y);
  if (!carve(world, x, y)) return { carved: false, find: null };
  if (!payout) return { carved: true, find: null };
  add(world.inventory, "junk", 1);
  return { carved: true, find: deepFindLine(world, x, y) };
}
