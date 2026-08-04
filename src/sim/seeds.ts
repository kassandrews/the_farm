// The stall, and sowing. See content/seedstall.ts for what the Blessed Carrot
// deals in and why it is two kinds of row rather than one.
//
// Like the other three counters, nothing here accumulates: seed goes into the
// satchel where anyone can see it, a variety goes onto a permanent list that was
// already there, and there is no ledger, balance or history in either direction.
//
// THE ONE RULE THIS FILE OWNS: sowing spends a seed, and a harvest gives one
// back (sim/crops.ts). A consumable seed without the return half is a ration on
// planting, and rationing is what DESIGN §Materials refuses — you can be slowed
// for a minute, never stopped. So the stall is how you start and how you expand
// quickly; a plot you keep going sustains itself, and running out entirely takes
// deliberately spending your seed on something else.

import type { WorldState } from "./types";
import type { CropId } from "../content/crops";
import type { Price } from "../content/shop";
import type { SeedRow, VarietyRow } from "../content/seedstall";
import { SEED_ROWS, VARIETY_ROWS } from "../content/seedstall";
import { CROP_ORDER } from "../content/crops";
import { count, add, spend } from "./inventory";
import { gain } from "./met";
import { canPlant, plant } from "./crops";

/** What a town opens with — enough to put a short row in before you have met
 *  anybody. Shared by `newWorld` and by the v14 migration, and that sharing is
 *  the point: a save from before seed existed could plant on ground it can no
 *  longer plant on, so it is handed the same opening stock rather than the
 *  unlocked list alone. Two paths that furnish a town differently is the bug
 *  `ensureFixedCast` exists to prevent, one field over. */
export const STARTING_SEED = 6;

// --- The counter --------------------------------------------------------------

/** The seed rows you can pay for right now, with only the payable prices — the
 *  shop's shape and, since Phase 14b, the shop's filter (see `offers`). */
export function seedOffers(world: WorldState): { row: SeedRow; affordable: Price[] }[] {
  return SEED_ROWS.map((row) => ({
    row,
    affordable: row.accepts.filter((p) => count(world.inventory, p.item) >= p.count),
  })).filter((o) => o.affordable.length > 0);
}

/** The variety rows still on offer AND within reach: a redeemed variety leaves
 *  the list (Phase 14b — the "stays visible, marked" rule it replaced is
 *  recorded in ROADMAP §14b), and `varietiesExhausted` is what voices the
 *  end state, exactly as the heap's exhausted line does. */
export function varietyOffers(world: WorldState): { row: VarietyRow; affordable: Price[] }[] {
  return VARIETY_ROWS.filter((row) => !world.seeds.unlocked.includes(row.gives))
    .map((row) => ({
      row,
      affordable: row.accepts.filter((p) => count(world.inventory, p.item) >= p.count),
    }))
    .filter((o) => o.affordable.length > 0);
}

/** Has he nothing left to unlock? Seed still isn't exhausted — that's the half
 *  of him that keeps working forever. */
export function varietiesExhausted(world: WorldState): boolean {
  return VARIETY_ROWS.every((row) => world.seeds.unlocked.includes(row.gives));
}

/** Buy seed with the price the player CHOSE, not the cheapest match — which of
 *  your things you'd rather part with is a real decision (see shop.ts `trade`).
 *  All-or-nothing: returns false and changes nothing if it can't be paid. */
export function buySeed(world: WorldState, row: SeedRow, price: Price): boolean {
  if (count(world.inventory, price.item) < price.count) return false;
  if (!spend(world.inventory, { [price.item]: price.count })) return false;
  gain(world, "seed", row.givesCount);
  return true;
}

/** Unlock a variety, permanently.
 *
 *  Refuses a variety you already have, which is `redeem`'s lesson rather than
 *  politeness: without it a second tap spends the price for something you owned
 *  and the unlocked list absorbs it in silence. */
export function unlockVariety(world: WorldState, row: VarietyRow, price: Price): boolean {
  if (world.seeds.unlocked.includes(row.gives)) return false;
  if (count(world.inventory, price.item) < price.count) return false;
  if (!spend(world.inventory, { [price.item]: price.count })) return false;
  world.seeds.unlocked.push(row.gives);
  return true;
}

// --- Choosing, and sowing -----------------------------------------------------

/** The varieties you may plant, in picker order. A list rather than the raw
 *  unlocked array so the order can't depend on what you happened to buy first. */
export function plantable(world: WorldState): CropId[] {
  return CROP_ORDER.filter((id) => world.seeds.unlocked.includes(id));
}

/** Choose what the next seed becomes. Refuses a variety you haven't got, so a
 *  stale UI can never plant something the stall never sold you. */
export function selectCrop(world: WorldState, id: CropId): boolean {
  if (!world.seeds.unlocked.includes(id)) return false;
  world.seeds.selected = id;
  return true;
}

/** Is there seed in the satchel? Split out because the ACT reticle has to
 *  promise exactly what the button will do — a green "plant" over ground you
 *  can't sow is the reticle lie all over again (ROADMAP §"The reticle is the
 *  promise"). */
export function hasSeed(world: WorldState): boolean {
  return count(world.inventory, "seed") > 0;
}

/** Can the selected variety go in this ground, right now? Both halves — the
 *  ground and the satchel — because they are one question from the player's
 *  side, and answering half of it somewhere else is how the two drift. */
export function canSow(world: WorldState, x: number, y: number): boolean {
  return hasSeed(world) && canPlant(world, x, y);
}

/** Spend one seed and put the selected variety in the ground.
 *
 *  Owns BOTH halves for the same reason `digWithFind` does: the cost and the
 *  effect are one operation, and split across two calls the pair can disagree
 *  about whether anything happened — leaving either a free plant or a spent
 *  seed with nothing to show for it. Returns the crop planted, or null. */
export function sow(world: WorldState, x: number, y: number, now: number): CropId | null {
  if (!canSow(world, x, y)) return null;
  if (!spend(world.inventory, { seed: 1 })) return null;
  const id = world.seeds.selected;
  if (!plant(world, x, y, id, now)) {
    // canSow said yes, so this is unreachable — but a seed spent on nothing is
    // the one failure worth being explicit about rather than trusting.
    add(world.inventory, "seed", 1);
    return null;
  }
  return id;
}
