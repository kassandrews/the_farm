// Trading at the counter. Thin, because barter is a swap and not an economy —
// see content/shop.ts for why there is no currency here to build machinery
// around.
//
// Nothing in this file accumulates. There is no balance, no ledger and no
// transaction history: you hand over a thing, you get a thing, and the only
// record afterwards is what's in your satchel. That's deliberate — a running
// total is a score, and a score is something to optimise.

import type { WorldState } from "./types";
import type { ShopRow, Price } from "../content/shop";
import { SHOP } from "../content/shop";
import { count, spend } from "./inventory";
import { gain } from "./met";

/** Every row you can strike a deal on right now, with only the prices your
 *  pockets can meet.
 *
 *  Phase 14b: rows and prices you can't pay are FILTERED, not greyed. The older
 *  rule ("a counter that hides what you can't buy never teaches you what it's
 *  for") is recorded in ROADMAP §14b with its revert path; the empty-pockets
 *  case gets an authored line in the panel instead of a screen of dead rows. */
export function offers(world: WorldState): { row: ShopRow; affordable: Price[] }[] {
  return SHOP.map((row) => ({
    row,
    affordable: row.accepts.filter((p) => count(world.inventory, p.item) >= p.count),
  })).filter((o) => o.affordable.length > 0);
}

/** Can this exact price be met right now? */
export function canPay(world: WorldState, price: Price): boolean {
  return count(world.inventory, price.item) >= price.count;
}

/** Do the swap: take the price, give the goods.
 *
 *  Takes the price the player CHOSE rather than picking the cheapest match
 *  itself. Which of your things you'd rather part with is a real decision — a
 *  builder hoarding wood and a farmer with a carrot glut will answer it
 *  differently — and quietly spending someone's wood because it happened to be
 *  first in the table would be the game deciding it for them.
 *
 *  Returns false and changes nothing if it can't be paid, on the same
 *  all-or-nothing principle as `spend`. */
export function trade(world: WorldState, row: ShopRow, price: Price): boolean {
  if (!canPay(world, price)) return false;
  if (!spend(world.inventory, { [price.item]: price.count })) return false;
  gain(world, row.gives, row.givesCount);
  return true;
}
