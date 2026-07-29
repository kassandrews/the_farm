import { describe, it, expect } from "vitest";
import { tileAt, setTile, tileKey, canDig, canCarve, depthAt, dig, sink } from "./world";
import { GRASS, TREE, ORE_VEIN } from "../content/tiles";
import {
  buriedAt,
  digWithFind,
  isVirginGround,
  embeddedAt,
  deepFindLine,
  carveWithFind,
  DEEP_FIND_DEPTH,
} from "./junk";
import { count } from "./inventory";
import { newWorld, contextAction } from "./game";
import { JUNK_DENSITY, JUNK_FINDS, DEEP_FINDS } from "../content/junk";

function freshWorld() {
  return newWorld({ name: "Sprout", form: "scholar", spot: "hilltop", seed: 99 });
}

/** A patch of virgin ground with something under it, for the tests that need
 *  one. Searches rather than hardcoding a coordinate: the density is content
 *  and may be retuned, and a test that breaks when a designer changes a number
 *  is a test that teaches people to distrust tests. */
function buriedTile(world: ReturnType<typeof freshWorld>): { x: number; y: number } {
  for (let y = -40; y < 40; y++) {
    for (let x = -40; x < 40; x++) {
      if (canDig(world, x, y) && isVirginGround(world, x, y) && buriedAt(world, x, y)) {
        return { x, y };
      }
    }
  }
  throw new Error("no buried tile in range — is JUNK_DENSITY zero?");
}

describe("junk — what the ground turns up", () => {
  it("is a total function of the seed, not a roll", () => {
    // Two worlds with the same seed bury the same things in the same places;
    // the same tile asked twice never changes its mind. This is what makes the
    // ground a real place rather than scenery that reshuffles.
    const a = freshWorld();
    const b = freshWorld();
    for (let i = 0; i < 50; i++) {
      expect(buriedAt(a, i, -i)).toBe(buriedAt(b, i, -i));
      expect(buriedAt(a, i, -i)).toBe(buriedAt(a, i, -i));
    }
  });

  it("does not correlate with where the trees are", () => {
    // Its own salt, for the same reason generation hashes trees and rocks
    // separately: shared entropy draws stripes across the map.
    const w = freshWorld();
    let buriedUnderTree = 0;
    let buried = 0;
    for (let y = -30; y < 30; y++) {
      for (let x = -30; x < 30; x++) {
        if (!buriedAt(w, x, y)) continue;
        buried++;
        if (tileAt(w, x, y) === TREE) buriedUnderTree++;
      }
    }
    expect(buried).toBeGreaterThan(20);
    // Trees are ~10-18% of ground; junk under them should be in that ballpark,
    // not 0% and not 100%, either of which would mean the hashes are linked.
    expect(buriedUnderTree / buried).toBeLessThan(0.5);
  });

  it("pays out once, and the same tile never pays again", () => {
    const w = freshWorld();
    const { x, y } = buriedTile(w);
    expect(digWithFind(w, x, y).find).toBeTruthy();
    expect(count(w.inventory, "junk")).toBe(1);

    // Spent twice over: the dig wrote an override, and `canDig` won't take the
    // dirt it left behind. Digging is one-way, which is what makes the ground
    // un-mineable without storing a list of everywhere anyone has ever dug.
    expect(digWithFind(w, x, y)).toEqual({ dug: false, find: null });
    expect(count(w.inventory, "junk")).toBe(1);

    // The known seam, asserted rather than pretended away: restore the tile to
    // exactly what generation says and the override vanishes, so the ground is
    // fresh again. Only the Gremlin's away event can reach this, and him having
    // put something back is in character. See sim/junk.ts.
    setTile(w, x, y, GRASS);
    expect(digWithFind(w, x, y).find).toBeTruthy();
    expect(count(w.inventory, "junk")).toBe(2);
  });

  it("NEVER pays out where the shovel can't dig", () => {
    // The farm this rule exists to close: a generated tree is virgin ground
    // with no override, so a payout that didn't check `canDig` would hand over
    // junk on every tap at a tree, forever, with nothing written down to stop
    // it. Found by reading the call order, not by playing.
    const w = freshWorld();
    let checked = 0;
    for (let y = -30; y < 30 && checked < 5; y++) {
      for (let x = -30; x < 30 && checked < 5; x++) {
        if (tileAt(w, x, y) !== TREE || !buriedAt(w, x, y)) continue;
        checked++;
        expect(digWithFind(w, x, y)).toEqual({ dug: false, find: null });
        expect(digWithFind(w, x, y)).toEqual({ dug: false, find: null }); // still, on the retry
      }
    }
    expect(checked).toBeGreaterThan(0); // the case was actually exercised
    expect(count(w.inventory, "junk")).toBe(0);
  });

  it("stays quiet on ground with nothing in it", () => {
    // Most digs. Reporting the absence would turn a free verb into a slot
    // machine that mostly tells you that you lost.
    const w = freshWorld();
    for (let y = -30; y < 30; y++) {
      for (let x = -30; x < 30; x++) {
        if (canDig(w, x, y) && isVirginGround(w, x, y) && !buriedAt(w, x, y)) {
          expect(digWithFind(w, x, y).find).toBeNull();
          return;
        }
      }
    }
  });

  it("is not so common that digging becomes noise", () => {
    // A guard on the CONTENT, not the code: junk should be a small event, and
    // if this ever reads like every other tile, the number moved too far.
    expect(JUNK_DENSITY).toBeGreaterThan(0.02);
    expect(JUNK_DENSITY).toBeLessThan(0.3);
  });

  it("arrives through the shovel, in the real action path", () => {
    // The unit above tests the function; this tests that ACT is wired to it.
    const w = freshWorld();
    const { x, y } = buriedTile(w);
    w.player.x = x;
    w.player.y = y;
    const res = contextAction(w, "dig", Date.now());
    expect(res.changed).toBe(true);
    expect(count(w.inventory, "junk")).toBe(1);
    // The find replaces the ordinary line rather than queueing behind it.
    expect(res.message).not.toBe("You turn the earth.");
    expect(tileKey(x, y) in w.overrides).toBe(true);
  });
});

describe("junk in the deep rock", () => {
  /** A piece of rock with something in it, out past the depth threshold.
   *  Searched for the same reason the surface helper searches: the density and
   *  the threshold are both content and both allowed to move. */
  function embeddedRock(
    world: ReturnType<typeof freshWorld>,
  ): { x: number; y: number } {
    for (let y = -40; y < 40; y++) {
      for (let x = -40; x < 40; x++) {
        if (!canCarve(world, x, y)) continue;
        if (depthAt(world, x, y) < DEEP_FIND_DEPTH) continue;
        if (embeddedAt(world, x, y)) return { x, y };
      }
    }
    throw new Error("no embedded rock in range — is DEEP_JUNK_DENSITY zero?");
  }

  /** A world with one shaft at the origin, which is what makes depth mean
   *  anything: with no shaft at all every cell is infinitely deep. */
  function minedWorld() {
    const w = freshWorld();
    setTile(w, 0, 0, GRASS); // the plaza is paved; a shaft needs diggable ground
    dig(w, 0, 0);
    sink(w, 0, 0);
    return w;
  }

  it("pays nothing in the shallow rock beside your own shaft", () => {
    // The threshold is the fiction: near a shaft you are under ground you have
    // already turned from above, so there is nothing left down there.
    const w = minedWorld();
    let paid = 0;
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        if (!canCarve(w, x, y)) continue;
        if (carveWithFind(w, x, y).find) paid++;
      }
    }
    expect(paid).toBe(0);
    expect(count(w.inventory, "junk")).toBe(0);
  });

  it("pays out once in the deep rock, and that cell is spent", () => {
    const w = minedWorld();
    const at = embeddedRock(w);
    const first = carveWithFind(w, at.x, at.y);
    expect(first.carved).toBe(true);
    expect(first.find).not.toBeNull();
    expect(count(w.inventory, "junk")).toBe(1);

    // Cut rock is cut. There is no second swing at the same face, which is what
    // makes this un-farmable without a `dug` set to remember it.
    const again = carveWithFind(w, at.x, at.y);
    expect(again.carved).toBe(false);
    expect(again.find).toBeNull();
    expect(count(w.inventory, "junk")).toBe(1);
  });

  it("says something the lawn would never say", () => {
    // A separate table, because finding somebody's bent spoon thirty tiles into
    // solid stone would quietly say the underground is just more lawn.
    const w = minedWorld();
    const at = embeddedRock(w);
    const line = carveWithFind(w, at.x, at.y).find!;
    expect(DEEP_FINDS).toContain(line);
    expect(JUNK_FINDS).not.toContain(line);
  });

  it("never takes the ore instead", () => {
    // A vein is a node and goes through gathering; the pick that cuts rock must
    // not be able to cut it away, with or without a payout attached.
    const w = minedWorld();
    for (let y = -40; y < 40; y++) {
      for (let x = -40; x < 40; x++) {
        if (tileAt(w, x, y, "under") !== ORE_VEIN) continue;
        const r = carveWithFind(w, x, y);
        expect(r.carved).toBe(false);
        expect(r.find).toBeNull();
        expect(tileAt(w, x, y, "under")).toBe(ORE_VEIN);
        return;
      }
    }
    throw new Error("no vein in range");
  });

  it("is a total function of the seed, like everything else down there", () => {
    const a = freshWorld();
    const b = freshWorld();
    for (let i = 0; i < 50; i++) {
      expect(embeddedAt(a, i, -i)).toBe(embeddedAt(b, i, -i));
      expect(deepFindLine(a, i, -i)).toBe(deepFindLine(b, i, -i));
    }
  });
});
