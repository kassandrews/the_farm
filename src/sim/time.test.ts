import { describe, it, expect } from "vitest";
import { skyPhaseAt, isNight, tintAt } from "./time";

/** A local-time Date at a given hour, so the phase boundaries are exercised in
 *  the same timezone the game reads. */
function at(hour: number, minute = 0): number {
  const d = new Date(2026, 6, 24, hour, minute, 0, 0);
  return d.getTime();
}

describe("real-clock day/night", () => {
  it("maps hours to the four sky phases", () => {
    expect(skyPhaseAt(at(6))).toBe("dawn");
    expect(skyPhaseAt(at(12))).toBe("day");
    expect(skyPhaseAt(at(19))).toBe("dusk");
    expect(skyPhaseAt(at(23))).toBe("night");
    expect(skyPhaseAt(at(2))).toBe("night");
  });

  it("dawn still reads as night for the ground palette", () => {
    expect(isNight("dawn")).toBe(true);
    expect(isNight("day")).toBe(false);
    expect(isNight("dusk")).toBe(false);
    expect(isNight("night")).toBe(true);
  });

  it("day has no tint overlay; night has the darkest", () => {
    expect(tintAt(at(12)).overlay).toBe("");
    expect(tintAt(at(12)).darkness).toBe(0);
    expect(tintAt(at(23)).darkness).toBeGreaterThan(tintAt(at(19)).darkness);
  });
});
