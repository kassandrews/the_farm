import { describe, it, expect } from "vitest";
import { surveyLabel } from "./survey";
import { PLAZA } from "./world";

describe("the survey reference", () => {
  it("reads zero on the datum", () => {
    expect(surveyLabel(0, 0)).toBe("0 · 0");
  });

  it("puts the datum inside the plaza", () => {
    // The reading is only worth steering by if the place it points at is the
    // place you want to get back to. If the plaza ever moves off the origin,
    // "walk toward zero" stops meaning "walk home" and this whole feature
    // quietly starts lying.
    expect(PLAZA.x0).toBeLessThanOrEqual(0);
    expect(PLAZA.x1).toBeGreaterThanOrEqual(0);
    expect(PLAZA.y0).toBeLessThanOrEqual(0);
    expect(PLAZA.y1).toBeGreaterThanOrEqual(0);
  });

  it("names the compass leg the way the screen runs", () => {
    // +y is DOWN the screen, so +y is south. Backwards here and the readout is
    // an elaborate way to walk the wrong direction.
    expect(surveyLabel(42, 118)).toBe("E 42 · S 118");
    expect(surveyLabel(-42, -118)).toBe("W 42 · N 118");
  });

  it("keeps the datum off the plaza's centre, because that is the joke", () => {
    // The Notebook's `the-datum` entry says it out loud — "the plaza is eleven
    // across and nine deep, and the zero is not in the middle of it" — and since
    // the peg is drawn on the ground at (0,0) the gag is now visible as well as
    // written. Both depend on this staying true, and a tidy-minded change to
    // PLAZA that centred the rectangle would silently delete a joke in two
    // places at once. Eleven across IS centred on x; nine deep is not on y.
    const midX = (PLAZA.x0 + PLAZA.x1) / 2;
    const midY = (PLAZA.y0 + PLAZA.y1) / 2;
    expect(midX).toBe(0);
    expect(midY).not.toBe(0);
  });

  it("prints a bare zero on an axis you're sitting on", () => {
    expect(surveyLabel(0, 7)).toBe("0 · S 7");
    expect(surveyLabel(-3, 0)).toBe("W 3 · 0");
  });
});
