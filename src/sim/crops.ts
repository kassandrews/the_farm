// Crop growth: the engine behind the 5-minute check-in loop. Growth is gated by
// the REAL clock and accrues only while the plot is watered (DESIGN §"Crops
// grow in real time"). Because every crop carries wall-clock timestamps, the
// away simulation is just "call updateCrop with now on load" — no ticks are
// replayed, and a crop grows identically whether the app was open or not.
//
// Design invariants honoured: no daily cap and no stamina on the player's
// hands — real time is the only gate, and missing a watering merely PAUSES
// growth (the plot dries) rather than killing the plant or making a chore.

import type { WorldState, Crop } from "./types";
import type { CropId } from "../content/crops";
import type { CropDef } from "../content/crops";
import { cropDef, ripeStage, SEED_PER_HARVEST } from "../content/crops";
import { tileKey, tileAt, setTile, FARMLAND, FARMLAND_WET } from "./world";
import { GRASS, DIRT } from "../content/tiles";
import { gain } from "./met";

const HOUR = 3_600_000;
/** How long a watering keeps a plot wet — a bit under a day, so a daily
 *  check-in keeps things growing but a skipped day only stalls it. */
export const WATER_DURATION_MS = 22 * HOUR;

/** Can a crop be planted on the tile under the player? Grass, dug dirt, or
 *  already-tilled farmland with nothing growing on it. */
export function canPlant(world: WorldState, x: number, y: number): boolean {
  if (world.crops[tileKey(x, y)]) return false;
  const t = tileAt(world, x, y);
  return t === GRASS || t === DIRT || t === FARMLAND || t === FARMLAND_WET;
}

/** Plant a seed: tills the ground to farmland and drops a stage-0 crop. It will
 *  not grow until watered. */
export function plant(world: WorldState, x: number, y: number, cropId: CropId, now: number): boolean {
  if (!canPlant(world, x, y)) return false;
  setTile(world, x, y, FARMLAND);
  world.crops[tileKey(x, y)] = {
    cropId,
    stage: 0,
    plantedAt: now,
    growthMs: 0,
    lastUpdate: now,
    wateredUntil: now, // planted dry
  };
  return true;
}

/** Is there a plant here to water? The predicate half of `water`, so the ACT
 *  reticle can promise the watering before it happens (see `actionTarget`). */
export function canWater(world: WorldState, x: number, y: number): boolean {
  return world.crops[tileKey(x, y)] !== undefined;
}

/** Water the plot under a crop: soaks the soil and starts (or resumes) growth. */
export function water(world: WorldState, x: number, y: number, now: number): boolean {
  const crop = world.crops[tileKey(x, y)];
  if (!crop) return false;
  updateCrop(world, x, y, now); // bank progress up to now first
  crop.wateredUntil = now + WATER_DURATION_MS;
  setTile(world, x, y, FARMLAND_WET);
  return true;
}

/** Harvest a ripe crop: removes it, resets the plot to dry farmland, and pays
 *  out — the produce, AND a seed. Returns the crop's definition (so the caller
 *  knows what came up) or null if it isn't ripe yet.
 *
 *  THE SEED IS NOT A BONUS, it is the other half of sowing costing one. A seed
 *  spent with none coming back is a ration on planting, and rationing is what
 *  DESIGN §Materials refuses: you can be slowed for a minute, never stopped. It
 *  lives here rather than at the call site for the reason `digWithFind` gives —
 *  a payout decided somewhere other than where the act happens is a payout that
 *  can be forgotten by the next call site to arrive. */
export function harvest(world: WorldState, x: number, y: number, now: number): CropDef | null {
  const key = tileKey(x, y);
  const crop = world.crops[key];
  if (!crop) return null;
  updateCrop(world, x, y, now);
  const def = cropDef(crop.cropId);
  if (crop.stage < ripeStage(def)) return null;
  delete world.crops[key];
  setTile(world, x, y, FARMLAND);
  gain(world, def.yields, 1);
  gain(world, "seed", SEED_PER_HARVEST);
  return def;
}

/** Integrate a single crop's growth up to `now`. Watered time between the last
 *  update and now (clamped to when the soil dries) advances the growth clock;
 *  crossing a stage's requirement bumps the stage. Idempotent-ish: calling it
 *  repeatedly with the same `now` is a no-op. */
export function updateCrop(world: WorldState, x: number, y: number, now: number): Crop | undefined {
  const crop = world.crops[tileKey(x, y)];
  if (!crop) return undefined;
  const def = cropDef(crop.cropId);
  const ripe = ripeStage(def);

  if (crop.stage >= ripe) {
    crop.lastUpdate = now;
    return crop;
  }

  // Watered overlap between lastUpdate and now.
  const wetEnd = Math.min(now, crop.wateredUntil);
  if (wetEnd > crop.lastUpdate) crop.growthMs += wetEnd - crop.lastUpdate;
  crop.lastUpdate = now;

  // Cross as many stage boundaries as the banked growth allows.
  while (crop.stage < ripe) {
    const need = def.stages[crop.stage].hours * HOUR;
    if (need <= 0 || crop.growthMs < need) break;
    crop.growthMs -= need;
    crop.stage += 1;
  }
  if (crop.stage >= ripe) crop.growthMs = 0;

  // Keep the visible soil in sync with wetness (dries back once wateredUntil
  // passes), unless it's been harvested away above.
  if (world.crops[tileKey(x, y)]) {
    setTile(world, x, y, now < crop.wateredUntil ? FARMLAND_WET : FARMLAND);
  }
  return crop;
}

/** Advance every crop to `now` — the away-simulation entry point, run on load. */
export function updateAllCrops(world: WorldState, now: number): void {
  for (const key of Object.keys(world.crops)) {
    const [x, y] = key.split(",").map(Number);
    updateCrop(world, x, y, now);
  }
}

/** True when the crop on this tile is ready to pull. */
export function isRipe(world: WorldState, x: number, y: number): boolean {
  const crop = world.crops[tileKey(x, y)];
  if (!crop) return false;
  return crop.stage >= ripeStage(cropDef(crop.cropId));
}
