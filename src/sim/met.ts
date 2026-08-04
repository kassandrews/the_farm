// The satchel's memory of first meetings. `world.met` is every item id that has
// ever been in your pockets, marked on the way in and never unmarked — see the
// field's docblock in types.ts for what it may and may not be used for.
//
// `gain` is the one door: everything that puts an item INTO the satchel goes
// through it rather than calling `add` directly, so there is no second path
// that forgets to mark. `add` stays exported from inventory.ts for the callers
// that are not a gain — the sow refund in seeds.ts puts back a seed that was
// yours a moment ago, and marking it again would be true but pointless.

import type { WorldState } from "./types";
import type { ItemId } from "../content/items";
import { add } from "./inventory";

/** Put things in the satchel and remember having met them. */
export function gain(world: WorldState, id: ItemId, amount: number): void {
  if (amount <= 0) return;
  add(world.inventory, id, amount);
  if (!world.met.includes(id)) world.met.push(id);
}

/** Has this item ever been in the satchel? */
export function hasMet(world: WorldState, id: ItemId): boolean {
  return world.met.includes(id);
}
