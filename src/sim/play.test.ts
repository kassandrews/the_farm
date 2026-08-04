// Play — a game riding the company walk. Mostly NEGATIVES, the house habit
// for a system defined by what it refuses (museum.test.ts's precedent): no
// score, no timer, no cooldown on asking, nothing written for giving up, and
// nothing in the save.

import { describe, it, expect } from "vitest";
import { newWorld, tick } from "./game";
import { invite, companion, partWays, updateCompany, followTarget } from "./company";
import { startPlay, endPlay, playing, foundThem, hiddenTile, hidingSpot, isHiding, FOUND_RADIUS, nearSecret } from "./play";
import { befriend } from "./friendship";
import { setTile, isWalkable } from "./world";
import { findPath } from "./path";
import { TREE, ROCK, GRASS } from "../content/tiles";
import { hasMemory } from "./memory";
import { makeRng } from "./rng";
import type { WorldState, Villager } from "./types";
import type { CharId } from "../content/cast";

function freshWorld(): WorldState {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 21 });
}

function find(w: WorldState, id: CharId): Villager {
  const v = w.villagers.find((x) => x.id === id);
  if (!v) throw new Error(`no ${id}`);
  return v;
}

/** Companion, ready to play. */
function withCompany(w: WorldState, id: CharId = "resident1"): Villager {
  const v = find(w, id);
  befriend(v, 20);
  if (!invite(w, id, AFTERNOON)) throw new Error("invite refused");
  return v;
}

// Fixed clock, company.test.ts's argument: a suite that passes before 9pm and
// fails after it is the worst kind of flake.
const AFTERNOON = new Date(2026, 5, 15, 14, 0, 0).getTime();
const LATE = new Date(2026, 5, 15, 22, 0, 0).getTime();

/** Walk the sim until the hider stands on their spot. */
function letThemHide(w: WorldState, v: Villager): { x: number; y: number } {
  const spot = playing(w)!.spot!;
  for (let i = 0; i < 60 * 60 && Math.hypot(spot.x - v.x, spot.y - v.y) > 0.05; i++) {
    tick(w, 1 / 60, AFTERNOON);
  }
  expect(Math.hypot(spot.x - v.x, spot.y - v.y)).toBeLessThanOrEqual(0.05);
  return spot;
}

describe("what reads as hidden", () => {
  it("a tile with a tree in the row south is hidden; open ground is not", () => {
    const w = freshWorld();
    setTile(w, 3, 4, TREE);
    setTile(w, 3, 3, GRASS);
    expect(hiddenTile(w, 3, 3)).toBe(true);
    setTile(w, 8, 4, GRASS);
    setTile(w, 8, 3, GRASS);
    expect(hiddenTile(w, 8, 3)).toBe(false);
  });

  // Rocks sit under the eyeline and the renderer never fades for them
  // (§ROCK_SHAPES). A hider behind a boulder is a hider in plain sight, and
  // this is the assertion that keeps the sim from claiming otherwise.
  it("a rock hides nobody", () => {
    const w = freshWorld();
    setTile(w, 3, 4, ROCK);
    setTile(w, 3, 3, GRASS);
    expect(hiddenTile(w, 3, 3)).toBe(false);
  });
});

describe("the spot", () => {
  it("is walkable, pathable, away from the player, and clear of secrets", () => {
    const w = freshWorld();
    const v = withCompany(w);
    expect(startPlay(w, "resident1", "hide", AFTERNOON, makeRng(7))).toBe(true);
    const spot = playing(w)!.spot!;
    expect(isWalkable(w, spot.x, spot.y, "surface")).toBe(true);
    expect(Math.hypot(spot.x - w.player.x, spot.y - w.player.y)).toBeGreaterThan(FOUND_RADIUS);
    expect(nearSecret(w, spot.x, spot.y)).toBe(false);
    expect(findPath(w, { x: Math.round(v.x), y: Math.round(v.y) }, spot)).not.toBeNull();
  });

  // The fallback: a world can be short of cover and the game still starts.
  // hidingSpot never returns null on an ordinary world — refusal is reserved
  // for a genuinely sealed corner.
  it("always finds somewhere on a fresh world", () => {
    const w = freshWorld();
    const v = find(w, "resident1");
    for (let seed = 1; seed < 12; seed++) {
      expect(hidingSpot(w, { x: Math.round(v.x), y: Math.round(v.y) }, makeRng(seed))).not.toBeNull();
    }
  });
});

describe("who can play, and when", () => {
  it("refuses a stranger who was never invited", () => {
    const w = freshWorld();
    expect(startPlay(w, "resident1", "hide", AFTERNOON, makeRng(1))).toBe(false);
    expect(playing(w)).toBeNull();
  });

  it("refuses underground — a corridor is not a place to hide", () => {
    const w = freshWorld();
    withCompany(w);
    w.player.layer = "under";
    expect(startPlay(w, "resident1", "hide", AFTERNOON, makeRng(1))).toBe(false);
  });

  it("refuses a second game while one is running", () => {
    const w = freshWorld();
    withCompany(w);
    expect(startPlay(w, "resident1", "hide", AFTERNOON, makeRng(1))).toBe(true);
    expect(startPlay(w, "resident1", "hide", AFTERNOON, makeRng(2))).toBe(false);
  });
});

describe("hiding and being found", () => {
  it("they walk to the spot, stand there, and do not drift back", () => {
    const w = freshWorld();
    const v = withCompany(w);
    startPlay(w, "resident1", "hide", AFTERNOON, makeRng(7));
    const spot = letThemHide(w, v);
    // Arrived: the follow override says stand still, even with the player far.
    expect(isHiding(w, v)).toBe(true);
    expect(followTarget(w, v)).toBeNull();
    for (let i = 0; i < 120; i++) tick(w, 1 / 60, AFTERNOON);
    expect(Math.hypot(spot.x - v.x, spot.y - v.y)).toBeLessThanOrEqual(0.05);
  });

  it("proximity finds them — once, on exactly one villager", () => {
    const w = freshWorld();
    const v = withCompany(w);
    startPlay(w, "resident1", "hide", AFTERNOON, makeRng(7));
    const spot = letThemHide(w, v);
    // Standing across town finds nobody.
    expect(foundThem(w, AFTERNOON)).toBeNull();
    w.player.x = spot.x + 1;
    w.player.y = spot.y;
    expect(foundThem(w, AFTERNOON)?.id).toBe("resident1");
    // The attend() shape: the frame that found them is the only frame that says so.
    expect(foundThem(w, AFTERNOON)).toBeNull();
    expect(playing(w)).toBeNull();
    expect(hasMemory(v.memory, "hid")).toBe(true);
    for (const other of w.villagers) {
      if (other.id !== "resident1") expect(hasMemory(other.memory, "hid")).toBe(false);
    }
    // The game ended; the walk didn't.
    expect(companion(w)?.id).toBe("resident1");
  });

  it("a second game the same day is played, not filed twice", () => {
    const w = freshWorld();
    const v = withCompany(w);
    for (let round = 0; round < 2; round++) {
      startPlay(w, "resident1", "hide", AFTERNOON, makeRng(7 + round));
      const spot = letThemHide(w, v);
      w.player.x = spot.x + 1;
      w.player.y = spot.y;
      expect(foundThem(w, AFTERNOON)?.id).toBe("resident1");
      w.player.x = spot.x + 20; // wander off before the next round
    }
    expect(v.memory.filter((m) => m.kind === "hid")).toHaveLength(1);
  });
});

describe("what ending writes — nothing, unless you found them", () => {
  it("giving up writes no memory, costs no friendship, keeps the company", () => {
    const w = freshWorld();
    const v = withCompany(w);
    const warmth = v.friendship;
    startPlay(w, "resident1", "hide", AFTERNOON, makeRng(7));
    endPlay(w, AFTERNOON, "gave_up");
    expect(playing(w)).toBeNull();
    expect(hasMemory(v.memory, "hid")).toBe(false);
    expect(v.friendship).toBe(warmth);
    expect(companion(w)?.id).toBe("resident1");
  });

  it("a goodbye ends the game silently", () => {
    const w = freshWorld();
    const v = withCompany(w);
    startPlay(w, "resident1", "hide", AFTERNOON, makeRng(7));
    partWays(w, AFTERNOON);
    expect(playing(w)).toBeNull();
    expect(hasMemory(v.memory, "hid")).toBe(false);
  });

  it("their day ending ends the game too", () => {
    const w = freshWorld();
    withCompany(w);
    startPlay(w, "resident1", "hide", AFTERNOON, makeRng(7));
    expect(updateCompany(w, LATE)?.id).toBe("resident1");
    expect(playing(w)).toBeNull();
  });
});
