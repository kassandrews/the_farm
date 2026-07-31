import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { plant, water, harvest, updateCrop, isRipe, WATER_DURATION_MS } from "./crops";
import { tileKey, tileAt, FARMLAND, FARMLAND_WET } from "./world";
import { cropDef, ripeStage } from "../content/crops";
import { count } from "./inventory";

const HOUR = 3_600_000;

function freshWorld() {
  return newWorld({ name: "Test", form: "scholar", spot: "forest", seed: 42 });
}

describe("crop growth", () => {
  it("does not grow until watered", () => {
    const w = freshWorld();
    const t0 = 1_000_000;
    expect(plant(w, 6, 6, "carrot", t0)).toBe(true);
    // A full day passes with no water: still stage 0.
    updateCrop(w, 6, 6, t0 + 24 * HOUR);
    expect(w.crops[tileKey(6, 6)].stage).toBe(0);
    expect(w.crops[tileKey(6, 6)].growthMs).toBe(0);
  });

  it("advances stages only while watered, and stalls when dry", () => {
    const w = freshWorld();
    const t0 = 1_000_000;
    plant(w, 6, 6, "carrot", t0);
    water(w, 6, 6, t0); // wet until t0 + WATER_DURATION_MS
    // Stage 0 needs 2h watered; after 2h it should reach stage 1.
    updateCrop(w, 6, 6, t0 + 2 * HOUR);
    expect(w.crops[tileKey(6, 6)].stage).toBe(1);
    // Let the soil dry (past WATER_DURATION), then a long absence adds no growth.
    const dry = t0 + WATER_DURATION_MS;
    updateCrop(w, 6, 6, dry);
    const stageAtDry = w.crops[tileKey(6, 6)].stage;
    updateCrop(w, 6, 6, dry + 100 * HOUR);
    expect(w.crops[tileKey(6, 6)].stage).toBe(stageAtDry);
  });

  it("reaches ripe with enough watered time and can be harvested", () => {
    const w = freshWorld();
    const t0 = 1_000_000;
    plant(w, 6, 6, "carrot", t0);
    // Re-water repeatedly so growth never stalls, across the full stage sum.
    const def = cropDef("carrot");
    const totalHours = def.stages.reduce((s, st) => s + st.hours, 0);
    let now = t0;
    water(w, 6, 6, now);
    for (let h = 1; h <= totalHours; h++) {
      now = t0 + h * HOUR;
      water(w, 6, 6, now); // keep it soaked
    }
    updateCrop(w, 6, 6, now);
    expect(isRipe(w, 6, 6)).toBe(true);
    const seedBefore = count(w.inventory, "seed");
    expect(w.crops[tileKey(6, 6)].stage).toBe(ripeStage(def));
    // harvest pays out itself now — the produce AND a seed, which is the half
    // that keeps a spent seed from being a ration (see its docblock).
    const yielded = harvest(w, 6, 6, now);
    expect(yielded!.id).toBe("carrot");
    expect(count(w.inventory, "carrot")).toBe(1);
    expect(count(w.inventory, "seed")).toBeGreaterThan(seedBefore);
    expect(w.crops[tileKey(6, 6)]).toBeUndefined();
  });

  it("away-sim is identical whether stepped or jumped", () => {
    const t0 = 1_000_000;
    // World A: one big jump. World B: many small steps. Both watered the whole
    // time (re-water each hour so neither dries).
    const a = freshWorld();
    const b = freshWorld();
    plant(a, 6, 6, "carrot", t0);
    plant(b, 6, 6, "carrot", t0);
    water(a, 6, 6, t0);
    water(b, 6, 6, t0);
    // Only 5h elapse — under the 22h water window, so no drying involved.
    updateCrop(a, 6, 6, t0 + 5 * HOUR);
    for (let h = 1; h <= 5; h++) updateCrop(b, 6, 6, t0 + h * HOUR);
    expect(a.crops[tileKey(6, 6)].stage).toBe(b.crops[tileKey(6, 6)].stage);
    expect(a.crops[tileKey(6, 6)].growthMs).toBe(b.crops[tileKey(6, 6)].growthMs);
  });

  it("watering sets the soil wet and it dries back after the window", () => {
    const w = freshWorld();
    const t0 = 1_000_000;
    plant(w, 6, 6, "carrot", t0);
    expect(tileAt(w, 6, 6)).toBe(FARMLAND);
    water(w, 6, 6, t0);
    expect(tileAt(w, 6, 6)).toBe(FARMLAND_WET);
    updateCrop(w, 6, 6, t0 + WATER_DURATION_MS + HOUR);
    expect(tileAt(w, 6, 6)).toBe(FARMLAND);
  });
});
