// The homestead emblems are hand-counted character grids, with the same single
// failure mode `icons.test.ts` was written for: a row one cell short. The
// rasterizer is deliberately forgiving (a short row just leaves transparent
// cells), so a miscount doesn't throw — it punches a hole in a beach, or slides
// the star a pixel, and you are left squinting at a 72px picture. Count them.
//
// The emblems are NOT in `ICONS` and so are not covered by that file: they are
// 24×16, and its whole first assertion is that a grid is 12×12.

import { describe, expect, it } from "vitest";
import { SPOTS } from "./spots";

const W = 24;
const H = 16;

describe("homestead emblems", () => {
  it("offers each spot exactly once", () => {
    expect(SPOTS.map((s) => s.id).sort()).toEqual(["coast", "forest", "riverside"]);
  });

  for (const spot of SPOTS) {
    describe(spot.id, () => {
      it(`is ${H} rows of ${W} cells`, () => {
        expect(spot.emblem.rows).toHaveLength(H);
        // Reported as a list so a miscount names the row rather than failing on
        // the first and hiding the other three.
        const wrong = spot.emblem.rows
          .map((row, y) => ({ y, len: row.length }))
          .filter((r) => r.len !== W);
        expect(wrong).toEqual([]);
      });

      it("uses no colour it hasn't declared", () => {
        const unknown = new Set<string>();
        for (const row of spot.emblem.rows) {
          for (const ch of row) {
            if (ch !== "." && !(ch in spot.emblem.palette)) unknown.add(ch);
          }
        }
        expect([...unknown]).toEqual([]);
      });

      it("declares no colour it doesn't use", () => {
        // A stale palette entry is the trail that leads to "I changed the sand
        // and nothing happened".
        const used = new Set([...spot.emblem.rows.join("")]);
        expect(Object.keys(spot.emblem.palette).filter((c) => !used.has(c))).toEqual([]);
      });

      it("keeps its water along the bottom", () => {
        // The promises are about DISTANCE, never bearing: the coast's sea is on a
        // hashed bearing and the river's crossing angle is the seed's. An emblem
        // with water up one side would be asserting a compass the generator never
        // agreed to. Bottom edge only — which reads as "near", not as "west".
        const water = new Set(["w", "W"]);
        spot.emblem.rows.forEach((row, y) => {
          if ([...row].some((ch) => water.has(ch))) expect(y).toBeGreaterThan(H / 2);
        });
      });
    });
  }
});
