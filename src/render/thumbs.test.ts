import { describe, it, expect } from "vitest";
import { swatchBox, thumbBox } from "./thumbs";
import { FURNITURE_ART } from "../content/furnishings";
import { FURNITURE, type FurnitureId, type Facing } from "../content/furniture";
import { gridFor } from "./furnishings";
import { forEachGrainMark, GRAIN } from "./grain";

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

describe("the swatch box", () => {
  /** Which courses of a floor swatch `w` wide have a butt joint inside them. The
   *  swatch's own spec (thumbs.ts §surfaceThumb): world origin, always jointed. */
  function jointedCourses(w: number): number {
    const g = GRAIN.wood;
    const rows = new Set<number>();
    forEachGrainMark(
      { wx: 0, wy: 0, w, h: swatchBox(1).h, axis: "h", course: g.course, joint: g.joint, bond: g.bond },
      (_x, y, _mw, _mh, ink) => {
        if (ink === "joint") rows.add(y);
      },
    );
    return rows.size;
  }

  // WHY THE SWATCH IS TWO TILES WIDE, made mechanical. A board butts every 47px
  // and a flagstone every 9, and that difference is most of what tells the two
  // surfaces apart at this size — so a swatch too narrow to contain a joint
  // shows the player two colours and calls them two floors. The width is not a
  // number anyone would defend by looking at one swatch, which is exactly why it
  // wants a test: one tile looks fine, and is wrong three courses in four.
  it("is wide enough that every course of boards shows a joint", () => {
    const courses = Math.ceil(swatchBox(1).h / GRAIN.wood.course);
    expect(jointedCourses(swatchBox(1).w)).toBe(courses);
    // …and the one-tile swatch this rejected, so the reason stays on the record.
    expect(jointedCourses(16)).toBeLessThan(courses);
  });

  // The seams are 1px lines. A fractional scale lands them between device pixels
  // and a floor comes back with some boards wider than others — CLAUDE.md's
  // sprite rule, and the swatches are the most fragile thing in the HUD under it.
  it("scales by whole numbers", () => {
    const one = swatchBox(1);
    expect(swatchBox(2)).toEqual({ w: one.w * 2, h: one.h * 2 });
    expect(swatchBox(3)).toEqual({ w: one.w * 3, h: one.h * 3 });
  });
});
