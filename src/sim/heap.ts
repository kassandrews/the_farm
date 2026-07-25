// Redeeming at the heap. See content/shop.ts §"The heap" for what the Gremlin
// deals in and why it is only ever finishes.
//
// Like the Menace's counter, nothing here accumulates: junk goes in, a finish
// comes out, and the only record afterwards is the unlocked list — which was
// already there and is already permanent. There is no ledger and no balance,
// for the same reason her counter has none (a running total is a score).

import type { WorldState } from "./types";
import type { HeapRow } from "../content/shop";
import { HEAP } from "../content/shop";
import { count, spend } from "./inventory";

export interface HeapOffer {
  row: HeapRow;
  /** Already redeemed — a finish is permanent, so there is no second one. */
  taken: boolean;
  affordable: boolean;
}

/** Everything on the pile, including what you can't pay for and what you have
 *  already taken.
 *
 *  Taken rows keep their place rather than disappearing: a counter that empties
 *  itself as you use it makes the last visit look like a bug, and seeing what
 *  you already own from him is half of knowing what he is for. Same instinct as
 *  the shop showing rows you can't afford. */
export function heapOffers(world: WorldState): HeapOffer[] {
  return HEAP.map((row) => ({
    row,
    taken: world.skins.unlocked.includes(row.gives),
    affordable: count(world.inventory, "junk") >= row.cost,
  }));
}

/** Is there anything left on the pile he hasn't given you? */
export function heapExhausted(world: WorldState): boolean {
  return HEAP.every((row) => world.skins.unlocked.includes(row.gives));
}

/** Hand over the junk, take the finish. Returns false and changes nothing if
 *  you can't pay or already have it — all-or-nothing, like `spend` and `trade`.
 *
 *  Refusing an already-unlocked row matters more than it looks: without it, a
 *  second tap on a row you own would charge you junk for a finish you already
 *  had, and the unlocked list would absorb it silently. */
export function redeem(world: WorldState, row: HeapRow): boolean {
  if (world.skins.unlocked.includes(row.gives)) return false;
  if (!spend(world.inventory, { junk: row.cost })) return false;
  world.skins.unlocked.push(row.gives);
  return true;
}
