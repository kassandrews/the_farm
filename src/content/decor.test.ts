// The biome decor kits. Every assertion here is a rule the renderer RELIES on
// rather than a style preference — a kit is authored as strings, so nothing
// stops a mark being the wrong shape except this file.

import { describe, it, expect } from "vitest";
import { BIOMES } from "./biomes";
import { MOTE_MAX } from "../render/renderer";

const TILE = 16; // matches renderer.ts's scene px per tile

const kits = Object.values(BIOMES)
  .filter((b) => b.decor)
  .map((b) => [b.id, b.decor!] as const);

describe("decor kits", () => {
  it("exist on some regions and not on the meadow", () => {
    expect(kits.length).toBeGreaterThan(0);
    // The town's own region stays plain, so walking out of it is when the ground
    // starts having things in it. Not a promise the way the meadow's identity
    // tints are — decor is render-only and cannot re-landscape anybody's home —
    // but it is the grain the far country already has (DESIGN §Biomes).
    expect(BIOMES.meadow.decor).toBeUndefined();
  });

  for (const [id, kit] of kits) {
    describe(id, () => {
      it("fits inside its own cell with a pixel to spare", () => {
        // THE BAND RULE, AS ARITHMETIC. The renderer insets a mark by one pixel
        // on every side, so a mark this size can never touch the mark in the
        // next cell — and two marks that touch across a cell boundary are two
        // edges pairing on the grid, which is the thing CLAUDE.md says has
        // caught this project three times.
        for (const mark of kit.marks) {
          expect(mark.length, `${id}: a mark is too tall`).toBeLessThanOrEqual(TILE - 2);
          for (const row of mark) {
            expect(row.length, `${id}: a mark row is too wide`).toBeLessThanOrEqual(TILE - 2);
          }
        }
      });

      it("has more than one mark", () => {
        // 8c's finding, and the reason `marks` is a list: the eye finds a
        // repeated glyph long before it notices the placement underneath is
        // random, so one shape scattered perfectly randomly still reads as a
        // printed repeat rather than as ground.
        expect(kit.marks.length).toBeGreaterThan(1);
      });

      it("uses only inks it has", () => {
        const usesAccent = kit.marks.some((m) => m.some((r) => r.includes("o")));
        for (const mark of kit.marks) {
          for (const row of mark) {
            expect(row, `${id}: unknown ink`).toMatch(/^[.xo]*$/);
          }
        }
        // An `o` with no accent silently falls back to the stem colour, which
        // looks like a shape that came out wrong rather than like a missing row.
        if (usesAccent) expect(kit.accent, `${id}: uses 'o' with no accent`).toBeTruthy();
        if (kit.accent) expect(usesAccent, `${id}: declares an accent nothing uses`).toBe(true);
      });

      it("is sparser than the tuft it lies on top of", () => {
        // The tuft covers 38% and is the texture that makes grass read as grass.
        // Decor is the layer above it; at a comparable density the ground stops
        // being ground and becomes pattern.
        expect(kit.density).toBeGreaterThan(0);
        expect(kit.density).toBeLessThan(0.25);
      });
    });
  }
});

describe("motes", () => {
  const kits = Object.values(BIOMES)
    .filter((b) => b.motes)
    .map((b) => [b.id, b.motes!] as const);

  it("stays under the renderer's early-out", () => {
    // `drawMotes` tests `h > MOTE_MAX` BEFORE asking which region a cell is in,
    // because the field costs nine sites and almost no cell has motes. A kit
    // above that ceiling is silently capped — it would look like a density that
    // stopped responding, which is the worst kind of bug to chase.
    for (const [id, kit] of kits) {
      expect(kit.density, `${id} is above MOTE_MAX`).toBeLessThanOrEqual(MOTE_MAX);
    }
  });

  it("is rare across the table", () => {
    // Air that moves everywhere is air nobody notices. A restraint assertion
    // rather than a correctness one, here so that adding another is a decision
    // somebody takes on purpose.
    //
    // Raised from three when the meadow and the pines got fireflies. The count
    // is a weaker guard than it was and the reason is in the test above: two of
    // these five are dark for nine months of the year, so what is actually rare
    // is a region with air in it TONIGHT.
    expect(kits.length).toBeLessThanOrEqual(5);
  });

  it("actually moves", () => {
    for (const [id, kit] of kits) {
      expect(kit.period, `${id} has no cycle`).toBeGreaterThan(0);
      expect(Math.abs(kit.drift), `${id} does not drift`).toBeGreaterThan(0);
    }
  });

  it("only flashes after dark, unless the light there is already wrong", () => {
    // A blink reads as a light source, and a light source in daylight is a dot.
    // The dusk is the single exception and it earns it: that region's premise is
    // that its light is wrong at NOON (see its `ground` tint and the note on it),
    // so fireflies over it at midday are the point rather than a mistake.
    //
    // Named rather than allowed generally, so a second all-day flasher has to
    // come here and argue for itself.
    for (const [id, kit] of kits) {
      if (kit.flash && !kit.night) expect(id, `${id} flashes by day`).toBe("dusk");
    }
  });

  it("keeps the near regions to one season", () => {
    // Air everywhere is air nobody notices. The near regions get it only on a
    // summer night, which is what keeps "most regions have no air" true in the
    // way that matters — most of the TIME, rather than most of the table.
    for (const [id, kit] of kits) {
      if (kit.night) expect(kit.season ?? "summer", `${id}`).toBe("summer");
    }
  });

  it("names no animal", () => {
    // There is no fauna in this game (sim/notebook.test.ts guards the same rule
    // for the Notebook). A mote is pollen, a petal, a spore — never a midge.
    for (const [id, kit] of kits) {
      // The dusk's fireflies are LIGHT (DESIGN §"Living light"), so the guard is
      // on the id and the ink — a region may not be named for a creature, and a
      // mote may not be one. Nothing here has a sprite, a schedule or a
      // footprint; if it did it would be a resident, and residents live in town.
      expect(`${id} ${kit.color}`).not.toMatch(/bug|midge|bee|moth|bird|fish/i);
    }
  });
});
