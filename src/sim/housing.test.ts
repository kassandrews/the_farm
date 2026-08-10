import { describe, it, expect } from "vitest";
import { newWorld, tick } from "./game";
import { homeStand, stopTarget, claimedBed, claimAuthoredBeds, settleResidents } from "./housing";
import { placeFurniture, removeFurnitureAt } from "./furniture";
import { placeStructure } from "./structures";
import { tileKey, isWalkable } from "./world";
import { TOWN_BUILDINGS } from "../content/town";
import type { WorldState, Villager } from "./types";

function world(seed = 7) {
  return newWorld({ name: "Test", form: "blob", spot: "forest", seed });
}

function margfrom(w: WorldState): Villager {
  return w.villagers.find((v) => v.id === "resident1")!;
}

/** Local-time epoch ms at a given hour today. 2am is one of her home stops. */
function at(hour: number): number {
  return new Date(2026, 6, 24, hour, 0, 0, 0).getTime();
}

const BED = TOWN_BUILDINGS.margfrom_house.furniture.find((f) => f.id === "bed")!;
/** The plaza spot a homeless resident falls back to (content/cast.ts NO_HOME). */
const NO_HOME = { x: 0, y: -1 };

describe("the bed is the claim", () => {
  it("hands out the town's authored bed at world creation", () => {
    const w = world();
    expect(margfrom(w).homeBed).toBe(tileKey(BED.x, BED.y));
  });

  it("resolves home to a walkable cell beside the bed, never onto it", () => {
    const w = world();
    const stand = homeStand(w, margfrom(w))!;
    expect(stand).not.toBeNull();
    expect(isWalkable(w, stand.x, stand.y)).toBe(true);
    expect(stand).not.toEqual({ x: BED.x, y: BED.y });
  });

  it("follows the bed when the bed moves", () => {
    // The whole point of the step: home is a question about the world, not a
    // coordinate in a table. Rehome her bed to the far corner of her own house
    // and her overnight post has to come with it.
    const w = world();
    const v = margfrom(w);
    const before = stopTarget(w, v, at(2));

    removeFurnitureAt(w, BED.x, BED.y);
    const moved = { x: -7, y: -1 }; // east side of the same room
    expect(placeFurniture(w, moved.x, moved.y, "bed", "s", "pine")).toBe(true);
    v.homeBed = tileKey(moved.x, moved.y);

    const after = stopTarget(w, v, at(2));
    expect(after).not.toEqual(before);
    expect(Math.abs(after.x - moved.x) + Math.abs(after.y - moved.y)).toBe(1);
  });

  it("walks to the moved bed rather than the old spot", () => {
    // End-to-end through the tick loop, because a resolved stop that the route
    // cache never notices would look exactly like a working one in a unit test
    // and exactly like a bug on screen.
    const w = world();
    const v = margfrom(w);
    removeFurnitureAt(w, BED.x, BED.y);
    const moved = { x: -7, y: -1 };
    placeFurniture(w, moved.x, moved.y, "bed", "s", "pine");
    v.homeBed = tileKey(moved.x, moved.y);

    v.x = 0;
    v.y = -1; // out on the plaza
    for (let i = 0; i < 3000; i++) tick(w, 1 / 60, at(2));

    const stop = stopTarget(w, v, at(2));
    expect(Math.hypot(v.x - stop.x, v.y - stop.y)).toBeLessThan(0.2);
    expect(Math.abs(v.x - moved.x) + Math.abs(v.y - moved.y)).toBeLessThan(1.5);
  });
});

describe("a villager with no bed", () => {
  it("falls back to the plaza rather than to nowhere", () => {
    const w = world();
    const v = margfrom(w);
    removeFurnitureAt(w, BED.x, BED.y);

    expect(claimedBed(w, v)).toBeNull();
    expect(homeStand(w, v)).toBeNull();
    // Resolution is total: she stands somewhere specific, in public.
    expect(stopTarget(w, v, at(2))).toMatchObject(NO_HOME);
  });

  it("is not dragged back to the authored bed by a later settle", () => {
    // claimAuthoredBeds is a starting condition, not a gravitational pull. If it
    // re-ran over a live world it would undo any rehousing the player did.
    const w = world();
    const v = margfrom(w);
    const moved = { x: 8, y: 6 }; // a bed out on the player's homestead
    expect(placeFurniture(w, moved.x, moved.y, "bed", "s", "pine")).toBe(true);
    v.homeBed = tileKey(moved.x, moved.y);

    claimAuthoredBeds(w);
    expect(v.homeBed).toBe(tileKey(moved.x, moved.y));
  });

  it("treats a claim on furniture that is no longer a bed as no claim", () => {
    const w = world();
    const v = margfrom(w);
    removeFurnitureAt(w, BED.x, BED.y);
    placeFurniture(w, BED.x, BED.y, "shelf", "s", "pine");
    // Same key, different furniture — she has not inherited the shelf.
    expect(claimedBed(w, v)).toBeNull();
    expect(stopTarget(w, v, at(2))).toMatchObject(NO_HOME);
  });

  it("survives a bed with nowhere to stand beside it", () => {
    const w = world();
    const v = margfrom(w);
    // Wall in every cell around the bed. homeStand has no answer, and that has
    // to be a fallback rather than an exception or a stall against a wall.
    for (let y = BED.y - 1; y <= BED.y + 2; y++) {
      for (let x = BED.x - 1; x <= BED.x + 1; x++) {
        if (x === BED.x && (y === BED.y || y === BED.y + 1)) continue; // the bed
        placeStructure(w, x, y, "wall", "pine");
      }
    }
    expect(homeStand(w, v)).toBeNull();
    expect(stopTarget(w, v, at(2))).toMatchObject(NO_HOME);
  });
});

describe("residents are settled after the town is stamped, not before", () => {
  it("starts a brand-new 2am town with Margfrom at home, not in the plaza", () => {
    // The ordering trap: newWorld builds villagers BEFORE stamping buildings,
    // so at makeVillager time no bed exists and every home stop resolves to the
    // fallback. Without the settle pass, every new town would open with its
    // residents standing in the square.
    const w = world();
    const v = margfrom(w);
    const house = TOWN_BUILDINGS.margfrom_house;

    settleResidents(w, at(2));
    expect(v.x).toBeGreaterThan(house.x0);
    expect(v.x).toBeLessThan(house.x1);
    expect(v.y).toBeGreaterThan(house.y0);
    expect(v.y).toBeLessThan(house.y1);
    expect(v).not.toMatchObject(NO_HOME);
  });

  it("leaves the fixed cast where their literal schedule puts them", () => {
    // The Office Creature has no bed and never will; resolution must not invent
    // one for him or quietly move him off his desk.
    const w = world();
    const office = w.villagers.find((v) => v.id === "office")!;
    expect(office.homeBed).toBeNull();
    expect(stopTarget(w, office, at(2))).toMatchObject({ x: 0, y: -6 });
  });
});
