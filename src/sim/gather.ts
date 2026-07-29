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
import { tileAt, setTile, tileKey } from "./world";
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

  return { node, item: def.drop, amount: def.yield };
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

/** Bring back every node whose time has come — skipping (and forgetting) any
 *  whose ground you've since claimed. Runs on load and on tick, so regrowth is
 *  wall-clock driven and needs no catch-up after an absence.
 *
 *  Returns how many actually regrew, so the postcard can mention the woods
 *  filling back in. */
export function updateRegrowth(world: WorldState, now: number): number {
  let regrew = 0;
  for (const [key, entry] of Object.entries(world.regrow)) {
    const [x, y] = key.split(",").map(Number);
    if (isClaimed(world, x, y)) {
      // Your ground now. The node forfeits its claim, permanently and quietly.
      delete world.regrow[key];
      continue;
    }
    if (now < entry.at) continue;
    setTile(world, x, y, nodeDef(entry.node).tile);
    delete world.regrow[key];
    regrew++;
  }
  return regrew;
}

/** How many nodes are waiting to come back — for the away postcard and tests. */
export function pendingRegrowth(world: WorldState): number {
  return Object.keys(world.regrow).length;
}
