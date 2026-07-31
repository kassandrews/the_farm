// Same deal as icons.test.ts: these are hand-counted character grids, and the
// rasterizer is forgiving about a miscount — a short row just goes transparent.
// The failure that produces is a roof slope with one pixel missing out of forty,
// which nobody spots on a title screen and everybody feels. So: count them here.
//
// Props differ from icons in one way that matters to this file — they are NOT
// all one size. Width is defined as the longest row, so the check is that every
// row agrees with it, not that it equals some constant.

import { describe, expect, it } from "vitest";
import { PROPS } from "./props";
import { INK } from "./canon/icons";

describe("prop grids", () => {
  for (const [name, def] of Object.entries(PROPS)) {
    describe(name, () => {
      it("is rectangular", () => {
        const w = Math.max(...def.rows.map((r) => r.length));
        const wrong = def.rows
          .map((row, y) => ({ y, len: row.length }))
          .filter((r) => r.len !== w);
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
        const used = new Set([...def.rows.join("")].filter((c) => c !== "."));
        expect(Object.keys(def.palette).filter((c) => !used.has(c))).toEqual([]);
      });

      it("outlines in the shared ink", () => {
        // `k` is reserved for INK across icons and props alike. A prop inking
        // itself differently is how the scene stops looking like one scene —
        // see the note on the bird, which uses a different KEY precisely so it
        // can use a different colour honestly.
        if ("k" in def.palette) expect(def.palette.k).toBe(INK);
      });

      it("has ink in every row and column", () => {
        // A grid whose last row or right-hand column is entirely `.` is a
        // miscount that the rectangularity check can't see: every row is the
        // same width, and one of them is padding. It also catches a prop that
        // has drifted off its own grid after an edit.
        const w = Math.max(...def.rows.map((r) => r.length));
        const emptyRows = def.rows
          .map((row, y) => ({ y, empty: [...row].every((c) => c === ".") }))
          .filter((r) => r.empty && (r.y === 0 || r.y === def.rows.length - 1));
        expect(emptyRows).toEqual([]);
        const colInked = (x: number) => def.rows.some((r) => r[x] && r[x] !== ".");
        expect({ first: colInked(0), last: colInked(w - 1) }).toEqual({ first: true, last: true });
      });
    });
  }
});
