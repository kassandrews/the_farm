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
  BLOSSOM_RADIUS,
  generatedTile,
  homesteadOrigin,
  PLAZA,
  HOME_REGION_REACH,
  regionStrangeness,
  regionParts,
  rollRegion,
} from "./world";
import { BIOMES, FIELD_WEIGHTS } from "../content/biomes";
import { GRASS, tileDef } from "../content/tiles";
import { biomeSkin, blendRegions } from "../render/palette";
import { ROCK, WATER, SHALLOW, SAND } from "../content/tiles";
import type { HomesteadSpot } from "./types";

const SPOTS: HomesteadSpot[] = ["riverside", "forest", "lakeside", "coast"];

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
    // The NEAR table only. The far country (dusk, glimmer, glass) is impossible
    // this close on purpose, and is covered by its own describe below.
    for (const [id, w] of FIELD_WEIGHTS) if (w.near > 0) expect(seen).toContain(id);
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
    expect(FIELD_WEIGHTS.map(([id]) => id)).not.toContain("blossom");
  });
});

describe("the world gets stranger the farther out you go", () => {
  /** The flat six-slot array the field WAS before Phase 7a, kept here on purpose
   *  rather than imported: a copy the production table can't quietly edit is the
   *  only version of this that can catch the production table being edited. */
  const LEGACY = ["meadow", "meadow", "pinewood", "birch", "scrub", "fen"];

  /** How far out no TILE can be owned by a drifting region — see STRANGE_FROM.
   *  The ramp starts at 200 measured from the site, and a tile is at most about a
   *  cell and a half from its own site. */
  const NEAR = 90;

  it("is the old flat array exactly, at strangeness zero", () => {
    // The migration, and it is a property of the generator rather than of the
    // save. Every roll the hash can produce, mapped through the weights, has to
    // land on the same biome the array used to hand back.
    for (let i = 0; i < 6000; i++) {
      const roll = i / 6000;
      expect(rollRegion(roll, 0)).toBe(LEGACY[Math.floor(roll * 6) % 6]);
    }
  });

  it("runs at strangeness zero everywhere the built world can reach", () => {
    // The other half of that proof. The identity above is worth nothing if a
    // region near town is running at 0.02 — it would look untouched on the seed
    // you checked and re-landscape somebody's house on the one you didn't.
    for (let seed = 1; seed <= 200; seed++) {
      for (let a = 0; a < 16; a++) {
        const th = (a / 16) * Math.PI * 2;
        for (const r of [0, 21, 50, NEAR]) {
          const x = Math.round(Math.cos(th) * r);
          const y = Math.round(Math.sin(th) * r);
          expect(regionStrangeness(seed, x, y)).toBe(0);
        }
      }
    }
  });

  it("keeps the far country out of the near world entirely", () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (let y = -NEAR; y <= NEAR; y += 3) {
        for (let x = -NEAR; x <= NEAR; x += 3) {
          if (Math.hypot(x, y) > NEAR) continue;
          const b = biomeAt(seed, "forest", x, y);
          expect(["dusk", "glimmer", "glass"]).not.toContain(b);
        }
      }
    }
  });

  /** The share of a ring that came up one of the three far regions. Sampled on a
   *  circle rather than a box so it is a distance being measured and not an area. */
  function strangeShare(r: number): number {
    let strange = 0;
    let n = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (let a = 0; a < 60; a++) {
        const th = (a / 60) * Math.PI * 2;
        const b = biomeAt(seed, "forest", Math.round(Math.cos(th) * r), Math.round(Math.sin(th) * r));
        if (b === "dusk" || b === "glimmer" || b === "glass") strange++;
        n++;
      }
    }
    return strange / n;
  }

  it("drifts, rather than switching over at a line", () => {
    const near = strangeShare(150);
    const mid = strangeShare(550);
    const far = strangeShare(1200);
    expect(near).toBe(0);
    // The middle of the ramp is genuinely mixed — this is the number that says
    // there is no wall you cross. If it ever reads ~0 or ~1, the drift has become
    // a boundary and the region you're standing in announces which side you're on.
    expect(mid).toBeGreaterThan(0.15);
    expect(mid).toBeLessThan(0.8);
    expect(far).toBeGreaterThan(mid);
  });

  it("reaches a plateau and stops climbing", () => {
    // "Keeps getting stranger forever" is a promise that ends in noise. Past
    // STRANGE_TO the world has a character instead of a scale.
    expect(strangeShare(2500)).toBeCloseTo(strangeShare(9000), 1);
  });

  it("never makes the ordinary impossible, however far out you walk", () => {
    // The invariant that keeps this a WEIGHT and not a gate: a meadow at nine
    // thousand tiles is uncommon and never unavailable, so there is no distance
    // at which the world you came from has been taken away.
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      for (let a = 0; a < 40; a++) {
        const th = (a / 40) * Math.PI * 2;
        seen.add(biomeAt(seed, "forest", Math.round(Math.cos(th) * 9000), Math.round(Math.sin(th) * 9000)));
      }
    }
    for (const [id, w] of FIELD_WEIGHTS) if (w.far > 0) expect(seen).toContain(id);
  });

  it("gives the far country nothing the near one hasn't got", () => {
    // Distance changes the view, never what you may have (DESIGN.md §Biomes).
    // A biome's only numbers are how thickly things grow, so the check is that no
    // far row is RICHER than the near table already was. Note what this is NOT
    // forbidding: the near table varies wildly between itself — the scrub has 5×
    // the rocks — and that is fine, because it is a lateral choice. What it forbids
    // is a density that climbs with RADIUS, which is a payout curve for distance
    // and makes the far country a place you farm rather than a place you saw. It
    // has already caught one: glimmer's mushrooms, drafted at 0.4.
    const near = FIELD_WEIGHTS.filter(([, w]) => w.near > 0).map(([id]) => BIOMES[id]);
    const far = FIELD_WEIGHTS.filter(([, w]) => w.near === 0).map(([id]) => BIOMES[id]);
    const most = (xs: typeof near, k: "trees" | "rocks" | "mushrooms") =>
      Math.max(...xs.map((b) => b[k]));
    for (const k of ["trees", "rocks", "mushrooms"] as const) {
      expect(most(far, k)).toBeLessThanOrEqual(most(near, k));
    }
    // And no standing water out there: a region you cannot cross is a wall, and
    // one you found after a nine-hundred-tile walk is the worst place for a wall.
    for (const b of far) expect(b.water).toBe(0);
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

// The turf blend (8d). The staircase these exist to prevent is a picture, not a
// number — but both bugs found while building it WERE numbers underneath, and a
// screenshot is not something CI can take.
describe("the turf blends across a region border", () => {
  // The forest spot, because it is the one with the clearing in it.
  const SPOT = "forest" as const;

  /** The blended ground colour at a tile, as three channels. */
  const turf = (seed: number, x: number, y: number): number[] => {
    const skin = biomeSkin(tileDef(GRASS), GRASS, blendRegions(regionParts(seed, SPOT, x, y)));
    return [1, 3, 5].map((i) => parseInt(skin.color.slice(i, i + 2), 16));
  };

  it("never steps, anywhere", () => {
    // THE TEST THAT CAUGHT THE CLEARING SEAM, which a screenshot had found and
    // nothing could have located: the forest wood was overlaid on the whole mix
    // and gated on "is the nearest site the home one", a hard Voronoi test, so it
    // switched off in the width of one tile. This measured it at 18.
    //
    // THE NUMBER SITS BETWEEN TWO MEASUREMENTS rather than being picked. 18 was
    // the seam; 9 is the steepest LEGITIMATE step, which is the largest ground
    // tint in the table spread over `2 * BIOME_BLEND` tiles at smoothstep's peak
    // slope. A gradient has to be allowed to have a gradient; what it may not
    // have is a cliff.
    //
    // Same shape as 8c's ground-field assertion and the same reasoning: a field
    // whose neighbours can differ by a visible amount has a contour in it, and a
    // contour is the staircase again.
    let worst = 0;
    for (const seed of [3, 17, 93]) {
      for (let x = -200; x <= 200; x += 1) {
        for (let y = -200; y <= 200; y += 13) {
          const a = turf(seed, x, y);
          for (const b of [turf(seed, x + 1, y), turf(seed, x, y + 1)]) {
            worst = Math.max(worst, ...a.map((v, i) => Math.abs(v - b[i])));
          }
        }
      }
    }
    expect(worst).toBeLessThanOrEqual(12);
  });

  it("still says what region it is, at the middle of one", () => {
    // The blend may not dissolve the regions: they are the wayfinding system
    // (DESIGN §Biomes), and a world that is everywhere a gradient is a world you
    // cannot say you are anywhere in. Away from every border the answer has to be
    // the region's own row, bit for bit — most of the map is this case.
    let single = 0;
    for (let x = -300; x <= 300; x += 7) {
      for (let y = -300; y <= 300; y += 7) {
        const parts = regionParts(3, SPOT, x, y);
        if (parts.length === 1) {
          single++;
          expect(parts[0].def.id).toBe(biomeAt(3, SPOT, x, y));
        }
      }
    }
    expect(single).toBeGreaterThan(1000);
  });

  it("centres each soft edge on the hard one", () => {
    // The fade may not SHIFT a border, only smudge it — the trees take the hard
    // answer, so an off-centre fade would put the grass boundary a few tiles from
    // the treeline standing on it.
    //
    // Not "the heaviest part is `biomeAt`", which was the first version of this
    // test and is false on purpose: where three regions meet, the tile's own
    // region can hold the largest single share and still be under half, and
    // forcing it otherwise would mean refusing to blend at exactly the junctions
    // that need it most.
    const b = blossomCentre(3, SPOT);
    const share = (x: number, y: number): number => {
      const parts = regionParts(3, SPOT, x, y);
      return parts.filter((p) => p.def.id === "blossom").reduce((a, p) => a + p.w, 0);
    };
    // A hair inside the radius and a hair outside, along several bearings.
    for (const a of [0, 1, 2, 3, 4, 5]) {
      const ux = Math.cos((a * Math.PI) / 3);
      const uy = Math.sin((a * Math.PI) / 3);
      const inner = share(b.x + ux * (BLOSSOM_RADIUS - 3), b.y + uy * (BLOSSOM_RADIUS - 3));
      const outer = share(b.x + ux * (BLOSSOM_RADIUS + 3), b.y + uy * (BLOSSOM_RADIUS + 3));
      expect(inner).toBeGreaterThan(0.5);
      expect(outer).toBeLessThan(0.5);
    }
  });

  it("leaves the blossom disc a middle", () => {
    // The failure the `span` parameter exists to stop: fading a radius-9 disc
    // over 5 tiles either side means it is never fully itself anywhere.
    const b = blossomCentre(3, SPOT);
    const parts = regionParts(3, SPOT, Math.round(b.x), Math.round(b.y));
    expect(parts).toHaveLength(1);
    expect(parts[0].def.id).toBe("blossom");
  });
});
