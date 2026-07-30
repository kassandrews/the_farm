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
  placePlank,
  isWalkable,
  canDig,
  till,
  tileAt,
  setTile,
  groveCentre,
  cubeSite,
  homesteadOrigin,
} from "./world";
import { newWorld, contextAction, playerTile } from "./game";
import { canPlaceStructure } from "./structures";
import { canPlaceFurniture } from "./furniture";
import { updateReclaim } from "./gather";
import { WATER, SHALLOW, SAND, GRASS, PLANK, TREE } from "../content/tiles";
import { WATER_KINDS } from "../content/water";
import type { HomesteadSpot } from "./types";

const SPOTS: HomesteadSpot[] = ["riverside", "forest", "hilltop"];

describe("the sea is finite", () => {
  it("has a far shore due west of a riverside town", () => {
    // THE HEADLINE. The old sea was `x <= -13 is water, at every y, forever`, so
    // this walk never ended. Walking straight out of town to the west must reach
    // water, and then reach land again.
    for (let seed = 1; seed <= 60; seed++) {
      let sawWater = false;
      let landAfterWater = 0;
      for (let x = 0; x > -400; x--) {
        const t = generatedTile(seed, "riverside", x, 0);
        if (t === WATER) {
          sawWater = true;
          landAfterWater = 0;
        } else if (sawWater && t !== SHALLOW) {
          landAfterWater++;
        }
      }
      expect(sawWater).toBe(true); // riverside still has its sea
      // Land, and a decent stretch of it, not one lucky tile of coast.
      expect(landAfterWater).toBeGreaterThan(20);
    }
  });

  it("is bounded in every direction, on every spot", () => {
    // Not just west. A ring right around the outside of the world at a radius
    // past the sea's own reach must be dry somewhere on every bearing... and
    // more to the point, must not be water everywhere.
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 40; seed++) {
        let wet = 0;
        let total = 0;
        for (let a = 0; a < 64; a++) {
          const th = (a / 64) * Math.PI * 2;
          const x = Math.round(Math.cos(th) * 340);
          const y = Math.round(Math.sin(th) * 340);
          total++;
          if (generatedTile(seed, spot, x, y) === WATER) wet++;
        }
        // At 340 out, past the sea (radius 90 centred at most 145 out), nothing
        // should be open ocean at all.
        expect(wet).toBe(0);
        expect(total).toBe(64);
      }
    }
  });

  it("still puts water off the west of a riverside town, where it always was", () => {
    // The compatibility half. A riverside player has been looking at water out
    // of their western window since the day their town was made, and a finite
    // sea must not have quietly moved it over the horizon.
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

  it("never laps the plaza", () => {
    // The old shore sat at x = -13 and the plaza's western edge is -5, so the
    // wobble has eight tiles to wander in and it must not spend them all. The
    // plaza is stone regardless (generatedTile answers paving first), so what
    // this really guards is the ring of ground immediately around the town.
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 200; seed++) {
        for (let y = -9; y <= 7; y++) {
          for (let x = -9; x <= 9; x++) {
            const t = generatedTile(seed, spot, x, y);
            expect(t).not.toBe(WATER);
          }
        }
      }
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
    // Sampled beyond anywhere the sea or the lake can reach, so any deep water
    // found out here came from a stream or a pond — the two kinds that must
    // never have any. The sea is radius ~98 at worst centred at most 145 out;
    // the lake is 18 at 104. 300 clears both with room to spare.
    let streams = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (let y = -300; y <= 300; y += 2) {
        for (let x = -300; x <= 300; x += 2) {
          if (Math.hypot(x, y) < 300) continue;
          const t = generatedTile(seed, "hilltop", x, y);
          if (t === SHALLOW) streams++;
          expect(t).not.toBe(WATER);
        }
      }
    }
    expect(streams).toBeGreaterThan(200); // and there really are streams out there
  });

  it("keeps the shallows walkable and the deep not", () => {
    const w = newWorld({ name: "T", form: "dog", spot: "forest", seed: 5 });
    setTile(w, 40, 40, SHALLOW);
    setTile(w, 41, 40, WATER);
    expect(isWalkable(w, 40, 40)).toBe(true);
    expect(isWalkable(w, 41, 40)).toBe(false);
  });

  it("declares a shelf every kind's own water can actually be measured against", () => {
    // A stray zero here would make every stream in the world a wall.
    for (const kind of Object.values(WATER_KINDS)) {
      expect(kind.shelf).toBeGreaterThan(0);
      expect(kind.beach).toBeGreaterThan(0);
    }
  });
});

describe("the shore", () => {
  it("puts sand between the land and the water", () => {
    // Walk west out of a riverside town to the open sea and the crossing must
    // read outward-in as sand → shallow → deep. A beach that generated INSIDE
    // the water, or water that met grass with no shore at all, would both pass
    // a "there is sand somewhere" test.
    //
    // The SEA specifically, found by walking to the first deep tile and reading
    // backwards. Walking forwards and taking the first wet thing would keep
    // catching STREAMS on the way, which cross this line and are allowed to
    // arrive without a bank: their beach is one tile, and a one-tile band on a
    // continuous field often falls between two cell centres. On a stream that
    // is texture. On the sea, whose beach is three, it would be a bug.
    for (let seed = 1; seed <= 40; seed++) {
      let deep = 0;
      for (let x = 0; x > -200; x--) {
        if (generatedTile(seed, "riverside", x, 0) === WATER) {
          deep = x;
          break;
        }
      }
      expect(deep).toBeLessThan(0); // found the sea at all

      let x = deep;
      let shallow = 0;
      while (generatedTile(seed, "riverside", x, 0) === WATER) x++;
      while (generatedTile(seed, "riverside", x, 0) === SHALLOW) {
        shallow++;
        x++;
      }
      let sand = 0;
      while (generatedTile(seed, "riverside", x, 0) === SAND) {
        sand++;
        x++;
      }
      expect(shallow).toBeGreaterThan(0);
      expect(sand).toBeGreaterThan(0);
    }
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
    expect(placePlank(w, 25, 25)).toBe(true);
    expect(placePlank(w, 26, 25)).toBe(true);
    expect(tileAt(w, 25, 25)).toBe(PLANK);
    expect(tileAt(w, 26, 25)).toBe(PLANK);
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
  });
});
