// The biome field. Two things are under test here and they pull in opposite
// directions: the world has to be VARIED out there, and it has to be UNCHANGED
// where the town is.
//
// The second one is why this file exists at all. Base terrain isn't stored, so
// the generator is the only record of what a town's ground looks like — ship one
// that answers differently and you have re-landscaped every live save.

import { describe, it, expect } from "vitest";
import {
  biomeAt,
  blossomCentre,
  generatedTile,
  homesteadOrigin,
  PLAZA,
  HOME_REGION_REACH,
} from "./world";
import { BIOMES, FIELD_BIOMES } from "../content/biomes";
import type { HomesteadSpot } from "./types";

const SPOTS: HomesteadSpot[] = ["riverside", "forest", "hilltop"];

describe("the biome field", () => {
  it("is a stable fact about a town, not a roll", () => {
    for (const spot of SPOTS) {
      for (let i = 0; i < 50; i++) {
        const x = 100 + i * 7;
        const y = -60 - i * 3;
        expect(biomeAt(99, spot, x, y)).toBe(biomeAt(99, spot, x, y));
      }
    }
  });

  it("lays out differently in different towns", () => {
    // The same coordinate, a hundred seeds: if the field ignored the seed this
    // would be one answer a hundred times.
    const seen = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) seen.add(biomeAt(seed, "hilltop", 150, 90));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("uses the whole table within a day's walk", () => {
    // Not just "more than one biome exists" — every region the field can roll has
    // to actually turn up somewhere reachable, or a row in the table is a row
    // nobody will ever see.
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (let x = -220; x <= 220; x += 11) {
        for (let y = -220; y <= 220; y += 11) seen.add(biomeAt(seed, "hilltop", x, y));
      }
    }
    for (const id of new Set(FIELD_BIOMES)) expect(seen).toContain(id);
    expect(seen).toContain("blossom"); // sited, not rolled, but it must exist
  });

  it("draws borders that don't follow the macro grid", () => {
    // A hashed grid would change biome only on multiples of the cell size, so
    // every border would be a straight line 64 tiles long. Walk a row and collect
    // where the answer changes: those columns must not all share a factor.
    const changes: number[] = [];
    let prev = biomeAt(7, "hilltop", -400, 33);
    for (let x = -399; x <= 400; x++) {
      const b = biomeAt(7, "hilltop", x, 33);
      if (b !== prev) changes.push(x);
      prev = b;
    }
    expect(changes.length).toBeGreaterThan(2);
    // Boundaries land wherever the geometry puts them, not on cell multiples.
    expect(changes.some((x) => x % 64 !== 0)).toBe(true);
  });
});

describe("the town's own ground is untouched", () => {
  /** Every cell the town and homestead occupy, plus a margin. If any of these
   *  stops being meadow, a live save's terrain has moved. */
  function townCells(spot: HomesteadSpot) {
    const home = homesteadOrigin(spot);
    const cells: { x: number; y: number }[] = [];
    for (let y = PLAZA.y0 - 2; y <= Math.max(PLAZA.y1, home.y + 5) + 2; y++) {
      for (let x = PLAZA.x0 - 2; x <= Math.max(PLAZA.x1, home.x + 5) + 2; x++) {
        cells.push({ x, y });
      }
    }
    return cells;
  }

  it("is meadow across every cell of the town, on a thousand seeds", () => {
    for (const spot of SPOTS) {
      for (const { x, y } of townCells(spot)) {
        // One seed would prove nothing: the field is seeded, so this is exactly
        // the kind of guarantee that holds on the seed you happened to test.
        for (let seed = 1; seed <= 1000; seed++) {
          if (biomeAt(seed, spot, x, y) !== "meadow") {
            throw new Error(`seed ${seed} ${spot}: (${x},${y}) is not meadow`);
          }
        }
      }
    }
  });

  it("reaches at least as far as it promises, in every direction", () => {
    for (let seed = 1; seed <= 300; seed++) {
      for (let a = 0; a < 32; a++) {
        const th = (a / 32) * Math.PI * 2;
        const x = Math.round(Math.cos(th) * HOME_REGION_REACH);
        const y = Math.round(Math.sin(th) * HOME_REGION_REACH);
        expect(biomeAt(seed, "hilltop", x, y)).toBe("meadow");
      }
    }
  });

  /** The meadow row is all identities, and this is what that is FOR. If someone
   *  ever tunes a number in it, the terrain under every existing town moves and
   *  this test is the thing that says so. */
  it("keeps the meadow row at identity, because saves depend on it", () => {
    const m = BIOMES.meadow;
    expect(m.trees).toBe(1);
    expect(m.rocks).toBe(1);
    expect(m.mushrooms).toBe(0);
    expect(m.water).toBe(0);

    for (const tint of [m.ground, m.tuft, m.crown, m.trunk]) expect(tint.amount).toBe(0);
  });

  /** And the belt to that braces: the tiles themselves, not just the biome id.
   *  Nothing the field does may put a solid tile inside the town — a tree where
   *  somebody's floor is would break the room, the roof and the walk home. */
  it("generates nothing solid inside the plaza or the homestead clearing", () => {
    for (const spot of SPOTS) {
      const home = homesteadOrigin(spot);
      for (let seed = 1; seed <= 200; seed++) {
        for (let y = PLAZA.y0; y <= PLAZA.y1; y++) {
          for (let x = PLAZA.x0; x <= PLAZA.x1; x++) {
            expect(generatedTile(seed, spot, x, y)).toBe(3 /* STONE, the paving */);
          }
        }
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const t = generatedTile(seed, spot, home.x + dx, home.y + dy);
            expect([0 /* GRASS */, 3 /* STONE */]).toContain(t);
          }
        }
      }
    }
  });
});

describe("the blossom rows", () => {
  it("are one place per town, out past the other landmarks", () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const spot of SPOTS) {
        const c = blossomCentre(seed, spot);
        // Past the cube (58). You are told about this one — an arrival can ask to
        // live here — so it sits further out than the secrets nobody mentions.
        expect(Math.hypot(c.x, c.y)).toBeGreaterThan(58);
        expect(biomeAt(seed, spot, c.x, c.y)).toBe("blossom");
      }
    }
  });

  it("never lands in the sea of a riverside town", () => {
    // The onLand bug, third landmark, same test. A riverside town is water from
    // x = -13 westward without limit, so an orchard on a seeded bearing alone
    // drowns in about half of them.
    for (let seed = 1; seed <= 500; seed++) {
      const c = blossomCentre(seed, "riverside");
      expect(c.x).toBeGreaterThan(-12);
    }
  });

  it("is not something the field can roll", () => {
    // It has to be found. A copy turning up in a random band would cost it the
    // only thing that makes it worth the walk.
    expect(FIELD_BIOMES).not.toContain("blossom");
  });
});
