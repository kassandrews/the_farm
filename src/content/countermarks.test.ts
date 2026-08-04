// The marks, checked for the things a char grid fails at silently.
//
// `pieceCanvas` drops any character with no palette entry, exactly as it drops
// `.` — which is the right behaviour for authoring (a short row is legal) and
// means a typo'd key is not an error, it is a hole in the art. At eight pixels a
// hole is most of the object. So these are the guards the rasterizer cannot be.

import { describe, it, expect } from "vitest";
import { COUNTER_MARKS } from "./countermarks";
import { COUNTERS } from "./counters";
import type { CounterId } from "./counters";

const IDS = Object.keys(COUNTER_MARKS) as CounterId[];

describe("every counter wears one", () => {
  it("has a mark for each counter and no orphans", () => {
    expect(new Set(IDS)).toEqual(new Set(Object.keys(COUNTERS)));
  });
});

describe("the grids rasterize to what they look like", () => {
  it("declares every character it draws", () => {
    // The silent one. A `d` in the rows with no `d` in the palette is a
    // transparent hole, and the seed sack's tie is three pixels wide.
    for (const id of IDS) {
      const { rows, palette } = COUNTER_MARKS[id];
      for (const [y, row] of rows.entries()) {
        for (const ch of row) {
          if (ch === ".") continue;
          expect(palette[ch], `${id} row ${y} draws "${ch}" with no colour`).toBeTruthy();
        }
      }
    }
  });

  it("draws every character it declares", () => {
    // The reverse, and it catches a redraw that left a key behind — the heap's
    // scales declared a highlight the paint tin that replaced them never used.
    for (const id of IDS) {
      const { rows, palette } = COUNTER_MARKS[id];
      const used = new Set(rows.join("").split(""));
      for (const ch of Object.keys(palette)) {
        expect(used.has(ch), `${id} declares "${ch}" and never draws it`).toBe(true);
      }
    }
  });

  it("keeps its rows the same length", () => {
    // Short rows are legal in the format and wrong in these: every one of these
    // marks is a symmetric object, and a row one short shaves a pixel off one
    // side only. The renderer centres by the widest row, so it would also shift
    // the whole mark half a pixel off the counter's midline.
    for (const id of IDS) {
      const { rows } = COUNTER_MARKS[id];
      const w = rows[0].length;
      for (const [y, row] of rows.entries()) {
        expect(row.length, `${id} row ${y} is ${row.length}, not ${w}`).toBe(w);
      }
    }
  });

  it("stays small enough to sit on a counter", () => {
    // Under 10px tall is the rule the file states, and the reason is that a mark
    // taller than that starts competing with the person beside it. The width cap
    // is the piece: every counter is two tiles across.
    for (const id of IDS) {
      const { rows } = COUNTER_MARKS[id];
      expect(rows.length, `${id} is ${rows.length}px tall`).toBeLessThanOrEqual(10);
      expect(rows[0].length, `${id} is ${rows[0].length}px wide`).toBeLessThanOrEqual(32);
    }
  });

  it("is drawn in something, not just outlined", () => {
    // The failure the first draft shipped: the stamp and the scales were mostly
    // INK, and an object that is 70% outline at this size reads as a smudge. A
    // silhouette needs a fill to be a silhouette.
    for (const id of IDS) {
      const { rows, palette } = COUNTER_MARKS[id];
      const chars = rows.join("").split("").filter((c) => c !== ".");
      const ink = chars.filter((c) => palette[c] === "#2b2540").length;
      expect(ink / chars.length, `${id} is ${Math.round((100 * ink) / chars.length)}% ink`).toBeLessThan(0.6);
    }
  });
});
