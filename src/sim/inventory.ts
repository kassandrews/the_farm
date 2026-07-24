// The satchel. A plain count per item — no slots, no grid, no weight, no bag
// size. Those are all caps by another name, and DESIGN §Materials is explicit
// that materials are "required but never rationed": you can be slowed for a
// minute, never stopped, capped, or made to grind.
//
// So there is deliberately no `isFull`, no capacity constant, and nothing here
// can ever refuse a pickup. The only thing that can fail is spending more than
// you have, and callers are expected to check first (see canAfford).

import type { ItemId } from "../content/items";

export type Inventory = Partial<Record<ItemId, number>>;

export function emptyInventory(): Inventory {
  return {};
}

export function count(inv: Inventory, id: ItemId): number {
  return inv[id] ?? 0;
}

/** Put things in. Never fails — there is no capacity to exceed. */
export function add(inv: Inventory, id: ItemId, amount: number): void {
  if (amount <= 0) return;
  inv[id] = count(inv, id) + amount;
}

export function has(inv: Inventory, id: ItemId, amount = 1): boolean {
  return count(inv, id) >= amount;
}

/** A cost, as item → amount. Building costs are small and usually single-item. */
export type Cost = Partial<Record<ItemId, number>>;

export function canAfford(inv: Inventory, cost: Cost): boolean {
  for (const [id, amount] of Object.entries(cost) as [ItemId, number][]) {
    if (!has(inv, id, amount)) return false;
  }
  return true;
}

/** Spend a cost. Returns false and changes NOTHING when you can't afford it —
 *  a partial deduction would be a quiet way to lose materials. */
export function spend(inv: Inventory, cost: Cost): boolean {
  if (!canAfford(inv, cost)) return false;
  for (const [id, amount] of Object.entries(cost) as [ItemId, number][]) {
    inv[id] = count(inv, id) - amount;
  }
  return true;
}

/** Give back exactly what something cost — used when you pick a placed tile
 *  back up, so building and un-building never quietly drains you. */
export function refund(inv: Inventory, cost: Cost): void {
  for (const [id, amount] of Object.entries(cost) as [ItemId, number][]) {
    add(inv, id, amount);
  }
}

/** What a cost is short of, for a message the player can act on. */
export function shortfall(inv: Inventory, cost: Cost): Cost {
  const missing: Cost = {};
  for (const [id, amount] of Object.entries(cost) as [ItemId, number][]) {
    const lack = amount - count(inv, id);
    if (lack > 0) missing[id] = lack;
  }
  return missing;
}
