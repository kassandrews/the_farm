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
import { ROCK, WATER, SHALLOW, SAND } from "../content/tiles";
import type { HomesteadSpot } from "./types";

const SPOTS: HomesteadSpot[] = ["riverside", "forest", "coast"];

/** BIOMES.blossom's radius, mirrored here so the orchard-in-the-sea test can
 *  check its EDGES and not merely its centre — a stand whose far side is in the
 *  surf is the same bug at a smaller radius. */
const BLOSSOM_R = 9;

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
    for (let seed = 1; seed <= 100; seed++) seen.add(biomeAt(seed, "forest", 150, 90));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("uses the whole table within a day's walk", () => {
    // Not just "more than one biome exists" — every region the field can roll has
    // to actually turn up somewhere reachable, or a row in the table is a row
    // nobody will ever see.
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (let x = -220; x <= 220; x += 11) {
        for (let y = -220; y <= 220; y += 11) seen.add(biomeAt(seed, "forest", x, y));
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
    let prev = biomeAt(7, "forest", -400, 33);
    for (let x = -399; x <= 400; x++) {
      const b = biomeAt(7, "forest", x, 33);
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
        expect(biomeAt(seed, "forest", x, y)).toBe("meadow");
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

  it("never lands in the sea, on any spot", () => {
    // The onLand bug, third landmark, same test — but asking the question the
    // right way round now. It used to assert `c.x > -12`, which was never really
    // the invariant: it was the shape of the *fix* back when the sea was the
    // whole western half-plane and "not west of here" meant "not wet". With a
    // finite sea that sentence is false in both directions — there is dry land
    // far west, and there is water in every other direction too.
    //
    // So assert the thing we actually mean: no part of the orchard is water you
    // cannot walk through.
    //
    // SHALLOW IS ALLOWED, and the first draft of this test wrongly forbade it. A
    // stream running through the cherry trees is a nice thing to walk into, and
    // `onLand` deliberately only steers landmarks clear of the SEA and the LAKE
    // — the two bodies that can actually strand one. Forbidding the shallows
    // here would be asking the siting code to avoid something harmless, which is
    // how a test starts dictating the design instead of describing it.
    //
    // Sampling the edges and not just the centre is deliberate too: the sea's
    // shelf is 5 tiles, so an orchard sitting in the surf would show open water
    // at its rim even while its middle looked merely damp.
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 500; seed++) {
        const c = blossomCentre(seed, spot);
        for (const [dx, dy] of [[0, 0], [BLOSSOM_R, 0], [-BLOSSOM_R, 0], [0, BLOSSOM_R], [0, -BLOSSOM_R]]) {
          expect(generatedTile(seed, spot, c.x + dx, c.y + dy)).not.toBe(WATER);
        }
      }
    }
  });

  it("is not something the field can roll", () => {
    // It has to be found. A copy turning up in a random band would cost it the
    // only thing that makes it worth the walk.
    expect(FIELD_BIOMES).not.toContain("blossom");
  });
});

describe("rocks never touch", () => {
  // Two rocks sharing an edge read as one lumpy object with a seam down it, and
  // three silhouettes made that worse rather than better. The rule is arithmetic
  // (a rock must roll lower than all four neighbours — see rockIsLoneliest), so
  // this test is really asking whether the arithmetic still holds after anyone
  // touches the scatter.
  it("never generates two edge-on, anywhere, on any seed or spot", () => {
    for (const seed of [21, 99, 4242]) {
      for (const spot of SPOTS) {
        for (let y = -70; y <= 70; y++) {
          for (let x = -70; x <= 70; x++) {
            if (generatedTile(seed, spot, x, y) !== ROCK) continue;
            expect(generatedTile(seed, spot, x + 1, y)).not.toBe(ROCK);
            expect(generatedTile(seed, spot, x, y + 1)).not.toBe(ROCK);
          }
        }
      }
    }
  });

  it("still puts plenty of rock in the scrub — the rule is not a thinning", () => {
    // The compensation in content/biomes.ts §scrub. If a future edit reverts the
    // multiplier without reverting the rule, the scrub quietly stops being the
    // rocky one, and nothing else would notice.
    let rocks = 0;
    let tiles = 0;
    for (let y = -220; y <= 220; y += 3) {
      for (let x = -220; x <= 220; x += 3) {
        if (biomeAt(21, "forest", x, y) !== "scrub") continue;
        // Coast doesn't count. A scrub region that runs into the sea is still as
        // rocky as it ever was on the ground it has — counting the water and the
        // beach as un-rocky scrub measures the coastline, not the scatter, and
        // would turn any future change to where the sea sits into a mystifying
        // failure in a test about rocks.
        const t = generatedTile(21, "forest", x, y);
        if (t === WATER || t === SHALLOW || t === SAND) continue;
        tiles++;
        if (t === ROCK) rocks++;
      }
    }
    expect(tiles).toBeGreaterThan(200); // the sample is worth something
    expect(rocks / tiles).toBeGreaterThan(0.1); // and it is still strewn with them
  });

  it("leaves diagonals alone — corner to corner is a pair of rocks, not a seam", () => {
    // Deliberately NOT forbidden, so this is a decision under test rather than an
    // accident: with a tile of grass between the silhouettes, two rocks touching
    // at the corner read as scenery.
    let diagonals = 0;
    for (let y = -120; y <= 120; y++) {
      for (let x = -120; x <= 120; x++) {
        if (generatedTile(21, "forest", x, y) !== ROCK) continue;
        if (generatedTile(21, "forest", x + 1, y + 1) === ROCK) diagonals++;
      }
    }
    expect(diagonals).toBeGreaterThan(0);
  });
});
