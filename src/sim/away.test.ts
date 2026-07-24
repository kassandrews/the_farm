import { describe, it, expect } from "vitest";
import { newWorld, summarizeAway, contextAction } from "./game";
import { simulateAway } from "./away";
import { makeRng } from "./rng";
import { tileKey } from "./world";
import { PLANK, MUSHROOM } from "../content/tiles";
import { hasMemory } from "./memory";

const HOUR = 3_600_000;

function worldWithBoards(count: number) {
  const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 11 });
  // Lay `count` boards by walking the player along a row.
  for (let i = 0; i < count; i++) {
    w.player.x = w.homestead.originX + i;
    w.player.y = w.homestead.originY + 3;
    contextAction(w, "plank", 1000);
  }
  return w;
}

function countTiles(w: ReturnType<typeof newWorld>, id: number): number {
  return Object.values(w.overrides).filter((t) => t === id).length;
}

describe("away simulation", () => {
  it("produces no events for a short absence", () => {
    const w = worldWithBoards(3);
    expect(simulateAway(w, 30 * 60 * 1000, Date.now(), makeRng(1))).toEqual([]);
  });

  it("produces news for a long absence", () => {
    const w = worldWithBoards(3);
    const lines = simulateAway(w, 48 * HOUR, Date.now(), makeRng(3));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it("NEVER destroys the player's work — the Gremlin moves a board, never eats it", () => {
    // Run many absences with different seeds; the board count must hold.
    for (let seed = 0; seed < 40; seed++) {
      const w = worldWithBoards(4);
      expect(countTiles(w, PLANK)).toBe(4);
      simulateAway(w, 72 * HOUR, Date.now(), makeRng(seed));
      expect(countTiles(w, PLANK)).toBe(4);
    }
  });

  it("never disturbs a planted crop", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 5 });
    contextAction(w, "plant", 1000);
    const key = tileKey(Math.round(w.player.x), Math.round(w.player.y));
    for (let seed = 0; seed < 25; seed++) {
      simulateAway(w, 72 * HOUR, Date.now(), makeRng(seed));
      expect(w.crops[key]).toBeDefined();
    }
  });

  it("mushrooms actually appear in the world, and are capped", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "forest", seed: 9 });
    // Many long absences: mushrooms accumulate but never run away with the map.
    for (let i = 0; i < 30; i++) simulateAway(w, 72 * HOUR, Date.now(), makeRng(i));
    const shrooms = countTiles(w, MUSHROOM);
    expect(shrooms).toBeGreaterThan(0);
    expect(shrooms).toBeLessThanOrEqual(10);
  });

  it("the Scholar's exhibit becomes a memory it can talk about later", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 4 });
    const scholar = w.villagers.find((v) => v.form === "scholar")!;
    expect(hasMemory(scholar.memory, "exhibit")).toBe(false);
    // Run absences until the shuffled pool picks the exhibit event.
    for (let i = 0; i < 20 && !hasMemory(scholar.memory, "exhibit"); i++) {
      simulateAway(w, 72 * HOUR, Date.now(), makeRng(i));
    }
    expect(hasMemory(scholar.memory, "exhibit")).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    const a = worldWithBoards(3);
    const b = worldWithBoards(3);
    const now = 1_700_000_000_000;
    expect(simulateAway(a, 72 * HOUR, now, makeRng(7))).toEqual(
      simulateAway(b, 72 * HOUR, now, makeRng(7)),
    );
  });
});

describe("the postcard", () => {
  it("stays silent when you were barely gone", () => {
    const w = worldWithBoards(2);
    w.lastSaved = Date.now() - 60_000;
    expect(summarizeAway(w, Date.now(), makeRng(1))).toEqual([]);
  });

  it("leads with how long you were away", () => {
    const w = worldWithBoards(2);
    const now = Date.now();
    w.lastSaved = now - 5 * HOUR;
    const lines = summarizeAway(w, now, makeRng(2));
    expect(lines[0]).toContain("5 hours");
  });
});
