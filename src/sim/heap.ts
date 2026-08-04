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
}

/** What he'll actually deal for, today: rows you can pay, minus rows you have
 *  already taken.
 *
 *  Phase 14b reversed the older rule here (taken rows marked, unaffordable rows
 *  greyed — "seeing what he's for is half of knowing to come back"). The list
 *  is now only live offers, and the two absences each have an authored voice
 *  instead of a dead row: an empty-pockets visit gets its own opener, and a
 *  cleaned-out pile gets "That's the lot" via `heapExhausted`. View-side only —
 *  nothing about what he stocks or what is unlocked moved. */
export function heapOffers(world: WorldState): HeapOffer[] {
  return HEAP.filter(
    (row) => !world.skins.unlocked.includes(row.gives) && count(world.inventory, "junk") >= row.cost,
  ).map((row) => ({ row }));
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
