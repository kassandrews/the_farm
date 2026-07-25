import { describe, it, expect } from "vitest";
import { CAST, scheduledStop } from "../content/cast";
import { newWorld, tick } from "./game";
import { currentActivity } from "./villagers";
import { setTile, isWalkable } from "./world";
import { GRASS } from "../content/tiles";
import { placeStructure } from "./structures";

/** Local-time epoch ms at a given hour today. */
function at(hour: number): number {
  const d = new Date(2026, 6, 24, hour, 0, 0, 0);
  return d.getTime();
}

describe("daily routines", () => {
  it("puts the resident in different places at different hours", () => {
    const def = CAST.resident1;
    const morning = scheduledStop(def, at(8));
    const afternoon = scheduledStop(def, at(13));
    const evening = scheduledStop(def, at(20));
    // A real day means these are genuinely different posts.
    expect([morning.x, morning.y]).not.toEqual([afternoon.x, afternoon.y]);
    expect([afternoon.x, afternoon.y]).not.toEqual([evening.x, evening.y]);
  });

  it("wraps past midnight to the last stop of the day", () => {
    const def = CAST.resident1;
    // 3am is before the first daytime stop, so it belongs to the overnight one.
    expect(scheduledStop(def, at(3)).fromHour).toBe(0);
    expect(scheduledStop(def, at(23)).fromHour).toBe(19);
  });

  it("the fixed cast never leaves its desk", () => {
    const def = CAST.office;
    for (const hour of [0, 6, 12, 18, 23]) {
      expect(scheduledStop(def, at(hour))).toMatchObject({ x: 0, y: -6 });
    }
  });

  it("a villager walks toward its post for the current hour", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 3 });
    const v = w.villagers.find((x) => x.id === "resident1")!;
    const target = scheduledStop(CAST.resident1, at(13));
    // Park them somewhere else, then tick a while at 1pm.
    v.x = target.x + 6;
    v.y = target.y + 6;
    const before = Math.hypot(v.x - target.x, v.y - target.y);
    for (let i = 0; i < 60; i++) tick(w, 1 / 60, at(13));
    const after = Math.hypot(v.x - target.x, v.y - target.y);
    expect(after).toBeLessThan(before);
  });

  it("needs no catch-up after a long absence — it just walks to today's post", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 3 });
    const v = w.villagers.find((x) => x.id === "resident1")!;
    const target = scheduledStop(CAST.resident1, at(13));
    // Simulate returning days later: one tick at the new time is enough to aim.
    for (let i = 0; i < 600; i++) tick(w, 1 / 60, at(13));
    expect(Math.hypot(v.x - target.x, v.y - target.y)).toBeLessThan(0.2);
  });

  it("reports what a villager is nominally up to", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 3 });
    const v = w.villagers.find((x) => x.id === "resident1")!;
    expect(currentActivity(v, at(8))).toBe("conducting morning research");
    expect(currentActivity(v, at(20))).toBe("writing it all up");
  });
});

describe("villagers respect walls", () => {
  /** A villager parked short of its 1pm post, with clear ground between. */
  function setup() {
    const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 3 });
    const v = w.villagers.find((x) => x.id === "resident1")!;
    const target = scheduledStop(CAST.resident1, at(13));
    for (let y = target.y - 4; y <= target.y + 4; y++) {
      for (let x = target.x - 8; x <= target.x + 4; x++) setTile(w, x, y, GRASS);
    }
    v.x = target.x - 6;
    v.y = target.y;
    return { w, v, target };
  }

  it("walks around a wall instead of through it", () => {
    const { w, v, target } = setup();
    // A wall across the direct line, with its ends open.
    for (let y = target.y - 3; y <= target.y + 3; y++) {
      placeStructure(w, target.x - 3, y, "wall", "pine");
    }

    const crossings: number[] = [];
    for (let i = 0; i < 600; i++) {
      tick(w, 1 / 60, at(13));
      // Never standing inside the wall run.
      if (Math.round(v.x) === target.x - 3 && Math.abs(Math.round(v.y) - target.y) <= 3) {
        crossings.push(i);
      }
    }
    expect(crossings).toEqual([]);
    expect(Math.hypot(v.x - target.x, v.y - target.y)).toBeLessThan(0.2);
  });

  it("snaps to its post when there is no way through at all", () => {
    const { w, v, target } = setup();
    // Seal the post inside a solid box — no door. Rather than grind against the
    // outside forever, the villager is simply where it is supposed to be.
    for (let d = -1; d <= 1; d++) {
      placeStructure(w, target.x + d, target.y - 1, "wall", "pine");
      placeStructure(w, target.x + d, target.y + 1, "wall", "pine");
    }
    placeStructure(w, target.x - 1, target.y, "wall", "pine");
    placeStructure(w, target.x + 1, target.y, "wall", "pine");

    tick(w, 1 / 60, at(13));
    expect(v.x).toBe(target.x);
    expect(v.y).toBe(target.y);
  });

  it("enters a room through its door, which is the whole DESIGN promise", () => {
    const { w, v, target } = setup();
    // Build a room around the post with exactly one door, on the far side from
    // the villager — so reaching the post means walking around and in.
    for (let d = -2; d <= 2; d++) {
      placeStructure(w, target.x + d, target.y - 2, "wall", "pine");
      placeStructure(w, target.x + d, target.y + 2, "wall", "pine");
    }
    for (let d = -1; d <= 1; d++) {
      placeStructure(w, target.x - 2, target.y + d, "wall", "pine");
      placeStructure(w, target.x + 2, target.y + d, "wall", "pine");
    }
    placeStructure(w, target.x + 2, target.y, "door", "pine");

    let usedDoor = false;
    for (let i = 0; i < 1200; i++) {
      tick(w, 1 / 60, at(13));
      if (Math.round(v.x) === target.x + 2 && Math.round(v.y) === target.y) usedDoor = true;
      // At no point may it stand inside a wall.
      expect(isWalkable(w, Math.round(v.x), Math.round(v.y))).toBe(true);
    }
    expect(usedDoor).toBe(true);
    expect(Math.hypot(v.x - target.x, v.y - target.y)).toBeLessThan(0.2);
  });

  it("re-routes when a wall goes up mid-walk", () => {
    const { w, v, target } = setup();
    for (let i = 0; i < 30; i++) tick(w, 1 / 60, at(13));

    // Drop a wall across the line it was following. The route is keyed to the
    // build revision, so this must invalidate it rather than be walked through.
    for (let y = target.y - 3; y <= target.y + 3; y++) {
      placeStructure(w, target.x - 2, y, "wall", "pine");
    }

    for (let i = 0; i < 600; i++) {
      tick(w, 1 / 60, at(13));
      expect(isWalkable(w, Math.round(v.x), Math.round(v.y))).toBe(true);
    }
  });
});
