import { describe, it, expect } from "vitest";
import { FURNITURE } from "./furniture";

// --- trim ---------------------------------------------------------------------
// The second finish (§trim). These guard the thing the BUILD BAR depends on
// rather than the thing the art does: one row of swatches serves both slots, and
// a tap is routed by the class of the swatch tapped.
describe("the trim slot", () => {
  for (const def of Object.values(FURNITURE)) {
    if (!def.trim) continue;

    it(`${def.id}'s trim classes are disjoint from its finish classes`, () => {
      // THE PICKER'S WHOLE PREMISE. Wood dresses the cabinet, stone dresses the
      // worktop, and the tap knows which you meant because no class appears in
      // both lists. Overlap them and the row needs a second row, or a "which
      // part did you mean" question — which is the menu DESIGN §Materials
      // forbids. It is cheaper to forbid the overlap.
      for (const c of def.trim!) {
        expect(def.finishes, `${def.id} lists ${c} on both slots`).not.toContain(c);
      }
    });

    it(`${def.id} declares at least one trim class`, () => {
      expect(def.trim!.length).toBeGreaterThan(0);
    });
  }
});
