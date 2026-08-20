import { describe, it, expect } from "vitest";
import { FURNITURE } from "./furniture";
import type { FurnitureId } from "./furniture";
import { SETS, SET_ART, CATALOG_FORMS, artFor } from "./sets";
import { givenSetLine } from "./dialogue";
import { SKINS } from "./skins";
import type { SetId } from "./sets";

const setIds = Object.keys(SETS) as SetId[];

// THE LATTICE HAS NO HOLES. This is DESIGN §The catalog's one promise, and the
// reason it is a test rather than a policy is that a hole is invisible until
// somebody reaches for the piece: an incomplete set looks completely fine right
// up to the moment a player tries to finish a kitchen with it.
describe("the catalog lattice", () => {
  it("has forms in it", () => {
    // A guard on the guard. `CATALOG_FORMS` is derived by filtering a flag, and
    // a filter that silently matches nothing would make every assertion below
    // vacuously true — the completeness suite would go green by checking air.
    expect(CATALOG_FORMS.length).toBeGreaterThan(15);
  });

  for (const set of setIds) {
    for (const form of CATALOG_FORMS) {
      it(`${set} covers ${form}`, () => {
        // "Covered" means DRAWN, by either route: a grid in the set's table, or
        // one of the renderer's own bespoke paths. The four core pieces on the
        // second route are listed below, and the list is per set on purpose —
        // core earned those exceptions by predating the art table, and a NEW set
        // inherits none of them.
        const drawn = artFor(form, set) !== undefined || RENDERER_DRAWN[set]?.includes(form);
        expect(drawn, `${set} has no drawing for ${form}`).toBe(true);
      });
    }
  }

  it("every set's art is a form or a deliberate extra", () => {
    // The other direction, and it is not a completeness check — a set MAY carry
    // pieces beyond the checklist, which is where its personality lives. What
    // this catches is art for an id that is not furniture at all, i.e. a typo in
    // a key, which would otherwise be a drawing nobody ever renders.
    for (const set of setIds) {
      for (const id of Object.keys(SET_ART[set]) as FurnitureId[]) {
        expect(FURNITURE[id], `${set} has art for "${id}", which is not a furniture row`).toBeDefined();
      }
    }
  });

  it("a form never leaves the sim facts to the set", () => {
    // Sets own silhouettes; forms own footprint, solidity and cost. This is what
    // makes restyling a furnished room in place possible, so it is worth an
    // assertion that the checklist is made of real rows rather than a hope.
    for (const form of CATALOG_FORMS) {
      const def = FURNITURE[form];
      expect(def).toBeDefined();
      expect(def.w).toBeGreaterThan(0);
      expect(def.h).toBeGreaterThan(0);
    }
  });

  it("the town's own furniture is not a form", () => {
    // Nothing sells the notice board or the stage, so no set owes them a
    // drawing. If one of these ever gains `form: true` it puts an errands board
    // in the mid-century catalogue, which is funny but not intended.
    for (const id of ["noticeboard", "stage"] as FurnitureId[]) {
      expect(FURNITURE[id].form, `${id} should not be a catalog form`).toBeFalsy();
    }
  });

  it("exactly one set is a starter", () => {
    // Furnishing has to look good on hour one, and "every set unlocked" would
    // make the hunt meaningless. One, and it is core.
    const starters = setIds.filter((s) => SETS[s].starter);
    expect(starters).toEqual(["core"]);
  });
});

/** Forms a set draws through the renderer instead of through a grid.
 *
 *  Core's four are historical: they predate the art table and still have bespoke
 *  paths in renderer.ts (the lamp's brass head, the awning's canvas, and the two
 *  town fixtures which are not forms anyway). They are listed rather than
 *  detected so that adding a set cannot quietly inherit an exemption — a new
 *  set's row here would have to be written by hand, and writing it is the moment
 *  somebody asks why. */
const RENDERER_DRAWN: Partial<Record<SetId, FurnitureId[]>> = {
  // Both lights. A post is not a box, which is what took the lamp off the
  // generic path in the first place, and the lamp post is the half of that
  // split which kept the original drawing.
  core: ["lamp", "lamppost"],
};

describe("the given channel", () => {
  it("every given set has a line to be handed over with", () => {
    // skins.test.ts's rule, one axis over: a gift handed over in silence is a
    // vending machine.
    for (const id of setIds) {
      if (!SETS[id].given) continue;
      expect(givenSetLine(id), `${id} is given with no line`).toBeTruthy();
    }
  });

  it("a given set is never also a starter", () => {
    for (const id of setIds) {
      if (SETS[id].given) expect(SETS[id].starter, `${id} is both given and starter`).toBe(false);
    }
  });
});

describe("what a set brings", () => {
  it("brings only real, non-starter finishes", () => {
    // A `brings` id that is a starter would be a gift of something already
    // owned — silently nothing, which is worse than a typo.
    for (const id of setIds) {
      for (const skin of SETS[id].brings ?? []) {
        expect(SKINS[skin], `${id} brings "${skin}", which is not a finish`).toBeDefined();
        expect(SKINS[skin].starter, `${id} brings ${skin}, a starter`).toBeFalsy();
      }
    }
  });

  it("only a given set brings anything", () => {
    // The palette arrives in the handshake; a starter set with a `brings` list
    // would have no moment to hand it over in.
    for (const id of setIds) {
      if (SETS[id].brings?.length) expect(SETS[id].given, `${id} brings with no giver`).toBeDefined();
    }
  });
});
