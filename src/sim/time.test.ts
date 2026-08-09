import { describe, it, expect } from "vitest";
import { skyPhaseAt, isNight, tintAt, rakeAt } from "./time";

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

describe("where the sun is", () => {
  it("throws no shadow at night, and the longest with the sun on the horizon", () => {
    // The rule the whole thing rests on: shadow length is an HOUR, not a place
    // (content/biomes.ts §rake). Midnight has no sun, so it has no cast shadow —
    // moonlight is refused deliberately, see `rakeAt`. The contact shadow is not
    // this and survives every hour; without it a sprite floats after dark.
    expect(rakeAt(at(1))).toBe(0);
    expect(rakeAt(at(23))).toBe(0);
    // Dusk and dawn are the same geometry pointed opposite ways — the same
    // LENGTH, and now the opposite sign, which is the half this used to assert
    // away. `toBeCloseTo` on the raw values passed happily while every morning in
    // the game threw an evening's shadow.
    expect(rakeAt(at(19))).toBeCloseTo(-rakeAt(at(6)), 5);
    expect(rakeAt(at(19))).toBeGreaterThan(Math.abs(rakeAt(at(15))));
  });

  it("puts the sun in the east in the morning and the west in the evening", () => {
    // THE COMPASS, asserted as a sign. `rakeAt` is negative before noon (the
    // shadow falls west, away from a risen sun) and positive after it. Nothing
    // else in the world distinguishes seven in the morning from seven at night —
    // `tintAt` is very nearly symmetric about noon by construction — so this is
    // the only thing on screen that says which side of the day you are on.
    for (const h of [6, 7, 9, 11]) expect(rakeAt(at(h)), `${h}:00`).toBeLessThan(0);
    for (const h of [14, 16, 18, 19]) expect(rakeAt(at(h)), `${h}:00`).toBeGreaterThan(0);
    // And it crosses through nothing rather than jumping: the turn happens where
    // the shadow is too short to read a direction off, which is what lets the key
    // light stay pinned to the upper left all day (sim/time.ts §rakeAt).
    expect(Math.abs(rakeAt(at(12, 30)))).toBeLessThan(0.06);
  });

  it("is nearly flat across the middle of the day and then goes up fast", () => {
    // Squared rather than linear, because a body's shadow runs as cot θ. A linear
    // ramp puts a visible shadow on a two o'clock afternoon, which reads as a
    // permanent late-day filter rather than as an hour passing — so the assertion
    // is about the SHAPE of the curve and not about any one number.
    // Magnitudes: the curve's SHAPE is the subject here, and the afternoon is
    // positive anyway — the sign has its own test above.
    const noon = Math.abs(rakeAt(at(12, 30)));
    const three = Math.abs(rakeAt(at(15)));
    const five = Math.abs(rakeAt(at(17)));
    expect(noon).toBeLessThan(0.06);
    expect(three).toBeGreaterThan(noon);
    expect(five).toBeGreaterThan(three);
    // The second half of the afternoon gains more than the first, which is the
    // whole of what "not linear" means here.
    expect(five - three).toBeGreaterThan(three - noon);
  });

  it("draws the shadows out with the evenings, season by season", () => {
    // `rakeAt` and `tintAt` share `boundsAt`, so a summer evening that runs late
    // is still bright AND still short-shadowed at the hour a winter one is
    // neither. Two clocks for one fact is the bug this shares its bounds to
    // avoid.
    const summer = new Date(2026, 6, 24, 17, 0, 0, 0).getTime();
    const winter = new Date(2026, 0, 24, 17, 0, 0, 0).getTime();
    expect(rakeAt(winter)).toBeGreaterThan(rakeAt(summer));
  });
});
