import { describe, it, expect } from "vitest";
import { thumbBox } from "./thumbs";
import { FURNITURE_ART } from "../content/furnishings";
import { FURNITURE, type FurnitureId, type Facing } from "../content/furniture";
import { gridFor } from "./furnishings";

const TILE = 16;
const FACINGS: Facing[] = ["s", "n", "e", "w"];

describe("thumbBox", () => {
  // The catalogue tile is a FIXED box with the art standing on its floor line,
  // so a piece whose art is taller than the box hangs out of its own tile and
  // over the name of the one beside it. That is what a turned dresser did, and
  // it was invisible until somebody pressed R with the storage tab open. This
  // asserts the box clears every piece in every facing, which is the check the
  // eye cannot do — no screenshot shows all nineteen pieces turned four ways.
  it("clears every piece in every facing", () => {
    const box = thumbBox(1);
    for (const id of Object.keys(FURNITURE) as FurnitureId[]) {
      const def = FURNITURE[id];
      const art = FURNITURE_ART[id];
      for (const facing of FACINGS) {
        let w: number;
        let h: number;
        if (art) {
          const { grid } = gridFor(art, facing);
          w = grid.rows.reduce((m, r) => Math.max(m, r.length), 0);
          h = grid.rows.length;
        } else {
          const turned = facing === "e" || facing === "w";
          w = (turned ? def.h : def.w) * TILE;
          h = (turned ? def.w : def.h) * TILE + def.height;
        }
        expect(`${id}/${facing} w=${w}`).toBe(`${id}/${facing} w=${Math.min(w, box.w)}`);
        expect(`${id}/${facing} h=${h}`).toBe(`${id}/${facing} h=${Math.min(h, box.h)}`);
      }
    }
  });

  // The scale is device px per scene px and the art is authored at scene px, so
  // a fractional factor resamples the outlines off the grid — the one thing
  // CLAUDE.md forbids outright. The box has to scale by exactly the same whole
  // number the thumbs do, or the tiles stop being sized to their contents.
  it("scales by whole numbers", () => {
    const one = thumbBox(1);
    expect(thumbBox(2)).toEqual({ w: one.w * 2, h: one.h * 2 });
    expect(thumbBox(3)).toEqual({ w: one.w * 3, h: one.h * 3 });
  });
});
