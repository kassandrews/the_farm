import { describe, expect, it } from "vitest";
import { trunkSpan } from "./renderer";

// A tree is drawn around one column, `cx`: the crown spans cx-h .. cx+h, the
// bark grid is centred there, the crownGaps notch straddles it, the contact
// shadow and the orb spots hang off it. The trunk is the only part with a width
// of its own, so it is the only part that can quietly stop agreeing with the
// rest — and it has, twice, both times because someone made the trees bigger.
describe("trunkSpan", () => {
  it("is centred on the tree's own column at every girth", () => {
    for (let girth = 0; girth <= 6; girth++) {
      const { dx, w } = trunkSpan(girth);
      // Left gap and right gap from cx, measured the same way the crown is:
      // inclusive columns dx .. dx + w - 1 either side of 0.
      expect(-dx, `girth ${girth} leans left`).toBe(dx + w - 1);
    }
  });

  it("stays odd, which is what centring on a column requires", () => {
    for (let girth = 0; girth <= 6; girth++) {
      expect(trunkSpan(girth).w % 2, `girth ${girth}`).toBe(1);
    }
  });

  it("grows symmetrically — girth never moves the centre", () => {
    const base = trunkSpan(0);
    for (let girth = 1; girth <= 6; girth++) {
      const { dx, w } = trunkSpan(girth);
      expect(dx).toBe(base.dx - girth);
      expect(w).toBe(base.w + girth * 2);
    }
  });
});
