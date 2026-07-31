import { describe, expect, it } from "vitest";
import { groundTone } from "./world";

/** The tone field exists to give open ground shape without putting an edge on
 *  the tile grid (CLAUDE.md §per-cell edges). These tests are the second half of
 *  that: a screenshot proves it looks right on one seed, and this proves the
 *  property that made it look right holds on all of them. */
describe("groundTone", () => {
  it("is deterministic — the ground is the same when you walk back onto it", () => {
    for (const [x, y] of [[0, 0], [13, -7], [-412, 908], [5, 5]]) {
      expect(groundTone(x, y, 1234)).toBe(groundTone(x, y, 1234));
    }
  });

  it("stays inside 0..1", () => {
    for (let x = -60; x <= 60; x += 3) {
      for (let y = -60; y <= 60; y += 3) {
        const t = groundTone(x, y, 99);
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(1);
      }
    }
  });

  /** THE BAND RULE, as a number. The renderer mixes at most 14% of black across
   *  the whole 0..1 range, so a step of 0.07 between neighbours is a single RGB
   *  unit on the grass — under what an eye can find as an edge. Anything that
   *  shortens the wavelength will trip this long before it reaches a screenshot. */
  it("never steps hard enough between neighbours to draw an edge", () => {
    let worst = 0;
    for (const seed of [1, 7, 4242, 999983]) {
      for (let x = -80; x <= 80; x++) {
        for (let y = -80; y <= 80; y++) {
          worst = Math.max(
            worst,
            Math.abs(groundTone(x, y, seed) - groundTone(x + 1, y, seed)),
            Math.abs(groundTone(x, y, seed) - groundTone(x, y + 1, seed)),
          );
        }
      }
    }
    expect(worst).toBeLessThan(0.07);
  });

  /** …and it has to actually vary, or the whole thing is an expensive constant.
   *  Measured across a screen's worth of ground, not the whole world: a field
   *  that only swings when you walk a thousand tiles is flat where you stand. */
  it("varies across a single screen", () => {
    for (const seed of [1, 7, 4242]) {
      let lo = 1;
      let hi = 0;
      for (let x = 0; x < 40; x++) {
        for (let y = 0; y < 25; y++) {
          const t = groundTone(x, y, seed);
          lo = Math.min(lo, t);
          hi = Math.max(hi, t);
        }
      }
      expect(hi - lo).toBeGreaterThan(0.15);
    }
  });
});
