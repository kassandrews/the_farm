// Crop record table. The vertical slice ships exactly one — the carrot,
// obviously (DESIGN §"One crop"). Growth is gated by the REAL clock: a stage
// boundary is crossed only once enough wall-clock hours have elapsed *and*
// (for the middle stages) the plot has been watered that day. This is the
// 5-minute-check-in loop's engine — see src/sim/crops.ts for the state machine.
//
// No stamina, no daily caps: real time gates the crop, never the player's
// hands (Design invariant). Watering is the only maintenance verb, and missing
// a day only pauses growth — it never kills the plant or generates a chore.

export type CropId = "carrot";

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
  /** Stages in order; the last is "ripe" and harvestable. Index into this array
   *  is the crop's growth stage, stored in the save. */
  stages: CropStageDef[];
  /** What a harvest yields, for the postcard/inventory flavour. */
  yieldName: string;
}

export const CROPS: Record<CropId, CropDef> = {
  carrot: {
    id: "carrot",
    name: "Carrot",
    yieldName: "carrot",
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
};

export function cropDef(id: CropId): CropDef {
  return CROPS[id];
}

/** Index of the terminal (harvestable) stage for a crop. */
export function ripeStage(def: CropDef): number {
  return def.stages.length - 1;
}
