// Crop record table. The vertical slice shipped exactly one — the carrot,
// obviously (DESIGN §"One crop"); the Blessed Carrot's stall (Phase 3g) is what
// makes it three. Growth is gated by the REAL clock: a stage
// boundary is crossed only once enough wall-clock hours have elapsed *and*
// (for the middle stages) the plot has been watered that day. This is the
// 5-minute-check-in loop's engine — see src/sim/crops.ts for the state machine.
//
// No stamina, no daily caps: real time gates the crop, never the player's
// hands (Design invariant). Watering is the only maintenance verb, and missing
// a day only pauses growth — it never kills the plant or generates a chore.

import type { ItemId } from "./items";

// VARIETIES DIFFER IN TIME AND IN NOTHING ELSE (DESIGN §Materials). No crop
// yields more, sells better, or is worth more to anyone — the radish is quick
// and the potato is slow, and that is the entire spread. The moment one crop
// out-earns the rest, "farming is fully optional" becomes "grow the good one",
// which is a currency wearing a hat. Anything added here inherits that rule:
// pick a total time nobody else has, and give it a voice, not a yield.
export type CropId = "carrot" | "radish" | "potato";

export interface CropStageDef {
  /** Wall-clock hours of *watered* growth to leave this stage for the next. */
  hours: number;
  /** Does this stage need water to advance? Seed and sprout drink; the final
   *  "ripe" stage is terminal and needs nothing. */
  needsWater: boolean;
}

export interface CropDef {
  id: CropId;
  name: string;
  /** The shoulder breaking the soil when it's ripe, and its shadow. Two colours
   *  rather than three sprites: the renderer draws one plant and reads its
   *  palette from here, so a new variety costs a table row and no art. Same
   *  instinct as finishes — the look is data, never a second code path. */
  ripeColor: string;
  ripeShade: string;
  /** Stages in order; the last is "ripe" and harvestable. Index into this array
   *  is the crop's growth stage, stored in the save. */
  stages: CropStageDef[];
  /** What a harvest yields, for the postcard/inventory flavour. */
  yieldName: string;
  /** …and which satchel row it lands in. Written down rather than assumed equal
   *  to the crop id: they happen to match today, and a crop whose yield was
   *  named something else would otherwise vanish into a row nobody added. */
  yields: ItemId;
}

export const CROPS: Record<CropId, CropDef> = {
  carrot: {
    id: "carrot",
    name: "Carrot",
    yieldName: "carrot",
    yields: "carrot",
    ripeColor: "#f08c3a",
    ripeShade: "#d06a24",
    // seed → sprout → leafy → ripe. Tuned short for the slice (a few real
    // hours end-to-end) so a returning player sees visible progress daily,
    // not a week of dirt.
    stages: [
      { hours: 2, needsWater: true }, // seed in the ground
      { hours: 3, needsWater: true }, // sprout
      { hours: 3, needsWater: true }, // leafy top, tuber swelling
      { hours: 0, needsWater: false }, // ripe — pull it
    ],
  },
  radish: {
    id: "radish",
    name: "Radish",
    yieldName: "radish",
    yields: "radish",
    ripeColor: "#e0566a",
    ripeShade: "#b03a50",
    // The short one — about three hours end to end, so it fits inside an
    // afternoon and rewards a second check-in on the same day. It is not
    // WORTH less for being quick; it is simply over sooner.
    stages: [
      { hours: 1, needsWater: true },
      { hours: 1, needsWater: true },
      { hours: 1, needsWater: true },
      { hours: 0, needsWater: false },
    ],
  },
  potato: {
    id: "potato",
    name: "Potato",
    yieldName: "potato",
    yields: "potato",
    ripeColor: "#c9a06a",
    ripeShade: "#967043",
    // The long one — the better part of a day, which makes it the thing you
    // put in before you close the app. Nothing is lost by leaving it: a dry
    // plot pauses, it never dies (see the header).
    stages: [
      { hours: 5, needsWater: true },
      { hours: 6, needsWater: true },
      { hours: 6, needsWater: true },
      { hours: 0, needsWater: false },
    ],
  },
};

/** Picker order, and the order the stall lists its varieties. Stable and
 *  hand-written rather than `Object.keys`, so adding a row can never reshuffle
 *  the list under someone's thumb (same rule as ITEM_ORDER). */
export const CROP_ORDER: CropId[] = ["carrot", "radish", "potato"];

/** The variety you start with. The carrot is the one the slice shipped and the
 *  one the stall's patron declines to discuss; every other variety is unlocked
 *  at his counter (sim/seeds.ts). */
export const STARTING_CROP: CropId = "carrot";

/** How much seed a harvest gives back. One: a plot replaces itself and a patch
 *  grows slowly if you keep at it, without seed piling into a number worth
 *  watching. It lives HERE, beside the growth times, because it is the other
 *  half of what a variety costs to run — see sim/crops.ts `harvest` for why the
 *  payout can't live at the call site. */
export const SEED_PER_HARVEST = 1;

export function cropDef(id: CropId): CropDef {
  return CROPS[id];
}

/** Index of the terminal (harvestable) stage for a crop. */
export function ripeStage(def: CropDef): number {
  return def.stages.length - 1;
}
