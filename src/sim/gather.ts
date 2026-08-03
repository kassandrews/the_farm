// Gathering, and the rule that makes the world both renewable and yours.
//
// DESIGN §Materials: "Felled trees and rocks regrow on the real clock — unless
// you've claimed that ground. Clear a tree and leave bare dirt and it returns;
// clear it and pave, till, or build there and it's yours for good."
//
// The implementation is that sentence, almost literally. Felling a node writes
// DIRT over it and records when it would come back in `world.regrow`. On every
// world update we check those timers — but a timer only fires if the ground is
// still bare. If you've built on it, tilled it, or planted there, the claim is
// honoured and the entry is dropped: the tree never comes back, and it never
// nags you about it.
//
// Consequences, all intended:
//   • You can never permanently strip the map by accident — walk away from a
//     cleared patch and the woods return.
//   • You never have to defend a clearing. Using it IS defending it.
//   • The forest refills while you're away, so absence restocks the world
//     instead of decaying it (DESIGN §"Absence as story").

import type { WorldState, Layer } from "./types";
import type { NodeId } from "../content/nodes";
import { nodeDef, nodeForTile } from "../content/nodes";
import type { ItemId } from "../content/items";
import { tileAt, setTile, tileKey, healsTo } from "./world";
import { GRASS, DIRT } from "../content/tiles";
import { add } from "./inventory";
import { furnitureAt } from "./furniture";

/** Which node (if any) is standing on this tile right now. */
export function nodeAt(
  world: WorldState,
  x: number,
  y: number,
  layer: Layer = "surface",
): NodeId | null {
  return nodeForTile(tileAt(world, x, y, layer), layer);
}

/** The node you'd gather from where you're standing.
 *
 *  Nodes are SOLID, so you can never stand on one — meaning "act on the tile
 *  underfoot" can never reach a tree. You chop what's in front of you. Prefers
 *  the tile you're facing, then falls back to any neighbour, so walking up to a
 *  tree and tapping ACT always does the obvious thing. */
export function nodeNear(
  world: WorldState,
  x: number,
  y: number,
  facing: 1 | -1,
): { x: number; y: number; node: NodeId } | null {
  const candidates: [number, number][] = [
    [x + facing, y], // the way you're looking, first
    [x, y + 1],
    [x, y - 1],
    [x - facing, y],
  ];
  for (const [nx, ny] of candidates) {
    const node = nodeAt(world, nx, ny);
    if (node) return { x: nx, y: ny, node };
  }
  return null;
}

export interface GatherResult {
  node: NodeId;
  item: ItemId;
  amount: number;
  /** True on the one swing that turned up the dark wood. See below. */
  foundWalnut?: boolean;
}

/** Fell the node on this tile: banks its yield and starts its regrow timer.
 *  Returns null when there's nothing here to gather.
 *
 *  A node with no `regrowMs` books no timer, and `world.regrow` therefore stays
 *  a SURFACE-only record — which is why mining ore needed no schema change and
 *  no migration. That falls out of the design rather than being arranged: the
 *  only node that never comes back is the only one that lives underground. */
export function gather(
  world: WorldState,
  x: number,
  y: number,
  now: number,
  layer: Layer = "surface",
): GatherResult | null {
  const node = nodeAt(world, x, y, layer);
  if (!node) return null;
  const def = nodeDef(node);

  setTile(world, x, y, def.felled, layer); // bare, workable, and claimable
  if (def.regrowMs !== null) world.regrow[tileKey(x, y)] = { node, at: now + def.regrowMs };
  add(world.inventory, def.drop, def.yield);

  // The grove IS the giver, and that is the whole point of where walnut lives.
  //
  // It was the last finish in the game you could not obtain, and the easy answer
  // was to bolt it onto a commission — house the Ghost, get the dark wood. That
  // would have made her a resident who moves in one afternoon, which spoils the
  // one thing about her worth keeping (CLAUDE.md §Tone). So it works the way
  // slate does instead (see mining.ts): a PLACE pays out, nobody hands you
  // anything, and her hint in content/skins.ts turns out to have been literal
  // all along — she knows where the dark wood is because she lives in it.
  //
  // Note what this does NOT require: meeting her. The wood is there by day and
  // she is there by night, and neither gates the other. You can walk home with
  // walnut having never learned there was anyone out there.
  const foundWalnut = node === "darktree" && !world.skins.unlocked.includes("walnut");
  if (foundWalnut) world.skins.unlocked.push("walnut");

  return { node, item: def.drop, amount: def.yield, foundWalnut };
}

/** Has the player claimed this ground? Anything other than the bare dirt or
 *  grass a felled node leaves behind counts as claimed — paved, tilled, built
 *  on, or planted.
 *
 *  "Built on" has to include the STRUCTURE layer, not just the ground tile: a
 *  wall stands on dirt and leaves the dirt dirt, so checking only the tile
 *  would let a tree grow back inside your house. */
function isClaimed(world: WorldState, x: number, y: number): boolean {
  const key = tileKey(x, y);
  if (world.crops[key]) return true;
  if (world.build[key]) return true;
  if (furnitureAt(world, x, y)) return true;
  const t = tileAt(world, x, y);
  return t !== DIRT && t !== GRASS;
}

/** Is one of this tile's eight neighbours still the same node standing?
 *
 *  The other half of "your land is actually yours" — see NodeDef.seeded for why
 *  it exists and why rock, ore and the grove are exempt. Eight and not four: a
 *  wood closes diagonally as readily as it does square, and the four-neighbour
 *  version left odd single holes in dense stands that never filled.
 *
 *  RADIUS ONE, not two, and the difference is how much of a clearing survives.
 *  A neighbour rule always lets the wood take back the ring it can still reach,
 *  so radius is exactly the depth of that encroachment: at two you clear a 7×7
 *  and keep 3×3, at one you keep 5×5. One ring is a wood closing in a little at
 *  its edge, which is true to life and stops; two is enough of a bite to feel
 *  like the clearing failed. */
function hasKinBeside(world: WorldState, x: number, y: number, tile: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (tileAt(world, x + dx, y + dy) === tile) return true;
    }
  }
  return false;
}

/** Bring back every node whose time has come — skipping (and forgetting) any
 *  whose ground you've since claimed, or that has nothing of its own kind left
 *  beside it to grow from. Runs on load and on tick, so regrowth is wall-clock
 *  driven and needs no catch-up after an absence.
 *
 *  Returns how many actually regrew, so the postcard can mention the woods
 *  filling back in. */
export function updateRegrowth(world: WorldState, now: number): number {
  // DECIDE FIRST, THEN PLANT, and this is not tidiness — a single loop that wrote
  // as it went filled a whole clearing in one pass. Each tree it restored became
  // a neighbour for the next entry it looked at, so the wood marched inward ring
  // by ring and the seeded rule bought nothing. It also made the outcome depend
  // on the iteration order of `world.regrow`, which is insertion order, which is
  // the order you happened to swing in.
  //
  // Every entry is judged against the wood as it stood when the pass began.
  const planting: [string, number, number, ReturnType<typeof nodeDef>][] = [];
  for (const [key, entry] of Object.entries(world.regrow)) {
    const [x, y] = key.split(",").map(Number);
    if (isClaimed(world, x, y)) {
      // Your ground now. The node forfeits its claim, permanently and quietly.
      delete world.regrow[key];
      continue;
    }
    if (now < entry.at) continue;
    const def = nodeDef(entry.node);
    // Nothing left to seed from. Forfeits exactly as claimed ground does, and for
    // the same reason: you shaped this, and clearing is shaping (NodeDef.seeded).
    //
    // Checked HERE rather than at felling time, so the answer is about what the
    // wood looks like when the tree would actually have come back. Fell a stand
    // over an afternoon and the whole stand stays down; fell one and put it off,
    // and the neighbours that were there when you swung are still there.
    if (def.seeded && !hasKinBeside(world, x, y, def.tile)) {
      delete world.regrow[key];
      continue;
    }
    planting.push([key, x, y, def]);
  }
  for (const [key, x, y, def] of planting) {
    setTile(world, x, y, def.tile);
    delete world.regrow[key];
  }
  return planting.length;
}

/** How many nodes are waiting to come back — for the away postcard and tests. */
export function pendingRegrowth(world: WorldState): number {
  return Object.keys(world.regrow).length;
}

// --- Grass closing over -------------------------------------------------------
// The other half of the same rule, and it was missing for a long time: a felled
// tree came back, but a hole you dug out of curiosity stayed bare dirt for the
// life of the save. That is a permanent scar on the one thing this file promises
// heals itself, and it made the shovel the only verb in the game you had to tidy
// up after — which nothing here may become (sim/away.ts's house rules).
//
// So dug earth grasses over on the real clock, on exactly the terms a node
// regrows on: a timer, and the timer only fires if the ground is still bare. Till
// it, pave it, build on it or sink a shaft down it and the entry is dropped —
// your dirt is as claimable as your clearing.

// The timer is BOOKED next to `dig` in sim/world.ts, not here, and that split is
// forced by the layering rather than chosen: world.ts imports content, types and
// rng and nothing else in sim, so it cannot call into this file. See RECLAIM_MS
// there for why the delay is what it is. What lives here is the half that has to
// agree with `updateRegrowth` — when a timer is allowed to fire.

/** Close the grass over every dug tile whose time has come — dropping any whose
 *  ground you've since made something of. Runs beside `updateRegrowth` and on the
 *  same wall clock, so an absence needs no catch-up.
 *
 *  The claim test is "is it still DIRT" rather than `isClaimed`, and it is the
 *  stronger check of the two here: a shaft, a plank, farmland and a crop's tile
 *  are all not-dirt, so one lookup covers every way the tile could have stopped
 *  being a hole — including the ones we haven't invented yet. */
export function updateReclaim(world: WorldState, now: number): number {
  let closed = 0;
  for (const [key, at] of Object.entries(world.reclaim)) {
    const [x, y] = key.split(",").map(Number);
    if (tileAt(world, x, y) !== DIRT || isClaimed(world, x, y)) {
      // Yours now, or already something else. Forgotten quietly either way.
      delete world.reclaim[key];
      continue;
    }
    if (now < at) continue;
    // What closes over it is what the GROUND here is, not always grass. On a
    // beach that difference is the whole of it: a dug shore that healed green
    // would grow a lawn two tiles from the sea, and it would do it slowly enough
    // that nobody would connect it to the shovel.
    //
    // Asked of the generator rather than remembered on the tile, because that is
    // where the answer already lives — an unedited tile is whatever generation
    // says, forever (world.ts's opening note), and a stored "what was here"
    // would be a second copy of it that can drift.
    setTile(world, x, y, healsTo(world, x, y));
    delete world.reclaim[key];
    closed++;
  }
  return closed;
}
