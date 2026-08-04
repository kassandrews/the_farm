// "Look at this" — the verb that pays nothing, asserted to pay nothing. The
// byte-identical-log check is the whole point: a later "improvement" that
// files a memory or a friendship point per pointed-at rock would flood the
// ring and turn a remark into a faucet.

import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { lookKindNear } from "./play";
import { lookAtLine } from "./dialogue";
import { setTile, groveCentre } from "./world";
import { TREE, GRASS } from "../content/tiles";
import { makeRng } from "./rng";
import type { WorldState } from "./types";

function freshWorld(): WorldState {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 21 });
}

describe("what's here to look at", () => {
  it("finds the most specific thing near the player, and null on bare grass", () => {
    const w = freshWorld();
    w.player.x = 40;
    w.player.y = 40;
    for (let y = 38; y <= 42; y++) for (let x = 38; x <= 42; x++) setTile(w, x, y, GRASS);
    expect(lookKindNear(w)).toBeNull();
    setTile(w, 41, 40, TREE);
    expect(lookKindNear(w)).toBe("tree");
  });

  it("never remarks on a secret — the exclusions are spyKindAt's, wholesale", () => {
    const w = freshWorld();
    const grove = groveCentre(w.seed, w.homestead.spot);
    w.player.x = grove.x;
    w.player.y = grove.y;
    expect(lookKindNear(w)).toBeNull();
  });

  it("refuses off the surface", () => {
    const w = freshWorld();
    w.player.layer = "under";
    expect(lookKindNear(w)).toBeNull();
  });
});

describe("the remark costs nothing", () => {
  it("writes no memory and pays no friendship — the logs are identical before and after", () => {
    const w = freshWorld();
    const v = w.villagers.find((x) => x.id === "resident1")!;
    const memoryBefore = JSON.stringify(v.memory);
    const warmth = v.friendship;
    const line = lookAtLine(v, "tree", makeRng(3));
    expect(line.length).toBeGreaterThan(0);
    expect(JSON.stringify(v.memory)).toBe(memoryBefore);
    expect(v.friendship).toBe(warmth);
  });

  it("steers repeats through the said ring", () => {
    const w = freshWorld();
    const v = w.villagers.find((x) => x.id === "resident1")!;
    const first = lookAtLine(v, "tree", makeRng(3));
    expect(v.said).toContain(first);
  });
});
