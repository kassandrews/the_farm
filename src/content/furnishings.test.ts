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
        // A WALL-MOUNTED piece has no footprint in the grid at all: it hangs on
        // a vertical face, so there is no tile depth to draw and its height is
        // the whole of it. Getting this wrong is invisible in a screenshot — the
        // picture just hangs a few pixels low — which is why it is asserted.
        const want = def.mount === "wall" ? def.height : rise + h * TILE + def.height;
        expect(grid.rows).toHaveLength(want);
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

    // A MOVING PIECE has to keep every promise a still one does, in every
    // frame. The size contract above only ever sees frame 0 — a band a row
    // short or a character wide would pass it and then, three frames later,
    // slide the fire off the hearth or draw it in nothing at all.
    const anim = art.anim;
    if (anim) {
      it(`${id} starts on its still art`, () => {
        // Frame 0 must BE the `s` grid, or the build menu's thumbnail (which
        // never animates) and the piece the moment it is placed disagree.
        expect(gridFor(art, "s", 0).grid.rows).toEqual(art.s.rows);
      });

      it(`${id} cycles`, () => {
        // Past the end and back to the start: the caller counts frames off a
        // clock that runs for as long as the game is open.
        expect(gridFor(art, "s", anim.frames.length).grid.rows).toEqual(art.s.rows);
        expect(gridFor(art, "s", 1).grid.rows).not.toEqual(art.s.rows);
      });

      it(`${id} keeps its back and sides still`, () => {
        // The animation is the front view's alone. A back with no fire in it
        // has nothing to move, and moving it anyway would be the flame's rows
        // landing on masonry.
        for (const facing of FACINGS) {
          if (facing === "s") continue;
          const still = gridFor(art, facing, 0).grid.rows;
          for (let f = 1; f < anim.frames.length; f++) {
            expect(gridFor(art, facing, f).grid.rows, `${id}/${facing} frame ${f}`).toEqual(still);
          }
        }
      });

      for (let f = 0; f < anim.frames.length; f++) {
        it(`${id} frame ${f} is the same size and palette as the still art`, () => {
          const { grid } = gridFor(art, "s", f);
          const { w } = footprint(def, "s");
          expect(grid.rows).toHaveLength(art.s.rows.length);
          for (const row of grid.rows) expect(row).toHaveLength(w * TILE);
          for (const row of grid.rows) {
            for (const ch of row) {
              if (ch === "." || ch === "c" || ch === "t" || ch === "s") continue;
              expect(grid.palette[ch], `${id} frame ${f} uses "${ch}"`).toBeTruthy();
            }
          }
        });
      }

      it(`${id} holds each frame long enough to read`, () => {
        // A cycle, not a flicker: under about a tenth of a second the frames
        // blur into a bright smear and the silhouette stops being one.
        expect(anim.holdMs).toBeGreaterThanOrEqual(100);
      });
    }

    it(`${id} uses the finish somewhere`, () => {
      // A grid painted entirely in literals would ignore the finish the player
      // chose, which is the one thing furniture has always got right.
      const { grid } = gridFor(art, "s");
      expect(grid.rows.join("")).toMatch(/[cts]/);
    });
  }
});
