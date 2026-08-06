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
  townMown,
  regionParts,
  rollRegion,
  scatterRegion,
  scatterSkin,
  foundPlaceAt,
  waterKindAt,
  redwoodCentre,
  calderaCentre,
  staticCentre,
  CALDERA_RADIUS,
  LAKE_RADIUS,
} from "./world";
import { BIOMES, FIELD_WEIGHTS, type BiomeId } from "../content/biomes";
import { FOUND } from "../content/found";
import { GRASS, tileDef } from "../content/tiles";
import { biomeSkin, blendRegions, sharpenRegions } from "../render/palette";
import { ROCK, WATER, SHALLOW, SAND, SHRUB, DIRT, STUMP, LOG, TREE, LAVA, MUSHROOM } from "../content/tiles";
import { NODES, nodeForTile } from "../content/nodes";
import { WATER_KINDS } from "../content/water";
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

  /** The meadow row's SOLIDITY is all identities, and this is what that is FOR.
   *  If someone ever tunes one of these, the terrain under every existing town
   *  moves and this test is the thing that says so.
   *
   *  MUSHROOMS CAME OFF THIS LIST, DELIBERATELY, and it is the only one that has.
   *  A meadow with nothing at all in it was the town's calm charged to the whole
   *  world (sim/world.ts §townMown), and a field mushroom is what grassland grows.
   *  It is safe where the others are not for a reason worth keeping: a mushroom
   *  owns its cell but blocks nobody, so the failure it could cause is a mushroom
   *  in a room, not a tree through a wall — and `townMown` keeps it out of the
   *  town anyway, which the test below actually checks on the ground. */
  it("keeps the meadow's solid numbers at identity, because saves depend on it", () => {
    const m = BIOMES.meadow;
    expect(m.trees).toBe(1);
    expect(m.rocks).toBe(1);
    expect(m.shrubs).toBeUndefined();
    expect(m.deadwood).toBeUndefined();
    expect(m.water).toBe(0);
    expect(m.sheet).toBeUndefined();

    // And its COLOUR, which is the game's own green and the thing every other
    // region is a departure from.
    for (const tint of [m.ground, m.tuft, m.crown, m.trunk]) expect(tint.amount).toBe(0);
  });

  /** The town mows its common, checked on the ground rather than in the row.
   *
   *  This is the test that replaced "the meadow has no decor". That one asserted
   *  a field was empty, which is a fact about a table; this asserts that no
   *  mushroom comes up between the houses on any seed, which is the fact anybody
   *  actually cares about — and it keeps holding however the meadow is tuned. */
  it("grows nothing in the town's grass, and does out in the country", () => {
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 200; seed++) {
        for (const { x, y } of townCells(spot)) {
          expect(generatedTile(seed, spot, x, y), `seed ${seed} ${spot} (${x},${y})`).not.toBe(
            MUSHROOM,
          );
        }
      }
    }
    // And the ramp actually arrives somewhere: out past the fade the meadow grows
    // what its row says it grows. Counted over a band rather than asserted at a
    // point — 2% of cells means any single tile is almost certainly bare.
    let found = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (let y = 120; y < 150; y++) {
        for (let x = 120; x < 150; x++) {
          if (
            biomeAt(seed, "riverside", x, y) === "meadow" &&
            generatedTile(seed, "riverside", x, y) === MUSHROOM
          ) {
            found++;
          }
        }
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  /** The ramp itself: nothing at the plaza, everything in the country, and no
   *  step anywhere in between. A radius you can stand on is the failure mode
   *  `clearingRadius` exists to avoid, and this is the same shape one level down. */
  it("mows the common smoothly, with no edge to stand on", () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(townMown(seed, 0, 0)).toBe(0);
      expect(townMown(seed, 0, 19)).toBe(0);
      expect(townMown(seed, 0, 200)).toBe(1);
      // Along a spoke, wildness only ever increases, and never by a jump.
      let prev = 0;
      for (let r = 0; r <= 60; r++) {
        const v = townMown(seed, 0, r);
        expect(v).toBeGreaterThanOrEqual(prev);
        expect(v - prev).toBeLessThan(0.2);
        prev = v;
      }
      expect(prev).toBe(1);
    }
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

describe("the redwood stands, and the giants in some of them", () => {
  /** The instances a test can reach without sweeping the whole plane. Four is
   *  past the third spacing, which is far enough to prove "they recur" and near
   *  enough that `onLand`'s sixteen bearings still run in a suite. */
  const INSTANCES = [0, 1, 2, 3];

  // THE SWEEPS IN HERE CARRY THEIR OWN TIMEOUT, and it is a statement about what
  // they are rather than a workaround. Each one is a PROOF over hundreds of seeds
  // and four spots — the kind of assertion that catches a siting bug on the seed
  // nobody tested — and `biomeAt` grew a ring window when the stands arrived, so
  // they run a few seconds each. At vitest's 5s default they passed alone and
  // timed out under a full parallel suite, which is the worst possible failure
  // mode: a red build that goes green when you re-run it, on a test that is not
  // actually flaky. Twenty seconds is far above what they take and far below
  // anything that would hide a real regression.
  const SWEEP = 20_000;

  it("puts a wood on every ring, on every seed and every spot", () => {
    // The recurrence is the whole difference between this and the blossom rows:
    // one per town would say the world runs out of woods, on a map that does not
    // run out.
    for (let seed = 1; seed <= 120; seed++) {
      for (const spot of SPOTS) {
        for (const i of INSTANCES) {
          const c = redwoodCentre(seed, spot, i);
          // ON the ring, to the rounding of one tile — `onLand` keeps the radius
          // exactly and rounds the point, which is what makes "you were going
          // somewhere" true of every one of these.
          expect(Math.abs(Math.hypot(c.x, c.y) - (168 + i * 191))).toBeLessThan(1);
          const at = biomeAt(seed, spot, c.x, c.y);
          expect(["redwoods", "giants"]).toContain(at);
        }
      }
    }
  }, SWEEP);

  it("never lands in the sea, on any spot", () => {
    // The blossom rows' test, and the reason it has to be repeated rather than
    // inherited: this disc is nearly three times as wide, so it goes through
    // `onLand` with its own margin (REDWOOD_MARGIN), and a margin that was
    // quietly too small would show up here and nowhere else. Rim samples for the
    // same reason the orchard's has them — the sea's shelf is five tiles, so a
    // wood standing in the surf can look merely damp at its middle.
    //
    // ASKED BY KIND AND BY SHARE, and both halves of that are corrections the
    // first draft earned by failing.
    //
    // By KIND, because it forbade deep water at the rim and a river failed it. A
    // river running through a redwood wood is the best thing that could happen to
    // one — they grow along creeks — and `onLand` only ever steered landmarks
    // clear of the two bodies that can actually strand one.
    //
    // By SHARE, because a disc this wide cannot promise four dry rim points and
    // should not try: measured over 3200 stands, 4% of them touch a lake or the
    // sea somewhere on their edge, and a wood coming down to a shore is a good
    // thing to walk into rather than a siting failure. What must never happen is
    // a wood that is mostly water. The worst case measured is 83% dry, so the bar
    // is three quarters — comfortably under what the siting achieves and far
    // above anything that would read as stranded.
    const R = 24;
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 200; seed++) {
        for (const i of INSTANCES) {
          const c = redwoodCentre(seed, spot, i);
          const big = (dx: number, dy: number) => {
            const k = waterKindAt(seed, spot, c.x + dx, c.y + dy);
            return k === "sea" || k === "lake";
          };
          // You always arrive somewhere you can stand.
          expect(big(0, 0)).toBe(false);
          let dry = 0;
          let all = 0;
          for (let dy = -R; dy <= R; dy += 3) {
            for (let dx = -R; dx <= R; dx += 3) {
              if (Math.hypot(dx, dy) > R) continue;
              all++;
              if (!big(dx, dy)) dry++;
            }
          }
          expect(dry / all).toBeGreaterThan(0.75);
        }
      }
    }
  }, SWEEP);

  it("keeps the giants at the heart of a wood, and never anywhere else", () => {
    // Two claims in one sweep, and the second is the one that matters: you reach
    // the giants by walking through ordinary redwoods and out the other side, so
    // a stand of them at the RIM — or standing on open ground — would have given
    // away the arrival before you got to it.
    for (let seed = 1; seed <= 40; seed++) {
      for (const i of INSTANCES) {
        const c = redwoodCentre(seed, "forest", i);
        for (let dy = -30; dy <= 30; dy++) {
          for (let dx = -30; dx <= 30; dx++) {
            if (biomeAt(seed, "forest", c.x + dx, c.y + dy) !== "giants") continue;
            expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(5);
          }
        }
      }
    }
  }, SWEEP);

  it("gives about one wood in four its giants", () => {
    // A RATE, NOT A QUOTA (sim/world.ts §GIANTS_IN). There is no last stand and
    // nothing counts them, so the only thing to assert is that the hash is
    // actually spreading — a rate that came out 0 would be a feature nobody ever
    // meets, and one that came out 1 would be a wood that is always the same wood.
    let stands = 0;
    let withGiants = 0;
    for (let seed = 1; seed <= 150; seed++) {
      for (const i of INSTANCES) {
        const c = redwoodCentre(seed, "forest", i);
        stands++;
        if (biomeAt(seed, "forest", c.x, c.y) === "giants") withGiants++;
      }
    }
    const rate = withGiants / stands;
    expect(rate).toBeGreaterThan(0.15);
    expect(rate).toBeLessThan(0.35);
  });

  it("is not something the field can roll either", () => {
    // Same claim the blossom rows make, and for a stronger reason: these are the
    // only regions in the table whose whole point is that you went there.
    const rolled = FIELD_WEIGHTS.map(([id]) => id);
    expect(rolled).not.toContain("redwoods");
    expect(rolled).not.toContain("giants");
  });

  it("yields exactly what every other wood yields", () => {
    // The biggest temptation in content/biomes.ts, checked rather than trusted:
    // a giant sequoia is eight wood, the same as a birch, because a biome is
    // colour and density and never a material (DESIGN §Biomes). If this ever
    // fails it will be because somebody added a `redwood` item, and the right fix
    // is to delete it.
    expect(NODES.tree.drop).toBe("wood");
    expect(BIOMES.giants.trees).toBeLessThan(BIOMES.redwoods.trees);
    for (const id of ["redwoods", "giants"] as const) {
      expect(BIOMES[id].water).toBe(0);
      expect(BIOMES[id].mushrooms).toBeLessThanOrEqual(BIOMES.fen.mushrooms);
    }
  });
});

describe("the three new far regions", () => {
  const SPOT: HomesteadSpot = "riverside";

  it("keeps the plateau half strange, a quarter familiar and a quarter plain", () => {
    // DESIGN §Biomes: "a new far row is scaled in, never appended flat", and the
    // two numbers to hold are that the strange rows keep about half the roll and
    // the five familiar ones about a quarter. Appending is the natural mistake —
    // it makes the far country blander every time it gets bigger, with nobody
    // ever deciding to — so this asserts the shares rather than the weights.
    const share = (ids: BiomeId[]) => {
      const total = FIELD_WEIGHTS.reduce((n, [, w]) => n + w.far, 0);
      return FIELD_WEIGHTS.filter(([id]) => ids.includes(id)).reduce((n, [, w]) => n + w.far, 0) / total;
    };
    const strange = share(["dusk", "glimmer", "glass"]);
    const familiar = share(["meadow", "pinewood", "birch", "scrub", "fen"]);
    expect(strange, "the strange rows").toBeGreaterThan(0.45);
    expect(strange, "the strange rows").toBeLessThan(0.55);
    expect(familiar, "the familiar five").toBeGreaterThan(0.2);
    expect(familiar, "the familiar five").toBeLessThan(0.3);
  });

  it("puts the Static out past the other sited regions, on every seed", () => {
    // A destination rather than scenery (DESIGN §"Rolled regions, and sited
    // ones"), sited on its own ring like the woods and the calderas — and further
    // out than either, because it is the last thing the far country says.
    for (let seed = 1; seed <= 30; seed++) {
      for (const i of [0, 1, 2]) {
        const c = staticCentre(seed, SPOT, i);
        expect(biomeAt(seed, SPOT, c.x, c.y), `seed ${seed} #${i}`).toBe("static");
        // Past the calderas' first ring, which is the previous furthest.
        expect(Math.hypot(c.x, c.y), `seed ${seed} #${i}`).toBeGreaterThan(300);
      }
    }
  });

  it("never lets the field roll a sited region", () => {
    // The blossom rows' rule, and the redwoods' after it: a region you go and
    // find may not also turn up by accident, or the walk stops meaning anything.
    for (let i = 0; i < 200; i++) {
      const id = rollRegion(i / 200, 1);
      expect(["blossom", "redwoods", "giants", "caldera", "static"]).not.toContain(id);
    }
  });

  it("keeps the marshes crossable everywhere, however wet they are", () => {
    // The one region in the game that is mostly water. What makes water a WALL is
    // depth, never amount (content/biomes.ts §pools) — so this sweeps a real
    // marsh and asserts that not one tile of it is the deep kind.
    let found = 0;
    for (let seed = 1; seed <= 12 && found < 3; seed++) {
      for (let r = 300; r < 1500 && found < 3; r += 7) {
        const x = Math.round(Math.cos(r) * r);
        const y = Math.round(Math.sin(r) * r);
        if (biomeAt(seed, SPOT, x, y) !== "marsh") continue;
        found++;
        for (let dy = -12; dy <= 12; dy++) {
          for (let dx = -12; dx <= 12; dx++) {
            if (biomeAt(seed, SPOT, x + dx, y + dy) !== "marsh") continue;
            const t = generatedTile(seed, SPOT, x + dx, y + dy);
            expect(t, `seed ${seed} at ${x + dx},${y + dy}`).not.toBe(WATER);
          }
        }
      }
    }
    // The sweep proving nothing would be the worst outcome, and the likeliest
    // failure of a test like this: it must actually have stood in some.
    expect(found, "no marsh found to sweep").toBeGreaterThan(0);
  });

  it("gives the salt flats and the marshes no more of anything than home has", () => {
    // The far country is stranger, never richer (DESIGN §Biomes). Asserted here
    // as well as in the general sweep because these two are the rows most likely
    // to tempt somebody: a marsh looks like it should be mushroomier than the
    // fen, and it is not.
    for (const id of ["salt", "marsh"] as const) {
      expect(BIOMES[id].mushrooms).toBeLessThanOrEqual(BIOMES.fen.mushrooms);
      expect(BIOMES[id].trees).toBeLessThanOrEqual(BIOMES.meadow.trees);
    }
  });
});

describe("the cinders, and the caldera", () => {
  const SWEEP = 20_000;

  it("puts a caldera on every ring, with a lake at the middle of it", () => {
    for (let seed = 1; seed <= 80; seed++) {
      for (const spot of SPOTS) {
        for (const i of [0, 1, 2]) {
          const c = calderaCentre(seed, spot, i);
          expect(Math.abs(Math.hypot(c.x, c.y) - (247 + i * 233))).toBeLessThan(1);
          expect(biomeAt(seed, spot, c.x, c.y)).toBe("caldera");
          expect(generatedTile(seed, spot, c.x, c.y)).toBe(LAVA);
        }
      }
    }
  }, SWEEP);

  it("keeps a ring of ash you can walk all the way round the lake", () => {
    // THE FEN'S RULE, AT THE ONE PLACE IT IS HARDEST TO KEEP: a region you cannot
    // cross is a wall rather than a place, and one you walked two hundred and
    // fifty tiles to reach is the worst possible place to put a wall. So the lake
    // has to be an OBSTACLE — something with a way round — and that is a fact
    // about geometry that only a sweep can check.
    //
    // Asked as "is there a walkable ring": on sixteen bearings out of the centre,
    // the first tile past the lava must be something you can stand on, and it must
    // arrive well inside the disc rather than outside it.
    for (let seed = 1; seed <= 40; seed++) {
      for (const i of [0, 1]) {
        const c = calderaCentre(seed, "forest", i);
        for (let a = 0; a < 16; a++) {
          const th = (a / 16) * Math.PI * 2;
          let free = 0;
          for (let r = LAKE_RADIUS + 1; r <= CALDERA_RADIUS - 2; r++) {
            const x = c.x + Math.round(Math.cos(th) * r);
            const y = c.y + Math.round(Math.sin(th) * r);
            if (!tileDef(generatedTile(seed, "forest", x, y)).solid) free++;
          }
          // Most of the way out from the lake to the rim is open ash. Not all of
          // it: snags, rocks and the odd river are allowed to be in the way, and a
          // ring with nothing in it at all would be a running track.
          //
          // FOUR OF THIRTEEN, AND THE NUMBER IS MEASURED RATHER THAN CHOSEN. It
          // was 6 — which was the floor of the distribution at the time and
          // therefore not a threshold at all, but a record of one seed. Rerolling
          // the far country (a new field weight moves every rolled region out
          // there) put one bearing in 1280 on exactly 6 and this failed, having
          // caught nothing except that the world had changed.
          //
          // The distribution across 40 seeds, both instances, all sixteen
          // bearings: 6 once, 8 twice, 9 fourteen times, and 1263 of 1280 at ten
          // or better. What this assertion is for is a bearing that is WALLED —
          // and a wall would read as 0 or 1, nowhere near any of these. Half the
          // ring blocked is a walk with things in it, which is what the region is
          // supposed to be.
          expect(free, `seed ${seed} bearing ${a}`).toBeGreaterThan(4);
        }
      }
    }
  }, SWEEP);

  it("never puts lava anywhere the town can reach", () => {
    // "It cannot happen" is what every generator bug has said first. The nearest
    // caldera is 247 tiles out and the cinders are far country, so this should be
    // impossible twice over — which is exactly the kind of claim that is worth two
    // seconds of sweeping on a thousand seeds.
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 400; seed++) {
        for (let y = -40; y <= 40; y += 2) {
          for (let x = -40; x <= 40; x += 2) {
            if (generatedTile(seed, spot, x, y) === LAVA) {
              throw new Error(`seed ${seed} ${spot}: lava at (${x},${y})`);
            }
          }
        }
      }
    }
  }, SWEEP);

  it("gives lava nothing to gather and nowhere to walk", () => {
    // The biggest temptation in the file, checked rather than trusted: a volcano
    // is where a far region would most like to hold a material the near ones
    // don't, and DESIGN §Biomes says it may not. There is no obsidian.
    expect(nodeForTile(LAVA, "surface")).toBe(null);
    expect(tileDef(LAVA).solid).toBe(true);
    expect(tileDef(LAVA).diggable).toBeFalsy();
  });

  it("keeps the burnt rows the poorest ground in the game", () => {
    // Not a general invariant — the far-country test above covers that — but the
    // specific claim this region makes about itself: nothing grows here.
    for (const id of ["cinder", "caldera"] as const) {
      expect(BIOMES[id].mushrooms).toBe(0);
      expect(BIOMES[id].shrubs).toBeUndefined();
      expect(BIOMES[id].deadwood).toBeUndefined();
      expect(BIOMES[id].trees).toBeLessThan(BIOMES.meadow.trees);
    }
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
    // Twenty seconds for the reason the redwood sweeps have it (see SWEEP up in
    // that describe): this walks 60 seeds over a 130-tile square asking `biomeAt`,
    // and `biomeAt` grew a ring window when the stands arrived. It passed alone
    // and timed out in a full parallel suite, which is a red build that goes green
    // on a re-run — the worst kind.
  }, 20_000);

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
    // AND THE SAME QUESTION ASKED IN WOOD, which the per-key check above cannot
    // ask. `shrubs` is a gathered node too (two wood against a tree's eight) and
    // no NEAR row has any at all, so comparing the raw densities would say the
    // heath is infinitely richer than the near world and be measuring nothing.
    // What the promise is actually about is how much material a cell of a region
    // hands back, so that is what gets compared: the heath is 18% of cells at two
    // wood — 0.36 a cell — against the pinewood's 22% at eight, which is 1.76,
    // forty tiles from the plaza. Five times as much wood at home.
    const wood = (b: (typeof near)[number]) =>
      b.trees * NODES.tree.density * NODES.tree.yield +
      (b.shrubs ?? 0) * NODES.shrub.density * NODES.shrub.yield;
    expect(Math.max(...far.map(wood))).toBeLessThanOrEqual(Math.max(...near.map(wood)));

    // And no water out there that can STOP you: a region you cannot cross is a
    // wall, and one you found after a nine-hundred-tile walk is the worst place
    // for a wall.
    //
    // IT USED TO SAY `water === 0`, WHICH IS A STRONGER CLAIM THAN THE RULE, and
    // the marshes are what found the difference. What makes water a wall is DEPTH
    // and nothing else: past `shelf` it stops you, under it you wade. A region may
    // therefore be almost entirely water and still be crossable in every
    // direction, provided no pool in it can reach the shelf — and that is a
    // property of the geometry rather than of the amount, because depth is the
    // deepest single pool touching a tile and never a sum (sim/world.ts
    // §pondDepth).
    //
    // So the far country may be wet, and may not be deep. A row with water and no
    // geometry of its own runs on the fen's, whose 2.6 is under the same shelf —
    // stated here rather than assumed, so that a future row copying the fen's
    // number without its lattice fails this instead of quietly growing a lake.
    for (const b of far) {
      if (b.water === 0) continue;
      const deepest = b.pools ? b.pools.max : 2.6;
      expect(deepest, `${b.id} can grow water you cannot cross`).toBeLessThan(
        WATER_KINDS.pond.shelf,
      );
    }
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

  it("never generates two pieces of deadwood edge-on either, and it matters more", () => {
    // Same arithmetic, its own salt (sim/world.ts §deadIsLoneliest). It matters
    // MORE here than for rocks: a log's art is twenty pixels wide on a sixteen
    // pixel tile, so two of these adjacent would genuinely overlap rather than
    // merely abut, and the overlap would be a hard seam through both sprites.
    for (const seed of [21, 99, 4242]) {
      for (const spot of SPOTS) {
        for (let y = -70; y <= 70; y++) {
          for (let x = -70; x <= 70; x++) {
            const here = generatedTile(seed, spot, x, y);
            if (here !== STUMP && here !== LOG) continue;
            for (const n of [generatedTile(seed, spot, x + 1, y), generatedTile(seed, spot, x, y + 1)]) {
              expect(n === STUMP || n === LOG, `${x},${y}`).toBe(false);
            }
          }
        }
      }
    }
  });

  it("keeps deadwood rare, and out of the regions that never asked", () => {
    // Rare is the whole spec ("pretty rare but occasional"). It is also the only
    // guard on a field that is decor: nothing counts deadwood, nothing picks it
    // up, and no other test in the suite can see it — so if the density were
    // fat-fingered upward, the first anyone would know is a screenshot.
    let dead = 0;
    let land = 0;
    let nearest = Infinity;
    const seen = new Set<string>();
    for (let y = -200; y <= 200; y++) {
      for (let x = -200; x <= 200; x++) {
        const t = generatedTile(21, "forest", x, y);
        if (t === WATER || t === SHALLOW || t === SAND) continue;
        land++;
        if (t !== STUMP && t !== LOG) continue;
        dead++;
        // The region it GREW from, not the one it is lying in. Since the
        // scatter dither those differ near a border by design — a log from the
        // pinewood may come to rest three tiles into the scrub — and asking
        // `biomeAt` here reported the scrub as a region that grows deadwood
        // when it is a region that merely borders one.
        seen.add(scatterRegion(21, "forest", x, y));
        nearest = Math.min(nearest, Math.hypot(x, y));
      }
    }
    expect(land).toBeGreaterThan(10000); // the sample is worth something
    expect(dead).toBeGreaterThan(0); // it does actually happen
    expect(dead / land).toBeLessThan(0.01); // and stays something you come across
    // Only where a region asked.
    for (const id of seen) expect(BIOMES[id as BiomeId].deadwood, id).toBeTruthy();
    expect(seen.has("meadow")).toBe(false);
    // And the promise the meadow row exists for, asserted on the ground rather
    // than on the table: no stump anywhere on the walk home. It holds by
    // composition — the town's region is meadow out to HOME_REGION_REACH and the
    // dither is switched off inside it — and it is worth pinning because the
    // dither is the thing that could quietly break it.
    expect(nearest).toBeGreaterThan(HOME_REGION_REACH);
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

  /** The same, on the RENDER path — which is where a region that refuses to fade
   *  is resolved (render/palette.ts §sharpenRegions). The helper above
   *  deliberately does not sharpen, because what it is measuring is the blend
   *  itself. */
  const sharpTurf = (seed: number, x: number, y: number): number[] => {
    const parts = sharpenRegions(regionParts(seed, SPOT, x, y));
    const skin = biomeSkin(tileDef(GRASS), GRASS, blendRegions(parts));
    return [1, 3, 5].map((i) => parseInt(skin.color.slice(i, i + 2), 16));
  };

  it("never steps, anywhere", () => {
    //
    // ONE REGION IS EXEMPT AND IT IS EXEMPT BY NAME: the salt flats do not fade
    // (content/biomes.ts §hardEdge). This sweep cannot reach one — it samples
    // ±200 tiles and a salt flat is far-only — so nothing here has to make an
    // exception; the test below asserts the edge is there on purpose.

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

  it("DOES step where a place has a real edge, and frays where a fire made it", () => {
    // THE EXEMPTIONS FROM THE TEST ABOVE, asserted rather than merely allowed —
    // so that a later pass which "fixes" these edges fails here and has to come
    // and read why (content/biomes.ts §edge, DESIGN §Biomes).
    //
    // The near sweep cannot reach either: both are far rows, impossible inside
    // 200 tiles by construction. That is why this is its own sweep and why it
    // measures the opposite quantity — not "is the gradient smooth" but "is there
    // an edge at all".
    //
    // Measured on the RENDER path, which is where the sharpening lives: the flora
    // dither underneath is deliberately untouched, so trees still interleave over
    // the approach.
    for (const id of ["salt", "cinder"] as const) {
      let worst = 0;
      let found = 0;
      // Where the ground actually flips, per bearing. For a shoreline these
      // should be tidy; for a burn they must not be — see the spread below.
      const crossings: number[] = [];
      for (const seed of [3, 17, 93]) {
        for (let r = 250; r <= 2400 && found < 3; r += 3) {
          const x0 = Math.round(Math.cos(r) * r);
          const y0 = Math.round(Math.sin(r) * r);
          if (biomeAt(seed, SPOT, x0, y0) !== id) continue;
          // Walk out along parallel lines and note where the colour jumps.
          for (let lane = -6; lane <= 6; lane += 2) {
            let crossed = -1;
            for (let i = 0; i < 60; i++) {
              const a = sharpTurf(seed, x0 + i, y0 + lane);
              const b = sharpTurf(seed, x0 + i + 1, y0 + lane);
              const step = Math.max(...a.map((v, k) => Math.abs(v - b[k])));
              if (step > worst) worst = step;
              if (step > 40 && crossed < 0) crossed = i;
            }
            if (crossed >= 0) crossings.push(crossed);
          }
          found++;
        }
      }
      expect(found, `no ${id} found to sweep`).toBeGreaterThan(0);
      // A real edge, not a gradient: the biggest legitimate step anywhere else in
      // the game is 12 (see the sweep above), and turf to crust or turf to ash is
      // over a hundred.
      expect(worst, `${id} fades in like an ordinary region`).toBeGreaterThan(40);
      if (id !== "cinder") continue;
      // AND THE BURN'S EDGE WANDERS. A fire stops in tongues, so neighbouring
      // lines out of the same burn must not all cross at the same distance —
      // which is exactly what would happen if somebody replaced the field with a
      // constant, or set the amount to zero, and it would still pass every other
      // assertion here.
      const lo = Math.min(...crossings);
      const hi = Math.max(...crossings);
      expect(crossings.length, "the burn never crossed anything").toBeGreaterThan(6);
      expect(hi - lo, "the burn's edge is a straight line").toBeGreaterThan(2);
    }
  });

  it("never dilutes an outcrop, because rock does not get greener", () => {
    // THE THIRD EDGE TREATMENT (content/biomes.ts §edge, `outcrop`), and the one
    // that is about a share of a region rather than the region. With the ordinary
    // fade, a sheet of bare rock running up to the granite's border came out as
    // ten tiles of SAGE — the rock's grey mixed with the neighbour's green, which
    // is neither rock nor turf and is a colour this world does not otherwise
    // contain. Rock does not get greener as you walk away from it; soil covers
    // it, or it does not.
    //
    // So this asserts the ABSENCE OF THE MIDDLE. In the border zone — tiles where
    // the granite has a share and somebody else does too — a tile is either bare
    // rock or it is not, and nothing may land between the two. Measured: 116
    // tiles of rock, everything else 50 or further from it, and the band between
    // 10 and 45 empty.
    //
    // Inside the region is deliberately excluded, and that is not a loophole: a
    // sheet's own soft window is the thing §sheet argues for at length, and the
    // test below is what protects it.
    const px = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const rock = px(
      biomeSkin(tileDef(GRASS), GRASS, {
        ...BIOMES.granite,
        ground: BIOMES.granite.sheet!.ground,
      }).color,
    );
    let stone = 0;
    let zone = 0;
    for (const seed of [3, 17, 93]) {
      for (let r = 900; r < 1500; r += 7) {
        const x0 = Math.round(Math.cos(r) * r);
        const y0 = Math.round(Math.sin(r) * r);
        if (biomeAt(seed, SPOT, x0, y0) !== "granite") continue;
        for (let i = -20; i < 40; i++) {
          const raw = regionParts(seed, SPOT, x0 + i, y0);
          const mine = raw.some((p) => p.id === "granite");
          // The border zone proper: this region and somebody else, both present.
          if (!mine || raw.every((p) => p.id === "granite")) continue;
          zone++;
          const c = px(
            biomeSkin(tileDef(GRASS), GRASS, blendRegions(sharpenRegions(raw))).color,
          );
          const d = Math.hypot(c[0] - rock[0], c[1] - rock[1], c[2] - rock[2]);
          if (d < 10) stone++;
          else expect(d, `sage at ${x0 + i},${y0} on seed ${seed}`).toBeGreaterThan(45);
        }
      }
    }
    expect(zone, "no granite border zone found to sweep").toBeGreaterThan(50);
    // And there is still rock out there: an edge treatment that simply deleted
    // every sheet near a border would pass everything above.
    expect(stone, "the outcrops all vanished at the border").toBeGreaterThan(20);
  });

  it("never steps out on the granite either, where the ground itself changes", () => {
    // THE NEAR SWEEP ABOVE CANNOT SEE THIS. It samples ±200 tiles, and the
    // granite is a far row — impossible inside 200 by construction — so the one
    // region whose GROUND has a second colour field on it (content/biomes.ts
    // §sheet) was exactly the region the step test could not reach.
    //
    // It is worth its own sweep rather than a wider one: turf to bare rock is a
    // bigger jump than any region border makes, and the whole defence is that the
    // field carrying it is long-wavelength. Shorten `period` or narrow the window
    // between `from` and `to` and this is what fails.
    //
    // ONLY WHERE THE TILE IS ALL GRANITE, and that restriction is a measurement
    // rather than a convenience. Sweeping the region flat measures 20 with the
    // sheets switched off — the far country's own borders are steeper than the
    // near world's, because its tints are (dusk's violet against the glimmer's
    // teal is twice any gap near town), and a triple point out there swings its
    // weights by a tenth of a tile. That is a pre-existing property of the far
    // rows and not this feature; folding it in would make the number here a
    // measurement of the wrong thing, and a limit chosen to accommodate it would
    // stop measuring anything at all. Inside one region there is nothing left in
    // the answer but the sheet.
    let worst = 0;
    let found = 0;
    const pureGranite = (x: number, y: number, seed: number): boolean =>
      regionParts(seed, SPOT, x, y).every((p) => p.id === "granite");
    for (const seed of [3, 17, 93]) {
      for (let r = 900; r <= 1400 && found < 3; r += 7) {
        const x0 = Math.round(Math.cos(r) * r);
        const y0 = Math.round(Math.sin(r) * r);
        if (biomeAt(seed, SPOT, x0, y0) !== "granite") continue;
        found++;
        for (let y = y0 - 40; y <= y0 + 40; y++) {
          for (let x = x0 - 40; x <= x0 + 40; x++) {
            if (!pureGranite(x, y, seed)) continue;
            const a = turf(seed, x, y);
            for (const [dx, dy] of [
              [1, 0],
              [0, 1],
            ]) {
              if (!pureGranite(x + dx, y + dy, seed)) continue;
              const b = turf(seed, x + dx, y + dy);
              worst = Math.max(worst, ...a.map((v, i) => Math.abs(v - b[i])));
            }
          }
        }
      }
    }
    expect(found).toBeGreaterThan(0); // or the sweep proved nothing
    expect(worst).toBeGreaterThan(0); // and the sheets are actually on
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

// The shrub — the first node that exists in one region and nowhere else, which
// is a promise with two halves. It has to BE there, and it has to be absent
// everywhere that didn't ask, including the town's own ground.
describe("shrubs", () => {
  it("grow only where a biome asks for them", () => {
    // Every region without a `shrubs` number must produce none, over enough
    // ground that a rare roll would have shown up. The meadow matters most: it
    // is the town's own region and its terrain is a promise to live saves.
    const seed = 7;
    for (const spot of SPOTS) {
      let meadowShrubs = 0;
      for (let x = -40; x <= 40; x++) {
        for (let y = -40; y <= 40; y++) {
          if (biomeAt(seed, spot, x, y) !== "meadow") continue;
          if (generatedTile(seed, spot, x, y) === SHRUB) meadowShrubs++;
        }
      }
      expect(meadowShrubs).toBe(0);
    }
  });

  it("actually appear in the glimmer", () => {
    // Ring-sampled rather than walked: the far country starts around 200 tiles
    // out, and the point is that a region asking for shrubs gets a useful number
    // of them rather than a token one.
    const seed = 7;
    const spot = "riverside" as const;
    let cells = 0;
    let shrubs = 0;
    for (let x = -600; x <= 600; x += 3) {
      for (let y = -600; y <= 600; y += 3) {
        if (biomeAt(seed, spot, x, y) !== "glimmer") continue;
        cells++;
        if (generatedTile(seed, spot, x, y) === SHRUB) shrubs++;
      }
    }
    expect(cells).toBeGreaterThan(500);
    // Some, and not most: undergrowth you walk around, not a hedge maze.
    expect(shrubs / cells).toBeGreaterThan(0.01);
    expect(shrubs / cells).toBeLessThan(0.12);
  });

  it("is worth a quarter of a tree and clears to grass, not dirt", () => {
    // The yield is the balance argument in DESIGN §Biomes: shrubs live in the far
    // country, so they must never make the walk pay. Four fellings to a tree's
    // one, and no bare patch left behind to scar a wood for two wood.
    expect(NODES.shrub.drop).toBe(NODES.tree.drop);
    expect(NODES.shrub.yield * 4).toBe(NODES.tree.yield);
    expect(NODES.shrub.felled).toBe(GRASS);
    expect(NODES.tree.felled).toBe(DIRT);
    // And it is reachable by the generic gathering path — no second code path.
    expect(nodeForTile(SHRUB, "surface")).toBe("shrub");
  });
});

describe("deadwood", () => {
  it("gathers like everything else made of wood", () => {
    // The rule these exist to keep honest, and they shipped for one day breaking
    // it: A TILE IS AN OBJECT AND YIELDS ITS MATERIAL (DESIGN §Biomes). A solid,
    // tile-sized, obviously-wooden thing that hands back nothing, standing next
    // to a shrub that pays two wood for the same swing, is not a rule anybody can
    // read off a screen.
    for (const id of ["stump", "log"] as const) {
      expect(NODES[id].drop).toBe(NODES.tree.drop);
      // Never the better move. A standing tree has to stay the best wood in the
      // world, or deadwood becomes a reason to walk somewhere — which is the one
      // thing DESIGN §Biomes forbids a region's contents to be.
      expect(NODES[id].yield).toBeLessThan(NODES.tree.yield);
      // Grass, not dirt — the shrub's argument. A wood pocked with bare patches
      // for three wood apiece is a tidying job.
      expect(NODES[id].felled).toBe(GRASS);
      // The slowest in the table: a shrub is a season's growth, a fallen tree is
      // a decade's, and a wood that restocks its deadwood overnight is a supply.
      expect(NODES[id].regrowMs).toBeGreaterThan(NODES.tree.regrowMs!);
      // Placed by the deadwood roll in world.ts, never rolled against here — the
      // dark tree's `density: 0` precedent.
      expect(NODES[id].density).toBe(0);
    }
    expect(NODES.log.yield).toBeGreaterThan(NODES.stump.yield); // a log is more wood
    // Reachable by the generic path, so ACT finds them with no second code path.
    expect(nodeForTile(STUMP, "surface")).toBe("stump");
    expect(nodeForTile(LOG, "surface")).toBe("log");
  });
});

// Stone. Each region weathers its own, which is appearance — but two of the
// promises it could break are not.
describe("stone", () => {
  it("leaves the meadow's alone", () => {
    // The town's own region says nothing about stone, so it keeps the default
    // grey and the original three silhouettes. Every other region is a departure
    // FROM this one, and a departure needs somewhere to depart from — a tinted
    // rock in the meadow would re-landscape the view from everybody's porch.
    expect(BIOMES.meadow.stone).toBeUndefined();
  });

  it("keeps shards out in the far country", () => {
    // A shard reads as stone that GREW rather than fell. That is a statement
    // about how strange somewhere is, so it may only be made where strangeness
    // is the premise — near town, stone is just stone.
    const near = new Set(
      FIELD_WEIGHTS.filter(([, w]) => w.near > 0).map(([id]) => id),
    );
    for (const def of Object.values(BIOMES)) {
      if (!def.stone?.shapes?.includes("shard")) continue;
      expect(near.has(def.id)).toBe(false);
    }
  });

  it("never turns stone into a different material", () => {
    // Every region gathers plain `stone`, whatever colour it is standing there —
    // the same promise the champagne mushroom keeps. A tint and a silhouette are
    // appearance; a yield would be the far country paying better for the walk.
    expect(NODES.rock.drop).toBe("stone");
    for (const def of Object.values(BIOMES)) {
      // A tint is a DIRECTION and an amount, never a replacement: at 1.0 the
      // stone would stop being stone-coloured at all.
      //
      // THE BURNT ROWS GO FURTHER, BY NAME. What this cap protects is that a rock
      // still reads as a rock, and it was doing that job by proxy — by assuming
      // that any ground a rock sits on is lighter than the rock. On ash it is not:
      // at 0.46 the cinders' boulders measured (111,103,94) against a floor of
      // (66,58,56), which is a granite rock from somewhere else lying on a burnt
      // plain. Their stone is the same cooled rock the lava lake has a lid of, so
      // it is allowed to be that colour.
      //
      // STILL SHORT OF 1.0, AND THAT IS THE REAL RULE HERE. The stone's lit, body
      // and shaded greys are pulled toward one colour by one number, so at 1.0 all
      // three arrive together and the rock is a flat silhouette — which is the
      // thing this assertion has always been about, one step past where it used to
      // catch it. At 0.92 eight levels survive between the lit row and the foot,
      // and a rock still reads as a rounded object rather than a hole.
      const cap = def.id === "cinder" || def.id === "caldera" ? 0.95 : 0.5;
      if (def.stone?.tint) expect(def.stone.tint.amount, def.id).toBeLessThan(cap);
    }
  });
});

// Spring. The first thing in the game that is only there for part of the year
// and is not weather — which is allowed because it is drawn and nothing else.
describe("blooms", () => {
  it("always declare a season", () => {
    // A `bloom` without one is just a second decor kit, and two permanent kits on
    // one floor is the clutter this slot exists to avoid. The slot means "what is
    // here NOW" — if it is here always, it belongs in `decor`.
    for (const def of Object.values(BIOMES)) {
      if (!def.bloom) continue;
      expect(def.bloom.season).toBeDefined();
    }
  });

  it("leave the town's own ground bare, and the country's alone", () => {
    // This used to read "the meadow has no bloom", on the grounds that leaving
    // town is when the ground starts having things in it. The rule survives; what
    // changed is who pays for it. A region with no flowers is bare in every meadow
    // in the world, and `meadow` is the commonest of them; a region marked `mown`
    // is bare where the town is, which is the only place the rule was ever about.
    expect(BIOMES.meadow.bloom?.season).toBe("spring");
    expect(BIOMES.meadow.mown).toBe(true);
  });

  it("gives spring the signature it lacked", () => {
    // Summer has fireflies, autumn the largest crown swing in seasons.ts, winter
    // bare crowns. This asserts the gap stays closed: if every spring bloom were
    // ever deleted, spring would go back to being a slightly different green and
    // nothing on the ground would know what month it was.
    const springs = Object.values(BIOMES).filter((d) => d.bloom?.season === "spring");
    expect(springs.length).toBeGreaterThanOrEqual(3);
  });

  it("never grows on ground that is already busy with the same colour", () => {
    // The far country is left out deliberately, and this is the reason written
    // down: those regions carry their strangeness in the air and the canopy, and
    // a bloom is one more small bright thing on floors that have enough.
    for (const id of ["dusk", "glimmer", "glass"] as const) {
      expect(BIOMES[id].bloom).toBeUndefined();
    }
  });
});

describe("the flora interleaves across a region border", () => {
  // 8d blended the turf and left the trees stopping on a line. `scatterRegion`
  // is the other half: a cell near a border rolls WHICH of its neighbouring
  // regions its trees, rocks and mushrooms grew from, weighted by the same
  // shares the tint is blended from. These pin the three things that has to be
  // at once — invisible in the bulk of the world, off entirely near the town,
  // and an actual ramp where two regions meet.

  it("changes nothing away from a border", () => {
    // The bulk of the map is one region deep, and there the pick has exactly one
    // part to choose from. If this ever drifts, every tree in the world moved.
    let checked = 0;
    for (let y = -300; y <= 300; y += 7) {
      for (let x = -300; x <= 300; x += 7) {
        const hard = biomeAt(4, "coast", x, y);
        const grew = scatterRegion(4, "coast", x, y);
        if (grew === hard) continue;
        // Where they differ it must be a border, never open country: some other
        // region has to be close enough to have a share of this tile.
        expect(regionParts(4, "coast", x, y).length).toBeGreaterThan(1);
        checked++;
      }
    }
    // And it must actually happen somewhere, or this test passes by doing nothing.
    expect(checked).toBeGreaterThan(0);
  });

  it("does not dither anywhere near the town, on a thousand seeds", () => {
    // THE GUARANTEE THE WHOLE JOB RESTED ON. `biomeAt` is untouched by the
    // dither, so the town's meadow is still meadow — but the SCATTER is what
    // grows a tree, and a tree inside a house somebody already built is the
    // failure this margin exists to prevent. The arithmetic said the nearest
    // border is 21 tiles out and the blend reaches 5, leaving about one tile of
    // daylight over a town footprint that reaches 15 — too thin to rest a live
    // save on, so `scatterRegion` refuses to dither inside HOME_REGION_REACH and
    // this asserts it rather than the arithmetic.
    for (const spot of SPOTS) {
      for (let a = 0; a < 16; a++) {
        const th = (a / 16) * Math.PI * 2;
        for (const r of [0, 7, 14, HOME_REGION_REACH]) {
          const x = Math.round(Math.cos(th) * r);
          const y = Math.round(Math.sin(th) * r);
          for (let seed = 1; seed <= 1000; seed++) {
            if (scatterRegion(seed, spot, x, y) !== biomeAt(seed, spot, x, y)) {
              throw new Error(`seed ${seed} ${spot}: (${x},${y}) dithered inside the town's reach`);
            }
          }
        }
      }
    }
  });

  it("thins a treeline out instead of stopping it on a line", () => {
    // THE MEASUREMENT THE FEATURE IS FOR, and it has to be taken PER ROW.
    // Averaging tree counts in straight vertical bands either side of a border
    // reports a gentle ramp on a perfectly hard edge, because the border wanders
    // — `BIOME_WARP` doing its job — so a fixed column is inside one region on
    // some rows and the other on the rest. The first version of this test did
    // exactly that, and it passed against the generator from BEFORE the dither.
    //
    // So: every crossing where pinewood gives way to scrub with twelve clean
    // tiles either side, pooled by signed distance from the crossing. Pinewood
    // is 2.2x trees and scrub a tenth of that — the sharpest contrast the table
    // has.
    const trees = new Map<number, number>();
    const cells = new Map<number, number>();
    let crossings = 0;
    for (let seed = 1; seed <= 5; seed++) {
      for (let y = -400; y <= 400; y += 4) {
        for (let x = -400; x < 400; x++) {
          if (biomeAt(seed, "coast", x, y) !== "pinewood") continue;
          if (biomeAt(seed, "coast", x + 1, y) !== "scrub") continue;
          let clean = true;
          for (let o = -12; o <= 12 && clean; o++) {
            if (biomeAt(seed, "coast", x + o, y) !== (o <= 0 ? "pinewood" : "scrub")) clean = false;
          }
          if (!clean) continue;
          crossings++;
          for (let o = -12; o <= 12; o++) {
            cells.set(o, (cells.get(o) ?? 0) + 1);
            if (generatedTile(seed, "coast", x + o, y) === TREE)
              trees.set(o, (trees.get(o) ?? 0) + 1);
          }
        }
      }
    }
    expect(crossings).toBeGreaterThan(150); // the pool is worth reading

    const band = (from: number, to: number): number => {
      let t = 0;
      let c = 0;
      for (let o = from; o <= to; o++) {
        t += trees.get(o) ?? 0;
        c += cells.get(o) ?? 0;
      }
      return t / c;
    };

    // TWO RATIOS, NOT A CURVE FIT, because a hash is noisy and a threshold on
    // one offset is a threshold on the noise. Both are stated against the
    // region's OWN plateau, so neither depends on what the densities happen to
    // be — only on the shape of the edge between them.
    //
    // Measured against the generator from before the dither, which is the only
    // way to know an assertion discriminates: spill was 1.18 and thinning 1.08
    // — a flat edge, as it should have been.
    const spill = band(1, 4) / band(9, 12);
    const thinning = band(-4, 0) / band(-12, -9);
    expect(spill).toBeGreaterThan(2); // trees stand past the line, into the scrub
    expect(thinning).toBeLessThan(0.9); // and the wood is thinner as it approaches it
  });

  it("rolls the region on its own hash, not the one that placed the tree", () => {
    // 8k's bug, which measured as working: the decor kit fed its region pick the
    // same hash that had just passed `< density`, so the pick only ever saw the
    // bottom tenth of its range and handed the first part every cell. If that
    // happened here, one side of every border would win outright.
    let a = 0;
    let b = 0;
    for (let y = -300; y <= 300; y++) {
      for (let x = -300; x <= 300; x++) {
        const parts = regionParts(9, "lakeside", x, y);
        if (parts.length < 2) continue;
        const grew = scatterRegion(9, "lakeside", x, y);
        if (grew === biomeAt(9, "lakeside", x, y)) a++;
        else b++;
      }
    }
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
    // The tile's own region is the heaviest share by construction, so it must
    // win most of the time — but never all of it.
    expect(b / (a + b)).toBeGreaterThan(0.05);
    expect(b / (a + b)).toBeLessThan(0.5);
  });
});

describe("a found place wears one region", () => {
  // The fairy ring's whole premise, printed in the Notebook, is that its
  // mushrooms are ONE organism fruiting at its own rim. A ring lying across a
  // region border used to be drawn with two kinds of cap — two organisms in a
  // perfect circle, by coincidence — first because `regionSkin` took the tile's
  // own side of the line, and then more finely once the scatter dither made it
  // per cell. `scatterSkin` asks the place's CENTRE instead.
  it("draws every tile of a straddling ring the same, cap and crown alike", () => {
    let straddlers = 0;
    for (let seed = 1; seed <= 60 && straddlers < 8; seed++) {
      for (const kind of ["fairyring", "ringgrove"] as const) {
        const def = FOUND[kind];
        // Walk the first few instances' rings the way shot-sky.mts finds a
        // staircase: they are hundreds of tiles out and the bearing is seeded.
        for (let i = 0; i < 3; i++) {
          const ring = def.ring + i * def.spacing;
          const n = Math.ceil((2 * Math.PI * ring) / 2);
          for (let a = 0; a < n; a++) {
            const th = (a / n) * Math.PI * 2;
            const cx = Math.round(Math.cos(th) * ring);
            const cy = Math.round(Math.sin(th) * ring);
            const site = foundPlaceAt(seed, "coast", cx, cy);
            if (!site || site.kind !== kind) continue;

            // Does this one lie across a border at all? Only those are evidence.
            const cells: { x: number; y: number }[] = [];
            for (let dy = -def.radius; dy <= def.radius; dy++)
              for (let dx = -def.radius; dx <= def.radius; dx++)
                if (Math.hypot(dx, dy) <= def.radius) cells.push({ x: site.x + dx, y: site.y + dy });
            const regions = new Set(cells.map((c) => biomeAt(seed, "coast", c.x, c.y)));
            if (regions.size < 2) continue;

            straddlers++;
            const skins = new Set(
              cells.map((c) => JSON.stringify(scatterSkin(seed, "coast", c.x, c.y))),
            );
            expect(skins.size, `${kind} at ${site.x},${site.y} on seed ${seed}`).toBe(1);
            break;
          }
        }
      }
    }
    // A vacuous pass is the failure mode here: if no ring in sixty seeds lay
    // across a border, this asserted nothing at all.
    expect(straddlers).toBeGreaterThan(0);
  });
});
