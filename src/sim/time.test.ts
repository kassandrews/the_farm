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
    // `at` is a JULY date, so these run against a summer sky: the light starts
    // early and holds late. Midday and the small hours are the same in every
    // month, which is what makes them the honest assertions here.
    expect(skyPhaseAt(at(12))).toBe("day");
    expect(skyPhaseAt(at(23))).toBe("night");
    expect(skyPhaseAt(at(2))).toBe("night");
    expect(skyPhaseAt(at(4, 30))).toBe("dawn"); // 04:30, before a summer sunrise
    expect(skyPhaseAt(at(20))).toBe("dusk"); // still light out in July
  });

  it("the evenings draw in — the day is longer in summer than in winter", () => {
    // A season repaints the ground and the trees; a July evening going dark at
    // the same minute as a January one was the season stopping at the palette.
    const july = (h: number) => new Date(2026, 6, 15, h, 0, 0, 0).getTime();
    const january = (h: number) => new Date(2026, 0, 15, h, 0, 0, 0).getTime();

    // Half past seven on a summer evening is broad daylight; in January it is
    // already night.
    expect(skyPhaseAt(july(19))).toBe("day");
    expect(skyPhaseAt(january(19))).toBe("night");
    // And the mornings run the other way.
    expect(skyPhaseAt(july(6))).toBe("day");
    expect(skyPhaseAt(january(6))).toBe("night");
    // Noon is noon in both.
    expect(skyPhaseAt(july(12))).toBe("day");
    expect(skyPhaseAt(january(12))).toBe("day");
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
