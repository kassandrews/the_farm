// I Spy — the negatives carry the design (museum.test.ts's precedent): no
// guess entry point, no bearing, no secret ever named, and finding it is
// proximity and nothing else.

import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { invite } from "./company";
import * as play from "./play";
import { startPlay, playing, foundIt, spyKindAt, spyChoices, nearSecret, SPY_REACH } from "./play";
import { befriend } from "./friendship";
import { setTile, groveCentre, cubeSite } from "./world";
import { TREE, ROCK, WATER, STONE, GRASS, DARK_TREE } from "../content/tiles";
import { hasMemory } from "./memory";
import { makeRng } from "./rng";
import type { WorldState, Villager } from "./types";
import type { CharId } from "../content/cast";

function freshWorld(): WorldState {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 21 });
}

function withCompany(w: WorldState, id: CharId = "resident1"): Villager {
  const v = w.villagers.find((x) => x.id === id)!;
  befriend(v, 20);
  if (!invite(w, id, AFTERNOON)) throw new Error("invite refused");
  return v;
}

const AFTERNOON = new Date(2026, 5, 15, 14, 0, 0).getTime();

describe("what may be spied", () => {
  it("reads the world: a tree, a rock, paving; never plain grass", () => {
    const w = freshWorld();
    // Away from town and secrets, on cells we control.
    setTile(w, 40, 40, TREE);
    setTile(w, 41, 40, ROCK);
    setTile(w, 42, 40, STONE);
    setTile(w, 43, 40, GRASS);
    expect(spyKindAt(w, 40, 40)).toBe("tree");
    expect(spyKindAt(w, 41, 40)).toBe("rock");
    expect(spyKindAt(w, 42, 40)).toBe("ground");
    expect(spyKindAt(w, 43, 40)).toBeNull();
  });

  it("water counts only at its edge", () => {
    const w = freshWorld();
    setTile(w, 50, 40, WATER);
    setTile(w, 51, 40, GRASS); // a bank to stand on
    expect(spyKindAt(w, 50, 40)).toBe("water");
    // Sealed in water on all sides: not a clue anybody can walk to.
    for (const [x, y] of [[60, 40], [59, 40], [61, 40], [60, 39], [60, 41]]) setTile(w, x, y, WATER);
    expect(spyKindAt(w, 60, 40)).toBeNull();
  });

  // The exclusion the whole feature hangs on: a clue pointing at a secret is
  // the game leading the player there by the hand. Asserted directly against
  // the two secret sites, not against the margin constant.
  it("never targets the grove or the Cube, even when a spy-able thing stands there", () => {
    const w = freshWorld();
    const grove = groveCentre(w.seed, w.homestead.spot);
    const cube = cubeSite(w.seed, w.homestead.spot);
    expect(nearSecret(w, grove.x, grove.y)).toBe(true);
    expect(nearSecret(w, cube.x, cube.y)).toBe(true);
    setTile(w, grove.x, grove.y + 2, ROCK);
    setTile(w, cube.x + 1, cube.y, ROCK);
    expect(spyKindAt(w, grove.x, grove.y + 2)).toBeNull();
    expect(spyKindAt(w, cube.x + 1, cube.y)).toBeNull();
    // And a dark tree is never clue material even where the margin misses.
    setTile(w, 80, 80, DARK_TREE);
    expect(spyKindAt(w, 80, 80)).toBeNull();
  });

  it("offers only kinds the speaker has a line for", () => {
    const w = freshWorld();
    const v = withCompany(w);
    for (const c of spyChoices(w, v)) {
      expect(spyKindAt(w, c.x, c.y)).toBe(c.kind);
    }
  });
});

describe("playing it", () => {
  it("names a thing, keeps its words, and proximity ends it — on the one villager", () => {
    const w = freshWorld();
    const v = withCompany(w);
    expect(startPlay(w, "resident1", "spy", AFTERNOON, makeRng(3))).toBe(true);
    const target = playing(w)!.target!;
    expect(target.clue.length).toBeGreaterThan(0);
    // Re-asking returns the identical clue: it is STORED, not rerolled.
    expect(playing(w)!.target!.clue).toBe(target.clue);
    // Across town: nothing.
    w.player.x = target.x + 30;
    w.player.y = target.y;
    expect(foundIt(w, AFTERNOON)).toBeNull();
    // Standing at the thing: found, once.
    w.player.x = target.x + 1;
    w.player.y = target.y;
    expect(foundIt(w, AFTERNOON)?.id).toBe("resident1");
    expect(foundIt(w, AFTERNOON)).toBeNull();
    expect(hasMemory(v.memory, "spied")).toBe(true);
    for (const other of w.villagers) {
      if (other.id !== "resident1") expect(hasMemory(other.memory, "spied")).toBe(false);
    }
  });

  it("the target is within reach of a walk — never further than the pick radius", () => {
    const w = freshWorld();
    const v = withCompany(w);
    startPlay(w, "resident1", "spy", AFTERNOON, makeRng(3));
    const t = playing(w)!.target!;
    const cx = (w.player.x + v.x) / 2;
    const cy = (w.player.y + v.y) / 2;
    expect(Math.hypot(t.x - cx, t.y - cy)).toBeLessThanOrEqual(8 + SPY_REACH);
  });

  // The negative that keeps the game a game rather than a quiz: there is no
  // way to ANSWER. No exported symbol takes a guess, so a wrong guess cannot
  // exist, so neither can a fail state.
  it("has no guess entry point at all", () => {
    for (const name of Object.keys(play)) {
      expect(name.toLowerCase(), `exported symbol ${name}`).not.toMatch(/guess|answer|confirm/);
    }
  });
});
