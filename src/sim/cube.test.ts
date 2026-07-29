import { describe, it, expect } from "vitest";
import { newWorld, tick, contextAction, actionTarget } from "./game";
import { cubeSite, groveCentre, warrenChamber, tileAt, isWalkable } from "./world";
import { HUM_CUBE, DARK_TREE } from "../content/tiles";
import { nodeAt } from "./gather";
import { RESIDENT_MEMORY } from "../content/dialogue";
import { STANDARD_FORMS } from "../content/canon/forms";
import { invite } from "./company";
import { humLevel, HUM_REACH } from "./hum";

function freshWorld(seed = 4242) {
  return newWorld({ name: "Sprout", form: "dog", spot: "hilltop", seed });
}

const NOON = new Date(2026, 6, 1, 12, 0).getTime();

describe("the Humming Cube", () => {
  it("is exactly one cell, far out, and in every town", () => {
    for (const seed of [1, 4242, 99999, 0x7fffffff, 12345678]) {
      const w = freshWorld(seed);
      const c = cubeSite(seed, "hilltop");
      expect(tileAt(w, c.x, c.y)).toBe(HUM_CUBE);
      // Its neighbours are not it. A landmark is a thing, not a region.
      expect(tileAt(w, c.x + 1, c.y)).not.toBe(HUM_CUBE);
      expect(tileAt(w, c.x, c.y + 1)).not.toBe(HUM_CUBE);
      expect(Math.hypot(c.x, c.y)).toBeGreaterThan(50);
    }
  });

  it("is solid, which is the whole of its protection", () => {
    // Solidity means you cannot stand on it, so the shovel and the hoe — which
    // act on the tile underfoot — can never reach it. No rule says so.
    const w = freshWorld();
    const c = cubeSite(w.seed, w.homestead.spot);
    expect(isWalkable(w, c.x, c.y)).toBe(false);
  });

  it("is not a node, so gathering walks past it", () => {
    const w = freshWorld();
    const c = cubeSite(w.seed, w.homestead.spot);
    expect(nodeAt(w, c.x, c.y)).toBeNull();

    // Stood beside it with the axe: the reticle finds nothing here.
    w.player.x = c.x - 1;
    w.player.y = c.y;
    w.player.facing = 1;
    // The reticle may well find an ordinary tree elsewhere in reach — the cube
    // stands in a field, not a void. What it must never find is the cube.
    const target = actionTarget(w, "gather");
    expect(target.x === c.x && target.y === c.y).toBe(false);
    contextAction(w, "gather", NOON);
    expect(tileAt(w, c.x, c.y)).toBe(HUM_CUBE);
  });

  it("shares its walk with nothing else — not the grove, not the warren", () => {
    for (const seed of [1, 4242, 99999, 7, 31337]) {
      const cube = cubeSite(seed, "hilltop");
      const grove = groveCentre(seed, "hilltop");
      const warren = warrenChamber(seed);
      expect(Math.hypot(cube.x - grove.x, cube.y - grove.y)).toBeGreaterThan(10);
      expect(Math.hypot(cube.x - warren.x, cube.y - warren.y)).toBeGreaterThan(10);
    }
  });

  it("is never in the grove's cells", () => {
    const w = freshWorld();
    const c = cubeSite(w.seed, w.homestead.spot);
    expect(tileAt(w, c.x, c.y)).not.toBe(DARK_TREE);
  });
});

describe("the hum", () => {
  it("is silent from anywhere you would ordinarily be", () => {
    const w = freshWorld();
    // Standing on your own plot, which is where the game starts you.
    expect(humLevel(w)).toBe(0);
  });

  it("is loudest at it and falls to nothing at the edge of earshot", () => {
    const w = freshWorld();
    const c = cubeSite(w.seed, w.homestead.spot);
    w.player.x = c.x;
    w.player.y = c.y;
    expect(humLevel(w)).toBe(1);

    w.player.y = c.y + HUM_REACH;
    expect(humLevel(w)).toBe(0);
    w.player.y = c.y + HUM_REACH + 5;
    expect(humLevel(w)).toBe(0);
  });

  it("stays quiet for most of the approach, then arrives", () => {
    // The squared curve, stated as the thing it is for: at half of earshot it
    // is a quarter loud, so it confirms rather than steers.
    const w = freshWorld();
    const c = cubeSite(w.seed, w.homestead.spot);
    w.player.x = c.x;
    w.player.y = c.y + HUM_REACH / 2;
    expect(humLevel(w)).toBeCloseTo(0.25, 5);
  });

  it("cannot be heard through the ground", () => {
    const w = freshWorld();
    const c = cubeSite(w.seed, w.homestead.spot);
    w.player.x = c.x;
    w.player.y = c.y;
    w.player.layer = "under";
    expect(humLevel(w)).toBe(0);
  });
});

describe("what the walk out there leaves behind", () => {
  it("is a memory, in whoever came with you, and in nobody else", () => {
    const w = freshWorld();
    // Somebody comes along. Warm them up first — company has a threshold.
    const mate = w.villagers.find((v) => v.id === "resident1")!;
    mate.friendship = 100;
    invite(w, mate.id, NOON);

    const c = cubeSite(w.seed, w.homestead.spot);
    w.player.x = c.x;
    w.player.y = c.y + 1;
    mate.x = c.x + 1;
    mate.y = c.y + 1;

    const bystander = w.villagers.find((v) => v.id === "office")!;
    bystander.memory = [];

    tick(w, 1 / 60, NOON);

    expect(mate.memory.some((m) => m.kind === "hum")).toBe(true);
    // The town is not told. A town that talks about the cube has been told
    // about it by the game.
    expect(bystander.memory.some((m) => m.kind === "hum")).toBe(false);
  });

  it("is recorded once, however long you stand there", () => {
    const w = freshWorld();
    const mate = w.villagers.find((v) => v.id === "resident1")!;
    mate.friendship = 100;
    invite(w, mate.id, NOON);

    const c = cubeSite(w.seed, w.homestead.spot);
    w.player.x = c.x;
    w.player.y = c.y + 1;
    mate.x = c.x + 1;
    mate.y = c.y + 1;

    for (let i = 0; i < 200; i++) tick(w, 1 / 60, NOON);
    expect(mate.memory.filter((m) => m.kind === "hum").length).toBe(1);
  });

  it("is nothing else at all — no item, no finish, no unlock", () => {
    const w = freshWorld();
    const skins = [...w.skins.unlocked];
    const inv = JSON.stringify(w.inventory);

    const c = cubeSite(w.seed, w.homestead.spot);
    w.player.x = c.x;
    w.player.y = c.y + 1;
    for (let i = 0; i < 200; i++) tick(w, 1 / 60, NOON);

    expect(w.skins.unlocked).toEqual(skins);
    expect(JSON.stringify(w.inventory)).toBe(inv);
  });

  it("has a line for every standard form, because the line is the entire payout", () => {
    // The errands rule, at its strongest: nothing else comes of the longest walk
    // in the game, so a form with no line would leave that player with nothing.
    for (const form of STANDARD_FORMS) {
      expect(RESIDENT_MEMORY[form]?.hum?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
