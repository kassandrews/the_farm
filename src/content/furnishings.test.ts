import { describe, it, expect } from "vitest";
import { FURNITURE, footprint } from "./furniture";
import type { FurnitureId, Facing } from "./furniture";
import { FURNITURE_ART } from "./furnishings";
import { gridFor, INK } from "../render/furnishings";

const TILE = 16; // renderer.ts's scene tile, and the unit these grids are in.
const FACINGS: Facing[] = ["s", "n", "e", "w"];
const ids = Object.keys(FURNITURE_ART) as FurnitureId[];

describe("furniture art", () => {
  it("has something to check", () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  // THE SIZE IS THE CONTRACT. A grid is blitted 1:1 at the anchor's top-left
  // lifted by `height + rise`, so a row too many or a column too few slides the
  // piece off its own tile — and it slides by ONE PIXEL, which is exactly the
  // kind of wrong that survives a screenshot and gets found weeks later.
  for (const id of ids) {
    const art = FURNITURE_ART[id]!;
    const def = FURNITURE[id];
    const rise = art.rise ?? 0;

    for (const facing of FACINGS) {
      const { grid } = gridFor(art, facing);
      const { w, h } = footprint(def, facing);

      it(`${id} facing ${facing} is exactly its footprint wide`, () => {
        for (const row of grid.rows) expect(row).toHaveLength(w * TILE);
      });

      it(`${id} facing ${facing} is rise + footprint + height tall`, () => {
        expect(grid.rows).toHaveLength(rise + h * TILE + def.height);
      });
    }

    it(`${id} rises less than half a tile`, () => {
      // `hides()` fades anything overhanging by more than half a tile. Furniture
      // that made the player see-through would be the occlusion machinery
      // firing on the wrong thing — roofs are meant to be its first user.
      expect(rise).toBeLessThan(TILE / 2);
    });

    it(`${id} declares every colour it uses`, () => {
      // `c`, `t` and `s` are the finish and are resolved at raster time; `.` is
      // transparent; `k` must be the shared ink. Anything else has to be in the
      // piece's own palette or it silently draws nothing.
      for (const facing of FACINGS) {
        const { grid } = gridFor(art, facing);
        for (const row of grid.rows) {
          for (const ch of row) {
            if (ch === "." || ch === "c" || ch === "t" || ch === "s") continue;
            expect(grid.palette[ch], `${id}/${facing} uses "${ch}"`).toBeTruthy();
          }
        }
      }
    });

    it(`${id} outlines in the shared ink`, () => {
      for (const facing of FACINGS) {
        const { grid } = gridFor(art, facing);
        if (grid.palette.k) expect(grid.palette.k).toBe(INK);
      }
    });

    it(`${id} uses the finish somewhere`, () => {
      // A grid painted entirely in literals would ignore the finish the player
      // chose, which is the one thing furniture has always got right.
      const { grid } = gridFor(art, "s");
      expect(grid.rows.join("")).toMatch(/[cts]/);
    });
  }
});
