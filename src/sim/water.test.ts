// Water. The tests here are mostly about ONE promise — that nothing in an
// unbounded world is unbounded water — and it is a promise that cannot be
// checked by looking at a screenshot, because "the far shore is off screen" and
// "there is no far shore" are the same picture. That is exactly the trap the
// fen's 1.3%-under-water bug fell into (ROADMAP §Phase 5), so these measure.

import { describe, it, expect } from "vitest";
import {
  generatedTile,
  canFill,
  fill,
  placeFloor,
  isWalkable,
  canDig,
  till,
  tileAt,
  setTile,
  groveCentre,
  waterKindAt,
  cubeSite,
  homesteadOrigin,
  isleCap,
  biomeAt,
} from "./world";
import { newWorld, contextAction, playerTile, tick } from "./game";
import { canPlaceStructure } from "./structures";
import { canPlaceFurniture } from "./furniture";
import { updateReclaim } from "./gather";
import { findPath } from "./path";
import { WATER, SHALLOW, SAND, GRASS, FLOOR, TREE, LAVA } from "../content/tiles";
import { WATER_KINDS } from "../content/water";
import { BIOMES } from "../content/biomes";
import { allTownBuildings } from "../content/town";
import type { HomesteadSpot } from "./types";

const SPOTS: HomesteadSpot[] = ["riverside", "forest", "lakeside", "coast"];

/** Vitest's default timeout is 5s, which is tuned for unit tests that call a
 *  function a few times. The transects below evaluate the terrain generator over
 *  hundreds of thousands of tiles, on purpose and irreducibly — the comments on
 *  each one explain why a shorter scan measures the ray rather than the world.
 *
 *  They pass in 1.6–5.0s alone, which means the slowest genuinely exceeds the
 *  default and the rest clear it by too little to survive a loaded machine. Two
 *  of them timed out the first time this suite was run alongside a typecheck and
 *  a build in the same command — a green suite that goes red when the laptop is
 *  busy teaches you to re-run tests instead of believing them, which is worse
 *  than a slow test.
 *
 *  Generous rather than snug: this is a ceiling that catches a HANG, not a
 *  budget for a scan. If one of these ever approaches it, the fix is to look at
 *  what got slower, not to raise the number. */
const TRANSECT = 30_000;

describe("the sea is finite", () => {
  /** Every run of sea water along a ray, in tiles. The ruler both of the tests
   *  below want: one asks whether the runs are BOUNDED, the other whether there
   *  is more than one of them.
   *
   *  It counts the sea's own tiles and nothing else, which is the lesson three
   *  earlier versions of this file paid for — measuring the world AROUND a sea
   *  keeps being answered by whatever other water happens to be nearby. */
  function seaRuns(seed: number, spot: HomesteadSpot, dx: number, dy: number, reach: number) {
    const runs: number[] = [];
    let run = 0;
    for (let i = 0; i < reach; i++) {
      const x = Math.round(dx * i);
      const y = Math.round(dy * i);
      // The sea's whole footprint, sand and shallows included, not just its deep
      // middle. "I reached the ocean" is the event both tests are about, and a
      // ray that clips a body near its rim never touches the shelf at all.
      const wet = waterKindAt(seed, spot, x, y) === "sea";
      if (wet) run++;
      else if (run > 0) {
        runs.push(run);
        run = 0;
      }
    }
    if (run > 0) runs.push(run); // still wet at the end of the scan: unbounded
    return runs;
  }

  it("recurs throughout the world, rather than being one ocean on a plain", () => {
    // THE HEADLINE, and the second time this file has had to move it. The first
    // sea was `x <= -13 is water, at every y, forever` — a wall through an
    // infinite world. Making it finite fixed the wall and left the other half of
    // the same bug: ONE ocean, on an endless dry plain, so walking far enough in
    // any direction meant water never happening again.
    //
    // A world with exactly one of something is a diorama. So: walk far enough
    // and you must meet several distinct seas.
    //
    // THE SCAN IS LONG BECAUSE THE VARIANCE IS HUGE, and every shorter version of
    // this test was measuring the ray rather than the world. Seas are scattered,
    // not spaced, so a bearing can thread between them for thousands of tiles by
    // luck: on six thousand tiles seed 1 meets one sea and seed 9 meets fourteen,
    // and there is nothing wrong with seed 1. Twenty thousand tiles on two
    // bearings is where the answer stops depending on which line you walked —
    // every seed meets at least six, and the floor here has room under it.
    for (let seed = 1; seed <= 10; seed++) {
      let met = 0;
      for (let a = 0; a < 2; a++) {
        const th = (a / 2) * Math.PI * 2;
        met += seaRuns(seed, "forest", Math.cos(th), Math.sin(th), 20000).length;
      }
      expect(met).toBeGreaterThan(3);
    }
  }, TRANSECT);

  it("has a far shore on every ray, on every spot", () => {
    // THE OTHER HALF, and the one that must survive the scatter. Every sea is
    // still a body you can get round: no single crossing may run on and on.
    //
    // Stated as a bound on RUN LENGTH rather than as "no sea past radius N",
    // which is what it used to say and what the scatter makes meaningless —
    // there is sea past every radius now, and that is the feature. The question
    // was never "is the water far away", it is "does this body end".
    //
    // A chord of the widest sea is at most 2 × (140 + its wobble + its beach),
    // and a scan can clip two seas that happen to touch, so the ceiling is
    // doubled again. Measured longest across twenty seeds is 246, so there is a
    // factor of two under this. What it still catches is the thing it exists
    // for: a run that never ends.
    const widest = 2 * (140 * 1.1 + 3 + 5) * 2; // two maximal seas, merged
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 25; seed++) {
        for (let a = 0; a < 8; a++) {
          const th = (a / 8) * Math.PI * 2;
          const runs = seaRuns(seed, spot, Math.cos(th), Math.sin(th), 2500);
          for (const run of runs) expect(run).toBeLessThan(widest);
        }
      }
    }
  }, TRANSECT);

  it("still puts water off the west of a riverside town, where it always was", () => {
    // The compatibility half, and it now means something different than it did.
    // A riverside player has been looking at water out of their western window
    // since the day their town was made. That water used to be a pinned sea —
    // a fossil of the era when the ocean was the whole western half-plane, which
    // is also the era the spot got its name in. The scatter removed the pin, so
    // the water is a RIVER now, which is what the name said all along.
    //
    // The promise being kept is the view, not the kind: something wet, a short
    // walk west, on every seed.
    for (let seed = 1; seed <= 60; seed++) {
      let firstWet = 0;
      for (let x = -1; x > -80; x--) {
        const t = generatedTile(seed, "riverside", x, 0);
        if (t === WATER || t === SHALLOW) {
          firstWet = x;
          break;
        }
      }
      expect(firstWet).toBeLessThan(0);
      expect(firstWet).toBeGreaterThan(-45); // still a short walk, not an expedition
    }
  });

  it("gives a riverside town an actual river, on every seed", () => {
    // The spot is named for water it did not have. `RIVERSIDE_ANCHOR` forces one
    // channel of the river family through the bridge row, west of the plaza, so
    // the name is now load-bearing rather than aspirational.
    //
    // Asked along the bridge row because that is where the anchor sits and where
    // `isTownBridge` builds the crossing — a river through town that villagers
    // could not path over would be worse than no river at all.
    for (let seed = 1; seed <= 200; seed++) {
      let found = false;
      for (let x = -1; x > -40 && !found; x--) {
        if (waterKindAt(seed, "riverside", x, -1) === "river") found = true;
      }
      expect(found).toBe(true);
    }
  });

  it("does not promise the other spots a river", () => {
    // The anchor is riverside's alone. If forest and hilltop also always had a
    // river through town, the spot would be choosing nothing — and a guarantee
    // that applies everywhere is not a guarantee, it is terrain.
    let withRiver = 0;
    for (let seed = 1; seed <= 200; seed++) {
      for (let x = -1; x > -40; x--) {
        if (waterKindAt(seed, "forest", x, -1) === "river") {
          withRiver++;
          break;
        }
      }
    }
    expect(withRiver).toBeLessThan(150);
  });

  it("keeps the big water off the town's own ground entirely", () => {
    // `TOWN_DRY`, and the bug it was written for. A hand-sited sea sat at a fixed
    // ring and could not be anywhere else. A LATTICE has a cell over the origin
    // exactly like it has one everywhere, so once seas were scattered, one landed
    // on the plaza about as often as it landed anywhere — which is what "never
    // laps the plaza" caught, on the seed where it happened.
    //
    // Wider than that test and about both kinds, because the plaza is not the
    // whole town: the homestead is off to one side of it, and a lake in the
    // vegetable patch is the same bug with a nicer view. Sand is allowed — the
    // shore is meant to be able to come near — but standing water is not.
    // THE COAST IS ASKED A NARROWER QUESTION, and it is not a weakened one. The
    // bug above is the SCATTER landing a body on the town by accident, and that
    // path is `clearsTown` — unchanged, and still checked here on all three
    // spots, because the scatter runs on all three. What the coast adds is a
    // body sited on purpose, whose whole reason to exist is that the water comes
    // near; holding it to "no standing water within thirty tiles" would be
    // holding it to not being a coast. It still has to stay off the ground the
    // town actually stands on, which is what the tighter box checks.
    // The spots that SITE a body on purpose are asked the narrower question. The
    // rest keep the full ±30.
    const sited = new Set<HomesteadSpot>(["coast", "lakeside"]);
    for (const spot of SPOTS) {
      const reach = sited.has(spot) ? 16 : 30;
      for (let seed = 1; seed <= 250; seed++) {
        for (let y = -reach; y <= reach; y += 2) {
          for (let x = -reach; x <= reach; x += 2) {
            const k = waterKindAt(seed, spot, x, y);
            if (k !== "sea" && k !== "lake") continue;
            const t = generatedTile(seed, spot, x, y);
            expect([seed, spot, x, y, t]).not.toContain(WATER);
            expect([seed, spot, x, y, t]).not.toContain(SHALLOW);
          }
        }
      }
    }
  });

  it("never laps the plaza", () => {
    // The sea specifically, and its WATER specifically. Three distinctions, all
    // of which this test got wrong once:
    //
    //  • Rivers are allowed through town. That is a deliberate choice and the
    //    town's bridges are what pays for it.
    //  • So is the sea's BEACH. On a riverside town the shore is meant to be a
    //    short walk west — sand four tiles off the plaza is the feature, not the
    //    bug, and forbidding it here would quietly push the ocean over the
    //    horizon and undo the compatibility promise two tests up.
    //  • What must not happen is standing sea water at the town hall steps. The
    //    wobble has eight tiles to wander in and must not spend them all.
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 200; seed++) {
        for (let y = -9; y <= 7; y++) {
          for (let x = -9; x <= 9; x++) {
            if (waterKindAt(seed, spot, x, y) !== "sea") continue;
            const t = generatedTile(seed, spot, x, y);
            expect(t).not.toBe(WATER);
            expect(t).not.toBe(SHALLOW);
          }
        }
      }
    }
  });

  it("never seals the plaza's south edge, on a thousand seeds", () => {
    // The debt the plaza resize left (ROADMAP §Phase 11 tranche 1): shrinking
    // PLAZA to 11×8 handed the old bottom row (y = 3) back to the generator,
    // which on some seeds grows trees or water hard against the south border.
    // Both are FINE — a tree by the square is a tree, a river through town is
    // paid for by the bridges — so this does not assert the row is clear. What
    // must never happen is the whole row coming out solid or deep at once, a
    // wall along the south of the square. Some cell is always standable ground
    // or a bridge deck (the bridge column crosses this row at x 0, so even a
    // channel running along it leaves a crossing).
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 1000; seed++) {
        let open = false;
        for (let x = -5; x <= 5 && !open; x++) {
          const t = generatedTile(seed, spot, x, 3);
          if (t === GRASS || t === SAND || t === SHALLOW || t === FLOOR) open = true;
        }
        expect([seed, spot, open]).toEqual([seed, spot, true]);
      }
    }
  });

  it("keeps standing water off the town's walls, on a thousand seeds", () => {
    // The Phase 11 clearance (`townChannelCap`), and the bug it exists for:
    // rivers are allowed through town on purpose, but `stampBuilding` paves
    // FLOOR under its own footprint, so a channel could vanish under a building
    // and still lap against the outside of its walls or run in the slot between
    // two houses. Sand is allowed — a wide bank against a wall reads as a bank —
    // but standing water is not, within two tiles of any authored building.
    //
    // The full thousand, because this is the tile-level kind of check the
    // 1,000-seed precedent is about (biome.test.ts, found.test.ts) — no world is
    // built, just the generator asked. Two spots rather than four keeps it to
    // the same budget the others run on: riverside because its anchor forces a
    // river NEAR the walls on every seed (the hard case), forest because it is
    // the plain unanchored field.
    // Euclidean distance, because the cap measures Euclidean: the diagonal cell
    // off a corner is 2.83 out, not 2, and may legitimately hold shallow water.
    const ring: { x: number; y: number }[] = [];
    for (const b of allTownBuildings()) {
      for (let y = b.y0 - 2; y <= b.y1 + 2; y++) {
        for (let x = b.x0 - 2; x <= b.x1 + 2; x++) {
          const d = Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));
          if (d > 0 && d <= 2) ring.push({ x, y });
        }
      }
    }
    for (const spot of ["riverside", "forest"] as HomesteadSpot[]) {
      for (let seed = 1; seed <= 1000; seed++) {
        for (const c of ring) {
          const k = waterKindAt(seed, spot, c.x, c.y);
          if (k !== "river" && k !== "stream") continue;
          const t = generatedTile(seed, spot, c.x, c.y);
          if (t === WATER || t === SHALLOW) {
            expect([seed, spot, c.x, c.y, t]).toBe("dry");
          }
        }
      }
    }
  });

  it("still gives a riverside town WET river, not a promise kept in sand", () => {
    // The clearance is a cap, not a subtraction, precisely so this stays true:
    // the anchor sits three tiles from Prudence's west wall, and a subtraction
    // would have dried the promised river exactly at the town on pinched seeds.
    // `waterKindAt` counts the beach as river, so the test two describes up
    // cannot see the difference — this one asks for actual water on the bridge
    // row, which is also what the bridge needs a deck over.
    for (let seed = 1; seed <= 200; seed++) {
      let wet = false;
      for (let x = -1; x > -40 && !wet; x--) {
        const t = generatedTile(seed, "riverside", x, -1);
        if ((t === WATER || t === SHALLOW || t === FLOOR) && waterKindAt(seed, "riverside", x, -1) === "river") {
          wet = true;
        }
      }
      expect([seed, wet]).toEqual([seed, true]);
    }
  });
});

describe("no landmark stands in the water", () => {
  it("keeps the grove and the cube on dry ground, on every spot", () => {
    // `onLand`, which used to be a mirror and is now sixteen bearings. The old
    // version was a true sentence about a half-plane sea ("the land is the other
    // way") and is nonsense about a disc — and reflecting a point out of a disc
    // can land it in the town, which is the failure mode that replaced it.
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 300; seed++) {
        for (const c of [groveCentre(seed, spot), cubeSite(seed, spot)]) {
          expect(generatedTile(seed, spot, c.x, c.y)).not.toBe(WATER);
          expect(generatedTile(seed, spot, c.x, c.y)).not.toBe(SHALLOW);
        }
      }
    }
  });

  it("keeps every landmark at exactly its ring", () => {
    // The ring is the whole feeling of "you were going somewhere", so a fix for
    // wet ground that quietly moved a secret closer would be worse than the bug.
    // Sixteen bearings at a fixed radius is what buys this; a radial push out of
    // the water would not.
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 300; seed++) {
        const g = groveCentre(seed, spot);
        const c = cubeSite(seed, spot);
        expect(Math.hypot(g.x, g.y)).toBeGreaterThan(42);
        expect(Math.hypot(c.x, c.y)).toBeGreaterThan(56);
      }
    }
  });
});

describe("small water is fordable, and nothing had to say so", () => {
  it("never generates deep water in a stream or a pond", () => {
    // The geometry claim from DESIGN §Water, tested rather than trusted: a
    // stream is narrower than its shelf, so it has no middle to be deep in. If
    // someone widens STREAM_HALF_MAX past WATER_KINDS.stream.shelf this fails,
    // which is the day the crossing promise would otherwise break silently.
    //
    // Asked of the KIND, which is the only way to ask it now that rivers exist:
    // a river's middle is deep on purpose, and it is deep in the same tile id.
    let streams = 0;
    for (let seed = 1; seed <= 12; seed++) {
      for (let y = -300; y <= 300; y += 3) {
        for (let x = -300; x <= 300; x += 3) {
          const kind = waterKindAt(seed, "forest", x, y);
          if (kind !== "stream" && kind !== "pond") continue;
          streams++;
          expect(generatedTile(seed, "forest", x, y)).not.toBe(WATER);
        }
      }
    }
    expect(streams).toBeGreaterThan(200); // and there really are streams out there
  });

  it("keeps every fordable kind narrower than its own shelf", () => {
    // The claim above, stated exactly rather than sampled. A stream is crossable
    // BECAUSE it is too narrow to be deep, so this is the arithmetic the whole
    // promise rests on — and it fails the moment somebody widens a stream,
    // which is the edit most likely to break it by accident.
    for (const id of ["stream"] as const) {
      const kind = WATER_KINDS[id];
      expect(kind.channel!.halfMax).toBeLessThan(kind.shelf);
    }
    // And the inverse for the river: wide enough that its middle IS deep, or it
    // is just an expensive stream.
    const river = WATER_KINDS.river;
    expect(river.channel!.halfMax).toBeGreaterThan(river.shelf);
  });

  it("keeps every pinching channel's narrows fordable", () => {
    // The river's half of the promise, and until now it lived only in a comment.
    // A river is allowed to be deep, so it needs the fords its pinch cuts — and
    // the arithmetic ties two numbers together that LOOK independent in the
    // table. Widening `halfMax` without deepening `pinch` leaves a river with no
    // crossing anywhere along it, which is not a visible bug: it looks like a
    // river, and you find out by walking a bank for a mile.
    for (const kind of Object.values(WATER_KINDS)) {
      const ch = kind.channel;
      if (!ch?.pinch) continue;
      expect(ch.halfMax * (1 - ch.pinch)).toBeLessThan(kind.shelf);
    }
  });

  it("keeps the shallows walkable and the deep not", () => {
    const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 5 });
    setTile(w, 40, 40, SHALLOW);
    setTile(w, 41, 40, WATER);
    expect(isWalkable(w, 40, 40)).toBe(true);
    expect(isWalkable(w, 41, 40)).toBe(false);
  });

  it("wades the shallows slower than it walks the grass", () => {
    // Crossing water should COST something, and the only currency this game
    // spends is seconds (no stamina — DESIGN invariant). So the test is a race:
    // the same walk, the same tick, one lap on grass and one in the water.
    const walk = (tile: number): number => {
      const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 5 });
      const { x, y } = playerTile(w);
      for (let i = 0; i <= 6; i++) setTile(w, x + i, y, tile);
      w.player.target = { x: x + 6, y };
      const from = w.player.x;
      tick(w, 0.25, Date.now());
      return w.player.x - from;
    };
    const dry = walk(GRASS);
    const wet = walk(SHALLOW);
    expect(wet).toBeGreaterThan(0); // wading, not wall
    expect(wet).toBeLessThan(dry * 0.8);
  });

  it("declares a shelf every kind's own water can actually be measured against", () => {
    // A stray zero here would make every stream in the world a wall.
    for (const kind of Object.values(WATER_KINDS)) {
      expect(kind.shelf).toBeGreaterThan(0);
      expect(kind.beach).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives sand to the big water and to nothing else", () => {
    // "Sand means big water" is a rule a player can read off the screen, so it
    // has to hold in the table or the screen starts lying. It is also load
    // bearing for a duller reason: a one-tile beach on a two-tile channel lands
    // between cell centres as often as on one, and came out as chunky patches
    // on alternating banks rather than as a shore.
    expect(WATER_KINDS.stream.beach).toBe(0);
    expect(WATER_KINDS.pond.beach).toBe(0);
    for (const id of ["river", "lake", "sea"] as const) {
      expect(WATER_KINDS[id].beach).toBeGreaterThan(0);
    }
  });
});

describe("the shore", () => {
  it("puts sand between the land and the water", () => {
    // Walk west until you reach open sea and the crossing must read outward-in
    // as sand → shallow → deep. A beach that generated INSIDE the water, or
    // water that met grass with no shore at all, would both pass a "there is
    // sand somewhere" test.
    //
    // The scan runs to 3000 tiles because no town is promised a coast any more.
    // A seed whose western ray never meets salt water is not a failure, it is a
    // landlocked town, so those are SKIPPED and the count at the bottom is what
    // keeps the skip honest.
    //
    // The SEA specifically, found by walking to the first deep tile and reading
    // backwards. Walking forwards and taking the first wet thing would keep
    // catching STREAMS on the way, which cross this line and are allowed to
    // arrive without a bank: their beach is one tile, and a one-tile band on a
    // continuous field often falls between two cell centres. On a stream that
    // is texture. On the sea, whose beach is three, it would be a bug.
    let clean = 0;
    // More seeds than the 40 this used to need, because landlocked seeds are
    // skipped now and only about half of them reach salt water going west.
    for (let seed = 1; seed <= 150; seed++) {
      // The SEA's first deep tile, not the first deep tile of any kind — a
      // river crossing this line gets there first on plenty of seeds, and a
      // river is a different cross-section (it is allowed to arrive without
      // much of a beach, and its shallows are a rim rather than a shelf).
      let deep = 0;
      for (let x = 0; x > -3000; x--) {
        if (generatedTile(seed, "riverside", x, 0) === WATER && waterKindAt(seed, "riverside", x, 0) === "sea") {
          deep = x;
          break;
        }
      }
      if (deep === 0) continue; // landlocked to the west; nothing to say here

      let x = deep;
      let shallow = 0;
      let sand = 0;
      while (generatedTile(seed, "riverside", x, 0) === WATER) x++;
      while (generatedTile(seed, "riverside", x, 0) === SHALLOW) {
        shallow++;
        x++;
      }
      while (generatedTile(seed, "riverside", x, 0) === SAND) {
        sand++;
        x++;
      }
      expect(shallow).toBeGreaterThan(0);

      // The beach, UNLESS something else owns the ground it would have been on.
      // A stream or river running along the back of a beach into the sea is a
      // backwater, and it is allowed to exist: its own water outranks the sea's
      // sand (wettest wins, see `waterAt`), and streams have no banks by design.
      // Seed 18 riverside is one, and it is a nicer thing to have found than a
      // rule saying it can't happen.
      //
      // So the question is asked of the FIRST TILE THAT ISN'T SAND: either the
      // sea gave it a beach, or somebody else owns it. What is forbidden is the
      // sea's own water meeting grass with no shore in between.
      if (sand > 0) {
        clean++;
      } else {
        expect(waterKindAt(seed, "riverside", x, 0)).not.toBe("sea");
      }
    }
    // With teeth: the interesting case is rare, and if a change ever made it the
    // common one the assertion above would be skipping most of its work
    // silently — which is how a test quietly stops testing anything.
    expect(clean).toBeGreaterThan(30);
  });

  it("behaves exactly like the ground it replaces", () => {
    // Sand is a skin (DESIGN §Water). If it ever stops being diggable or
    // tillable it has quietly become a penalty for living by the sea.
    const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 9 });
    setTile(w, 30, 30, SAND);
    expect(canDig(w, 30, 30)).toBe(true);
    setTile(w, 30, 30, SAND);
    expect(till(w, 30, 30)).toBe(true);
  });
});

describe("terraforming reaches the water", () => {
  it("fills shallow and deep alike, leaving shore", () => {
    const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 3 });
    setTile(w, 20, 20, SHALLOW);
    setTile(w, 21, 20, WATER);
    expect(canFill(w, 20, 20)).toBe(true);
    expect(canFill(w, 21, 20)).toBe(true);
    fill(w, 20, 20);
    fill(w, 21, 20);
    expect(tileAt(w, 20, 20)).toBe(SAND);
    expect(tileAt(w, 21, 20)).toBe(SAND);
  });

  it("never heals back to water", () => {
    // The one deliberate exception to "the world heals where you aren't
    // invested" (DESIGN §Water). Filling books NO reclaim, so no amount of time
    // passing can take it back — a sea closing over an afternoon's work while
    // you were asleep is a tax on the one activity the doc calls free.
    const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 3 });
    setTile(w, 22, 22, WATER);
    fill(w, 22, 22);
    updateReclaim(w, Date.now() + 40 * 24 * 3600 * 1000);
    expect(tileAt(w, 22, 22)).toBe(SAND);
  });

  it("reaches deep water you are standing NEXT to, not on", () => {
    // Deep water is solid, so "the tile underfoot" can never be it — the shovel
    // has to reach, the way felling a tree does. This is the whole gesture that
    // makes the ocean fillable.
    const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 3 });
    const at = playerTile(w);
    // Clear the ground around so nothing else in the action ladder can win.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) setTile(w, at.x + dx, at.y + dy, GRASS);
    }
    w.player.heading = "e";
    setTile(w, at.x + 1, at.y, WATER);
    const res = contextAction(w, "dig", Date.now());
    expect(res.changed).toBe(true);
    expect(tileAt(w, at.x + 1, at.y)).toBe(SAND);
  });

  it("beats both the ground underfoot and a tree beside you", () => {
    // Water ahead outranks the tile underfoot, which is the one place the
    // action ladder's usual precedence gives way — see actionTarget. Without it
    // the shore (SAND, and diggable) would swallow every tap and the sea would
    // be unfillable from the only place you can stand to fill it.
    const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 3 });
    const at = playerTile(w);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) setTile(w, at.x + dx, at.y + dy, GRASS);
    }
    w.player.heading = "e";
    setTile(w, at.x + 1, at.y, WATER);
    setTile(w, at.x, at.y - 1, TREE);
    const wood = w.inventory.wood ?? 0;
    contextAction(w, "dig", Date.now());
    expect(tileAt(w, at.x + 1, at.y)).toBe(SAND);
    expect(w.inventory.wood ?? 0).toBe(wood); // the tree is still standing
  });
});

describe("what water will and will not take", () => {
  it("takes a plank, at either depth — you may bridge the ocean", () => {
    // Deliberate (DESIGN §Water): real time gates this world, never the
    // player's hands. Someone who planks ninety tiles to the far shore has
    // built the best story this game can produce.
    const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 7 });
    setTile(w, 25, 25, WATER);
    setTile(w, 26, 25, SHALLOW);
    expect(placeFloor(w, 25, 25, "pine")).toBe(true);
    expect(placeFloor(w, 26, 25, "pine")).toBe(true);
    expect(tileAt(w, 25, 25)).toBe(FLOOR);
    expect(tileAt(w, 26, 25)).toBe(FLOOR);
  });

  it("will not take a building in the shallows", () => {
    // Shallow water is not `solid` — that is the entire point of it — so every
    // placement guard, which tests exactly that one flag, waves it through
    // unless told otherwise. Without this the first arrival's cottage gets
    // sited in the surf.
    const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 7 });
    setTile(w, 28, 28, SHALLOW);
    expect(canPlaceStructure(w, 28, 28)).toBe(false);
    setTile(w, 28, 28, GRASS);
    expect(canPlaceStructure(w, 28, 28)).toBe(true);
  });

  it("will not take furniture in the shallows either", () => {
    const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 7 });
    setTile(w, 32, 32, SHALLOW);
    expect(canPlaceFurniture(w, 32, 32, "bed", "s")).toBe(false);
  });
});

describe("islands", () => {
  // `isleCap` below −3 (the sea's beach) proves a cell is dry land carved from
  // the sea: the gate only lets an island exist where the raw field is deep, so
  // the cap alone is the island detector — see its docblock.
  const DRY = -3;

  it("exist, and no dry cell of one stands alone", () => {
    // The two halves of the roadmap's own requirement in one sweep. Existence,
    // because a field tuned too shy would pass every safety test by generating
    // nothing; and no single cells, because a one-tile island is the per-cell
    // edges failure wearing a beach, and `canStep` refuses diagonals past it so
    // it is a pathing hazard besides. Every dry island cell must have a dry
    // orthogonal neighbour.
    let tops = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (let y = -480; y <= 480; y += 2) {
        for (let x = -480; x <= 480; x += 2) {
          if (isleCap(seed, "forest", x, y) >= DRY) continue;
          tops++;
          const alone =
            isleCap(seed, "forest", x + 1, y) >= DRY &&
            isleCap(seed, "forest", x - 1, y) >= DRY &&
            isleCap(seed, "forest", x, y + 1) >= DRY &&
            isleCap(seed, "forest", x, y - 1) >= DRY;
          if (alone) expect([seed, x, y]).toBe("not alone");
        }
      }
    }
    expect(tops).toBeGreaterThan(0);
  });

  it("puts real ground on a dry top — the SEA never wets it", () => {
    // The whole point of the field: where the cap says land, the sea has no
    // say. Other water may — a fen pond on an island, a stream across one, are
    // both legal and neither is this field's business — so the assertion is
    // about the kind, not about wetness. The first draft asserted total dryness
    // and failed on seed 2 at (56,149): a pond, on an island, in a fen. Which
    // is a place worth having found, and not a bug.
    let checked = 0;
    outer: for (let seed = 1; seed <= 60; seed++) {
      for (let y = -400; y <= 400; y += 3) {
        for (let x = -400; x <= 400; x += 3) {
          if (isleCap(seed, "forest", x, y) >= DRY - 1) continue;
          const t = generatedTile(seed, "forest", x, y);
          if (t === WATER || t === SHALLOW) {
            expect([seed, x, y, waterKindAt(seed, "forest", x, y)]).not.toContain("sea");
          }
          checked++;
          if (checked >= 25) break outer;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("puts no island land near the town, on a thousand seeds", () => {
    // Not `Infinity` — a legal island can live in a sea whose near shore is
    // sixty tiles out, close enough that its cap VALUE reaches the box while
    // never biting. What must be true is that no island puts LAND (or even its
    // sand) on ground near town: the cap stays at or above the waterline here.
    // This is the consequence that re-landscapes somebody's home if the gate's
    // arithmetic ever changes out from under it.
    //
    // ONE ASSERTION, NOT 882,000. This walked a thousand seeds calling `expect`
    // twice per cell, and the assertions — not the arithmetic — put the test at
    // 5.0s against vitest's 5.0s default. It passed alone and failed under a
    // loaded suite, which is the worst shape a test can have: a red that says
    // nothing about the code. Collecting the first offender and asserting on it
    // once keeps every seed checked AND names which one broke, since the failure
    // message prints the tuple rather than "expected -3 to be >= 0".
    let bad: { seed: number; spot: string; x: number; y: number; cap: number } | null = null;
    outer: for (let seed = 1; seed <= 1000; seed++) {
      for (let y = -40; y <= 40; y += 4) {
        for (let x = -40; x <= 40; x += 4) {
          for (const spot of ["forest", "riverside"] as const) {
            const cap = isleCap(seed, spot, x, y);
            if (cap < 0) {
              bad = { seed, spot, x, y, cap };
              break outer;
            }
          }
        }
      }
    }
    expect(bad).toBeNull();
  });
});

describe("a river may run through town, because the town has bridges", () => {
  it("keeps the homestead walkable from the plaza, on hundreds of seeds", () => {
    // THE PRICE OF LETTING RIVERS THROUGH TOWN, and the reason the bridges are
    // generated rather than stamped.
    //
    // A river is the first water that can genuinely stop somebody, and it
    // matters more for the RESIDENTS than for the player: a villager who cannot
    // path to their stop does not walk slowly, it snaps there (villagers.ts).
    // So a town cut in half by a river doesn't look like a town cut in half by a
    // river — it looks like the neighbours teleporting, which is a bug report
    // nobody could write usefully.
    //
    // Pathing, not tile-reading, because that is the actual question. A test
    // that asserted "no deep water near town" would forbid the feature we just
    // agreed to.
    for (const spot of SPOTS) {
      // 250 rather than the 1000 the tile-level tests use: this one builds a
      // whole world and runs A* per seed, and at 1000 it was 28 seconds of a
      // 10-second suite. The first failure it ever found showed up in the first
      // fifty (the sea, drawn too close on riverside, cutting the plot off).
      for (let seed = 1; seed <= 250; seed++) {
        const w = newWorld({ name: "T", form: "dog", spot, seed });
        const home = homesteadOrigin(spot);
        // From the plaza to the plot. MAX_PATH_NODES is ~25 tiles of reach, and
        // these are inside that, so a null here means genuinely blocked rather
        // than merely far.
        expect(findPath(w, { x: 0, y: 0 }, { x: home.x, y: home.y })).not.toBeNull();
      }
    }
  }, TRANSECT);

  it("decks the water and not the bank", () => {
    // A bridge that planked its own approaches would read as a road that stops
    // at the water's edge for no reason. Find a town whose crossing exists, and
    // check the deck sits only where the water is.
    let found = 0;
    for (let seed = 1; seed <= 400 && found < 12; seed++) {
      for (let x = -22; x <= 22; x++) {
        if (generatedTile(seed, "forest", x, -1) !== FLOOR) continue;
        found++;
        // Planked, so there was water here — and the kind is one the town
        // bridges rather than the sea.
        const kind = waterKindAt(seed, "forest", x, -1);
        expect(kind === "river" || kind === "stream").toBe(true);
        break;
      }
    }
    expect(found).toBeGreaterThan(0); // some town, somewhere, has a bridge
  });
});

describe("the homestead is never wet", () => {
  it("generates nothing you cannot stand on around the tent, on a thousand seeds", () => {
    // The clearing guard, which is what promises you always arrive somewhere you
    // can stand. Streams are allowed to run through town (nothing here is
    // precious at this phase) but not through the plot you start on.
    for (const spot of SPOTS) {
      const home = homesteadOrigin(spot);
      for (let seed = 1; seed <= 1000; seed++) {
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const t = generatedTile(seed, spot, home.x + dx, home.y + dy);
            expect(t).not.toBe(WATER);
            expect(t).not.toBe(SHALLOW);
          }
        }
      }
    }
  }, TRANSECT);
});

describe("the two blob fields — the fen's ponds and the cinders' lava", () => {
  /** What fraction of a region's cells a feature actually covers, measured the
   *  only way that is honest: by generating the region and counting.
   *
   *  `hit` is asked per cell rather than a tile id being compared, because the
   *  fen's own question is not "is this wet" — a stream crossing a fen is wet and
   *  is not the fen's doing. Asking `waterKindAt` for a POND measures the field
   *  this test is actually about, and the first draft of it measured everything
   *  wet and reported the fen at 21% against a declared 6%. */
  function coverage(id: "fen" | "cinder", hit: (x: number, y: number, seed: number) => boolean) {
    let cells = 0;
    let hits = 0;
    for (const seed of [3, 17, 93, 404]) {
      // A ring wide enough to contain several regions of the kind we want. The
      // cinders are far country and are the rarest row out there, so they need a
      // much longer sweep than a fen forty tiles from home.
      const from = id === "fen" ? 60 : 900;
      const span = id === "fen" ? 220 : 700;
      for (let r = from; r < from + span; r += 2) {
        for (let a = 0; a < 24; a++) {
          const th = (a / 24) * Math.PI * 2;
          const x = Math.round(Math.cos(th) * r);
          const y = Math.round(Math.sin(th) * r);
          if (biomeAt(seed, "forest", x, y) !== id) continue;
          cells++;
          if (hit(x, y, seed)) hits++;
        }
      }
    }
    expect(cells).toBeGreaterThan(400); // or the measurement means nothing
    return hits / cells;
  }

  it("floods the fen at about the fraction it claims", () => {
    // THE BUG THIS WHOLE FILE EXISTS FOR (see its header): a fen 1.3% under water
    // while its row claimed ten. `pondDepth` grew a salt argument when the lava
    // arrived, defaulted to the fen's own value so nothing moved — and "nothing
    // moved" is a claim, so here it is measured. Loose bounds on purpose: ponds
    // merge and clip against shores, so the delivered fraction is never the
    // declared one exactly. What it must not be is zero, or double.
    const got = coverage("fen", (x, y, seed) => waterKindAt(seed, "forest", x, y) === "pond");
    expect(got).toBeGreaterThan(BIOMES.fen.water * 0.4);
    expect(got).toBeLessThan(BIOMES.fen.water * 3);
  }, 20_000);

  it("burns the cinders at about the fraction they claim", () => {
    const got = coverage(
      "cinder",
      (x, y, seed) => generatedTile(seed, "forest", x, y) === LAVA,
    );
    expect(got).toBeGreaterThan(BIOMES.cinder.lava! * 0.4);
    expect(got).toBeLessThan(BIOMES.cinder.lava! * 3);
  }, 20_000);

  it("keeps a way across the burnt country", () => {
    // The fen's rule, and the reason the number above may never be turned up: a
    // region you cannot cross is a wall rather than a place. Measured as the
    // thing a player actually experiences — walk a straight line through the
    // cinders and you should not be stopped by lava more than occasionally.
    let blocked = 0;
    let steps = 0;
    for (const seed of [3, 17, 93]) {
      for (let r = 900; r < 1700; r += 3) {
        for (let a = 0; a < 16; a++) {
          const th = (a / 12) * Math.PI * 2;
          const x = Math.round(Math.cos(th) * r);
          const y = Math.round(Math.sin(th) * r);
          if (biomeAt(seed, "forest", x, y) !== "cinder") continue;
          steps++;
          if (generatedTile(seed, "forest", x, y) === LAVA) blocked++;
        }
      }
    }
    expect(steps).toBeGreaterThan(200);
    expect(blocked / steps).toBeLessThan(0.12);
  }, 20_000);
});
