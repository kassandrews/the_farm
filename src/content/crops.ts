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
//
// SEASONS DO NOT REACH THIS FILE, and that is the load-bearing half of Phase
// 4d. Four of the varieties below have a month they are ABOUT
// (content/seasons.ts), and that month changes how the ripe plant DRAWS and
// gives the town a line — it does not change a growth time, a yield, or a
// price, and nothing here reads it. A crop that grew faster in its own month
// would be "grow the good one" on a timer, which is the failure the header
// above exists to prevent, wearing a coat.
export type CropId = "carrot" | "radish" | "potato" | "wheat" | "peas" | "tomato" | "pumpkin" | "kale";

export interface CropStageDef {
  /** Wall-clock hours of *watered* growth to leave this stage for the next.
   *
   *  ONE GROWTH MODEL: growth accrues only while the plot is wet, for every
   *  non-terminal stage, with no exceptions. There used to be a `needsWater`
   *  flag here saying which stages drank; `updateCrop` never read it, and the
   *  final stage can't advance anyway because its `hours` is 0. It was deleted
   *  in 4d rather than wired, because wiring it would have introduced a second
   *  growth model that contradicted the one actually running. */
  hours: number;
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
  /** What the game says when you take it. One flat sentence, per variety.
   *
   *  This exists because the message used to be `You pulled a ${yieldName}.` and
   *  four of the eight varieties make that a lie — you do not *pull* wheat, and
   *  "a peas" is not a thing anybody has said. It is the "give it a voice, not a
   *  yield" rule in the header, spent on the one moment the player is actually
   *  looking at the crop. */
  harvestLine: string;
  /** The noun phrase for one harvest, as it appears INSIDE somebody else's
   *  sentence: "I saw you with ___". Villager memory stores this verbatim
   *  (sim/memory.ts values are spoken text, not ids), so it carries its own
   *  article — "a carrot", but "some wheat".
   *
   *  Separate from `yieldName` because that one is a bare noun for counting and
   *  this one is a phrase for speaking, and four of the eight varieties are mass
   *  nouns where `a ${yieldName}` produces "a wheat". */
  carried: string;
}

export const CROPS: Record<CropId, CropDef> = {
  carrot: {
    id: "carrot",
    name: "Carrot",
    yieldName: "carrot",
    yields: "carrot",
    ripeColor: "#f08c3a",
    ripeShade: "#d06a24",
    carried: "a carrot",
    harvestLine: "You pulled a carrot. It's a good one.",
    // seed → sprout → leafy → ripe. Tuned short for the slice (a few real
    // hours end-to-end) so a returning player sees visible progress daily,
    // not a week of dirt.
    stages: [
      { hours: 2 }, // seed in the ground
      { hours: 3 }, // sprout
      { hours: 3 }, // leafy top, tuber swelling
      { hours: 0 }, // ripe — pull it
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
    carried: "a radish",
    harvestLine: "You pulled a radish. It came up almost eagerly.",
    stages: [
      { hours: 1 },
      { hours: 1 },
      { hours: 1 },
      { hours: 0 },
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
    carried: "a potato",
    harvestLine: "You dug up a potato. It had been there a while.",
    stages: [
      { hours: 5 },
      { hours: 6 },
      { hours: 6 },
      { hours: 0 },
    ],
  },

  // --- The 4d varieties ------------------------------------------------------
  // Five more, and the only axis any of them moves on is TIME. The eight totals
  // are 3 / 5 / 8 / 11 / 17 / 21 / 30 / 48 hours: all distinct (seeds.test.ts
  // asserts it), and deliberately not multiples of one another, so no two crops
  // ever settle into the same rhythm of check-ins.
  //
  // Four of them have a month they are ABOUT. That reaches the renderer and the
  // dialogue banks and stops there — see the note at the top of the file.
  peas: {
    id: "peas",
    name: "Peas",
    yieldName: "pea",
    yields: "peas",
    ripeColor: "#7ec24f",
    ripeShade: "#5d9a37",
    // Five hours: the gap between the radish and the carrot. In after breakfast,
    // out before dinner. Spring's variety is the quick one, which is the only
    // joke available about peas.
    carried: "some peas",
    harvestLine: "You picked the peas. Barely a wait at all.",
    stages: [
      { hours: 1 },
      { hours: 2 },
      { hours: 2 },
      { hours: 0 },
    ],
  },
  tomato: {
    id: "tomato",
    name: "Tomato",
    yieldName: "tomato",
    yields: "tomato",
    ripeColor: "#e2503c",
    ripeShade: "#b23526",
    // Eleven — breakfast to evening. Summer's is the one you put in and forget
    // about until it's dark.
    carried: "a tomato",
    harvestLine: "You picked a tomato. Warm, somehow.",
    stages: [
      { hours: 3 },
      { hours: 4 },
      { hours: 4 },
      { hours: 0 },
    ],
  },
  kale: {
    id: "kale",
    name: "Kale",
    yieldName: "kale",
    yields: "kale",
    ripeColor: "#4f8f5e",
    ripeShade: "#356a43",
    // Twenty-one, so it lands at roughly the hour you planted it, a day later.
    // Deliberately NOT twenty-two: `WATER_DURATION_MS` is exactly 22h, and a
    // crop whose total equalled the wetness window would need its second
    // watering with zero slack and would read as a bug the first time somebody
    // was ten minutes late.
    carried: "some kale",
    harvestLine: "You cut the kale. It was entirely unbothered by the cold.",
    stages: [
      { hours: 5 },
      { hours: 8 },
      { hours: 8 },
      { hours: 0 },
    ],
  },
  pumpkin: {
    id: "pumpkin",
    name: "Pumpkin",
    yieldName: "pumpkin",
    yields: "pumpkin",
    ripeColor: "#e08128",
    ripeShade: "#a85a17",
    // Thirty — a day and a bit, so it drifts round the clock and is never ripe
    // at the same hour twice. Autumn's is the one that makes you come back at a
    // different time of day than you left.
    carried: "a pumpkin",
    harvestLine: "You cut a pumpkin loose. It took both hands.",
    stages: [
      { hours: 8 },
      { hours: 11 },
      { hours: 11 },
      { hours: 0 },
    ],
  },
  wheat: {
    id: "wheat",
    name: "Wheat",
    yieldName: "wheat",
    yields: "wheat",
    ripeColor: "#dcc06a",
    ripeShade: "#ab9044",
    // Forty-eight: the multi-day slot, and the only variety with no month of its
    // own. That is the whole of its character — it is the field you put in and
    // stop thinking about, and it is what lets all four seasonal varieties be
    // short.
    //
    // IT CANNOT FINISH ON TWO WATERINGS. 48h of growth against a 22h wetness
    // window needs three, which makes wheat the first crop that genuinely wants
    // you to come back mid-way. That is the check-in loop doing its job and not
    // a chore: a dry plot pauses and never dies, so the cost of forgetting is
    // that it is ready later, which is not a cost.
    carried: "some wheat",
    harvestLine: "You cut the wheat. It had been getting on with it for two days.",
    stages: [
      { hours: 12 },
      { hours: 18 },
      { hours: 18 },
      { hours: 0 },
    ],
  },
};

/** Picker order, and the order the stall lists its varieties. Stable and
 *  hand-written rather than `Object.keys`, so adding a row can never reshuffle
 *  the list under someone's thumb (same rule as ITEM_ORDER). */
// BY GROWTH TIME, shortest first — 3, 5, 8, 11, 17, 21, 30, 48 hours. Time is
// the one axis varieties actually vary on, so a list in time order lets you pick
// "something quick" without consulting a table, and it is the order the satchel
// shows the produce in too (ITEM_ORDER). Seasonal varieties are NOT grouped by
// season here: grouping them would imply the season is the thing to choose by,
// and it isn't.
export const CROP_ORDER: CropId[] = ["radish", "peas", "carrot", "tomato", "potato", "kale", "pumpkin", "wheat"];

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
