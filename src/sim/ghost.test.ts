import { describe, it, expect } from "vitest";
import { newWorld, tick, contextAction } from "./game";
import { migrateSave } from "./save";
import { meetGhost, ghostMet, ghost, groveCut } from "./ghost";
import { groveCentre, cubeSite, inGrove, tileAt, setTile, isWalkable } from "./world";
import { DARK_TREE, GRASS, WATER, HUM_CUBE } from "../content/tiles";
import { nodeAt } from "./gather";
import { speak } from "./dialogue";
import { makeRng } from "./rng";
import { GHOST_QUIET, GHOST_CUT } from "../content/dialogue";
import { present } from "./presence";
import { canInvite } from "./company";
import { possibleAskers } from "./errands";

function freshWorld() {
  return newWorld({ name: "Sprout", form: "dog", spot: "hilltop", seed: 4242 });
}

/** Two instants, both real. Every test about her is a test about the hour. */
const MIDNIGHT = new Date(2026, 6, 1, 0, 30).getTime();
const NOON = new Date(2026, 6, 1, 12, 0).getTime();

function standInGrove(w: ReturnType<typeof freshWorld>) {
  const c = groveCentre(w.seed, w.homestead.spot);
  w.player.layer = "surface";
  w.player.x = c.x;
  w.player.y = c.y;
  return c;
}

describe("the grove", () => {
  it("is a stand of dark trees, out past everything, with room to stand in it", () => {
    const w = freshWorld();
    const c = groveCentre(w.seed, w.homestead.spot);

    // Far enough out that you did not wander here. Past the Mole's ring (30),
    // which is the only other reason to be forty tiles from the plaza.
    expect(Math.hypot(c.x, c.y)).toBeGreaterThan(35);

    // Trees, plural, and not a solid block: you have to be able to walk in.
    let trees = 0;
    let gaps = 0;
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        if (tileAt(w, c.x + dx, c.y + dy) === DARK_TREE) trees++;
        else gaps++;
      }
    }
    expect(trees).toBeGreaterThan(8);
    expect(gaps).toBeGreaterThan(trees);

    // And the heart of it is clear — of HER trees and of ordinary ones, which
    // is two rules and had to be, or the plain tree hash fills the clearing and
    // she stands inside a trunk.
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.hypot(dx, dy) > 2) continue;
        expect(tileAt(w, c.x + dx, c.y + dy)).toBe(GRASS);
      }
    }
  });

  it("puts dark trees nowhere else, so the grove is a place and not a species", () => {
    const w = freshWorld();
    const c = groveCentre(w.seed, w.homestead.spot);
    for (let y = -20; y <= 20; y++) {
      for (let x = -20; x <= 20; x++) {
        // Near the town, which is nowhere near the grove for this seed.
        expect(tileAt(w, x, y)).not.toBe(DARK_TREE);
      }
    }
    // Sanity: the assertion above is only meaningful if the grove is elsewhere.
    expect(Math.hypot(c.x, c.y)).toBeGreaterThan(25);
  });

  it("agrees with `inGrove` about which cells are hers", () => {
    const w = freshWorld();
    const c = groveCentre(w.seed, w.homestead.spot);
    for (let dy = -7; dy <= 7; dy++) {
      for (let dx = -7; dx <= 7; dx++) {
        const x = c.x + dx;
        const y = c.y + dy;
        expect(tileAt(w, x, y) === DARK_TREE).toBe(inGrove(w.seed, w.homestead.spot, x, y));
      }
    }
  });
});

describe("a riverside town does not put its landmarks in the sea", () => {
  // Found in the browser, not in a test: a riverside town is open water from
  // x = -13 westward WITHOUT LIMIT, and the river answers before anything else
  // in `generatedTile`. A bearing picked from the seed alone drowned the grove
  // in about half of all riverside towns — trees in the ocean, a Ghost standing
  // in them, and no way to reach either.
  it("keeps the grove and the cube on dry land, on every seed", () => {
    for (const seed of [1, 2, 3, 4242, 99999, 31337, 7, 0x7fffffff]) {
      const w = newWorld({ name: "Sprout", form: "dog", spot: "riverside", seed });
      const g = groveCentre(seed, "riverside");
      const c = cubeSite(seed, "riverside");
      expect(tileAt(w, g.x, g.y)).not.toBe(WATER);
      expect(tileAt(w, c.x, c.y)).toBe(HUM_CUBE);
      // And her clearing is somewhere you can actually stand.
      expect(isWalkable(w, g.x, g.y)).toBe(true);
    }
  });

  it("still puts them somewhere different in each town", () => {
    const seen = new Set(
      [1, 2, 3, 4242, 99999, 31337].map((s) => {
        const g = groveCentre(s, "riverside");
        return `${g.x},${g.y}`;
      }),
    );
    expect(seen.size).toBeGreaterThan(3);
  });
});

describe("the dark wood", () => {
  /** Fell whichever of her trees is next to the player. */
  function fellOne(w: ReturnType<typeof freshWorld>, now: number) {
    const c = groveCentre(w.seed, w.homestead.spot);
    let target: { x: number; y: number } | null = null;
    for (let dy = -6; dy <= 6 && !target; dy++) {
      for (let dx = -6; dx <= 6 && !target; dx++) {
        if (tileAt(w, c.x + dx, c.y + dy) === DARK_TREE) target = { x: c.x + dx, y: c.y + dy };
      }
    }
    expect(target).not.toBeNull();
    // Stand beside it and swing — nodes are solid, so you chop what you face.
    w.player.x = target!.x - 1;
    w.player.y = target!.y;
    w.player.facing = 1;
    return contextAction(w, "gather", now);
  }

  it("is not unlocked in a new town", () => {
    expect(freshWorld().skins.unlocked).not.toContain("walnut");
  });

  it("unlocks walnut when you fell one — the place pays out, not a person", () => {
    const w = freshWorld();
    // By DAYLIGHT, and she is nowhere in this test: the wood does not depend on
    // her existing, which is the whole reason it isn't a commission reward.
    const res = fellOne(w, NOON);
    expect(res.changed).toBe(true);
    expect(w.skins.unlocked).toContain("walnut");
    expect(ghostMet(w)).toBe(false);

    // And it says nothing about an unlock. A secret gets no toast; the line is
    // about the wood.
    expect(res.message?.toLowerCase()).not.toContain("walnut");
    expect(res.message?.toLowerCase()).not.toContain("unlock");
  });

  it("hands over ordinary wood and no new item", () => {
    const w = freshWorld();
    const before = w.inventory.wood ?? 0;
    fellOne(w, NOON);
    expect(w.inventory.wood).toBe(before + 8);
    // DESIGN §Materials: three gathered classes, ever. There is no walnut wood.
    expect(Object.keys(w.inventory)).not.toContain("walnut");
  });

  it("regrows as a dark tree, on the ordinary clock", () => {
    const w = freshWorld();
    const c = groveCentre(w.seed, w.homestead.spot);
    let target: { x: number; y: number } | null = null;
    for (let dy = -6; dy <= 6 && !target; dy++) {
      for (let dx = -6; dx <= 6 && !target; dx++) {
        if (tileAt(w, c.x + dx, c.y + dy) === DARK_TREE) target = { x: c.x + dx, y: c.y + dy };
      }
    }
    w.player.x = target!.x - 1;
    w.player.y = target!.y;
    w.player.facing = 1;
    contextAction(w, "gather", NOON);
    expect(tileAt(w, target!.x, target!.y)).not.toBe(DARK_TREE);

    // Nine hours later (regrowMs is eight), on unclaimed ground.
    tick(w, 1 / 60, NOON + 9 * 3600_000);
    expect(nodeAt(w, target!.x, target!.y)).toBe("darktree");
    expect(tileAt(w, target!.x, target!.y)).toBe(DARK_TREE);
  });
});

describe("meeting the Quiet Ghost", () => {
  it("is not in a new town, and no migration puts her there", () => {
    const w = freshWorld();
    expect(ghostMet(w)).toBe(false);

    const old = JSON.parse(JSON.stringify({ ...w, schemaVersion: 16 }));
    const migrated = migrateSave(old);
    expect(migrated).not.toBeNull();
    expect(migrated!.villagers.some((v) => v.id === "ghost")).toBe(false);
  });

  it("does not happen in the grove by daylight", () => {
    // The clearing is empty at noon. Standing in it must not put her in the
    // save, or she would be there all afternoon, unseeable.
    const w = freshWorld();
    standInGrove(w);
    meetGhost(w, NOON);
    expect(ghostMet(w)).toBe(false);
  });

  it("does not happen at night somewhere else", () => {
    const w = freshWorld();
    w.player.x = 0;
    w.player.y = 0;
    meetGhost(w, MIDNIGHT);
    expect(ghostMet(w)).toBe(false);
  });

  it("does not happen underground, however dark it is down there", () => {
    const w = freshWorld();
    const c = standInGrove(w);
    w.player.layer = "under";
    meetGhost(w, MIDNIGHT);
    expect(ghostMet(w)).toBe(false);
    expect(c).toBeTruthy();
  });

  it("happens exactly once, in the clearing, after dark", () => {
    const w = freshWorld();
    const c = standInGrove(w);
    meetGhost(w, MIDNIGHT);
    expect(ghostMet(w)).toBe(true);

    const g = ghost(w)!;
    expect(g.form).toBe("ghost");
    expect(Math.hypot(g.x - c.x, g.y - c.y)).toBeLessThanOrEqual(1);
    expect(g.layer ?? "surface").toBe("surface");

    meetGhost(w, MIDNIGHT);
    meetGhost(w, MIDNIGHT);
    expect(w.villagers.filter((v) => v.id === "ghost").length).toBe(1);
  });

  it("arrives through the ordinary tick", () => {
    const w = freshWorld();
    standInGrove(w);
    tick(w, 1 / 60, MIDNIGHT);
    expect(ghostMet(w)).toBe(true);
  });
});

describe("the Ghost is not a resident", () => {
  function metWorld() {
    const w = freshWorld();
    standInGrove(w);
    meetGhost(w, MIDNIGHT);
    return w;
  }

  it("is present at night and absent by day, once met", () => {
    const w = metWorld();
    const g = ghost(w)!;
    expect(present(g, MIDNIGHT)).toBe(true);
    expect(present(g, NOON)).toBe(false);
  });

  it("cannot be invited along, and not for being a stranger or being abed", () => {
    const w = metWorld();
    const g = ghost(w)!;
    g.friendship = 100; // as close as anyone gets
    const inv = canInvite(w, g, MIDNIGHT);
    expect(inv.ok).toBe(false);
    // "abed" would be the wrong reason — she does not go to bed, she goes.
    expect(inv.ok === false && inv.why).toBe("rooted");
  });

  it("is never named on the errands board", () => {
    const w = metWorld();
    expect(possibleAskers(w).some((v) => v.id === "ghost")).toBe(false);
  });

  it("does not stay put by luck — she has one stop and never walks", () => {
    const w = metWorld();
    const g = ghost(w)!;
    const at = { x: g.x, y: g.y };
    for (let i = 0; i < 120; i++) tick(w, 1 / 60, MIDNIGHT);
    expect(g.x).toBe(at.x);
    expect(g.y).toBe(at.y);
  });
});

describe("what she says", () => {
  function metWorld() {
    const w = freshWorld();
    standInGrove(w);
    meetGhost(w, MIDNIGHT);
    return w;
  }

  it("speaks her own bank, never the resident machinery", () => {
    const w = metWorld();
    const g = ghost(w)!;
    for (let i = 0; i < 80; i++) {
      expect(GHOST_QUIET).toContain(speak(w, g, makeRng(i), MIDNIGHT).text);
    }
  });

  it("switches banks once you have taken the wood, read off the live world", () => {
    const w = metWorld();
    const g = ghost(w)!;
    expect(groveCut(w)).toBe(false);
    w.skins.unlocked.push("walnut");
    expect(groveCut(w)).toBe(true);
    for (let i = 0; i < 40; i++) {
      expect(GHOST_CUT).toContain(speak(w, g, makeRng(i), MIDNIGHT).text);
    }
  });

  it("never gives directions, and never mentions the finish by name", () => {
    for (const line of [...GHOST_QUIET, ...GHOST_CUT]) {
      const l = line.toLowerCase();
      expect(l).not.toContain("walnut");
      expect(l).not.toContain("finish");
      expect(l).not.toContain("unlock");
      // Nor the other secrets. A hermit who tells you where things are is a map
      // marker with a face, and that rule is hers too.
      expect(l).not.toContain("cube");
      expect(l).not.toContain("mole");
    }
  });
});

describe("she does not witness what she cannot see", () => {
  it("takes no memory of a tree felled in the grove at noon", () => {
    const w = freshWorld();
    standInGrove(w);
    meetGhost(w, MIDNIGHT);
    const g = ghost(w)!;
    g.memory = [];
    g.friendship = 0;

    // Now it is noon. She is not here. Fell one of her trees in front of her
    // fixed coordinate; she must not have seen a thing.
    const c = groveCentre(w.seed, w.homestead.spot);
    setTile(w, c.x + 1, c.y, DARK_TREE);
    w.player.x = c.x;
    w.player.y = c.y;
    w.player.facing = 1;
    contextAction(w, "gather", NOON);

    expect(g.memory).toEqual([]);
    expect(g.friendship).toBe(0);
  });

  it("but does witness the same swing after dark, which is what makes the above bite", () => {
    const w = freshWorld();
    standInGrove(w);
    meetGhost(w, MIDNIGHT);
    const g = ghost(w)!;
    g.memory = [];
    g.friendship = 0;

    const c = groveCentre(w.seed, w.homestead.spot);
    setTile(w, c.x + 1, c.y, DARK_TREE);
    w.player.x = c.x;
    w.player.y = c.y;
    w.player.facing = 1;
    contextAction(w, "gather", MIDNIGHT);

    expect(g.memory.some((m) => m.kind === "gathered")).toBe(true);
    expect(g.friendship).toBeGreaterThan(0);
  });
});
