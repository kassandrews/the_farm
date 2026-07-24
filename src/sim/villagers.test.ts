import { describe, it, expect } from "vitest";
import { CAST, scheduledStop } from "../content/cast";
import { newWorld, tick } from "./game";
import { currentActivity } from "./villagers";

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
