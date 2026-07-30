// These icons are hand-counted character grids, which is a format with exactly
// one failure mode: a row that is 11 or 13 cells wide instead of 12. The
// rasterizer is deliberately forgiving about it (short rows just go transparent),
// so a miscount doesn't throw — it silently shifts a highlight one pixel left,
// or drops the right-hand outline of one row, and you have to spot it by eye at
// 12 pixels. That is a bad deal. So: count them here.

import { describe, expect, it } from "vitest";
import { ICONS } from "./icons";
import { INK } from "./canon/icons";

const CELL = 12;

describe("icon grids", () => {
  for (const [name, def] of Object.entries(ICONS)) {
    describe(name, () => {
      it("is 12 rows of 12 cells", () => {
        expect(def.rows).toHaveLength(CELL);
        // Reported as a list so a miscount names the row instead of just failing
        // the first one and hiding the other three.
        const wrong = def.rows
          .map((row, y) => ({ y, len: row.length }))
          .filter((r) => r.len !== CELL);
        expect(wrong).toEqual([]);
      });

      it("uses no colour it hasn't declared", () => {
        const unknown = new Set<string>();
        for (const row of def.rows) {
          for (const ch of row) {
            if (ch !== "." && !(ch in def.palette)) unknown.add(ch);
          }
        }
        expect([...unknown]).toEqual([]);
      });

      it("declares no colour it doesn't use", () => {
        // A stale palette entry is a leftover from an edit, and it's the trail
        // that leads to "I changed the highlight and nothing happened".
        const used = new Set([...def.rows.join("")].filter((c) => c !== "."));
        expect(Object.keys(def.palette).filter((c) => !used.has(c))).toEqual([]);
      });

      it("outlines in the shared ink", () => {
        // Every icon reserves `k` for INK. One icon inking itself differently is
        // how a set stops looking like a set (see the house rules in icons.ts).
        if ("k" in def.palette) expect(def.palette.k).toBe(INK);
      });

      // A glyph crammed against one edge of its cell floats small and off-centre
      // beside its neighbours — The Meadow's rock shipped that way, stopping after
      // seven rows, and the note it left is why this is checked at all.
      //
      // What's measured is the BOUNDING BOX, not how many rows have ink in them:
      // the menu icon is three bars with deliberate gaps, and a rug and a table
      // are genuinely flat objects. Those are correct art. Being jammed into the
      // top half is not, and only the box can tell the difference.
      const bounds = (n: number, inked: (i: number) => boolean) => {
        const on = [...Array(n).keys()].filter(inked);
        return { lo: on[0], hi: on[on.length - 1] };
      };

      it("sits centred in the cell", () => {
        const rows = bounds(def.rows.length, (y) => [...def.rows[y]].some((c) => c !== "."));
        const cols = bounds(CELL, (x) => def.rows.some((r) => r[x] && r[x] !== "."));
        expect(rows.hi - rows.lo + 1).toBeGreaterThanOrEqual(7);
        // Margins within 2 of each other. A 12-wide grid has no true centre
        // column, so this is deliberately loose — it catches "shoved to one
        // side", not "one pixel off".
        expect(Math.abs(rows.lo - (def.rows.length - 1 - rows.hi))).toBeLessThanOrEqual(2);
        expect(Math.abs(cols.lo - (CELL - 1 - cols.hi))).toBeLessThanOrEqual(2);
      });
    });
  }
});
