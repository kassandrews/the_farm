import { describe, it, expect } from "vitest";
import { newWorld, summarizeAway, contextAction, buildAt } from "./game";
import { simulateAway } from "./away";
import { makeRng } from "./rng";
import { tileKey } from "./world";
import { PLANK, MUSHROOM } from "../content/tiles";
import { hasMemory, recall } from "./memory";
import { donate } from "./museum";
import { exhibitDef } from "../content/museum";

const HOUR = 3_600_000;

function worldWithBoards(count: number) {
  const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 11 });
  // Lay `count` boards by walking the player along a row.
  for (let i = 0; i < count; i++) {
    w.player.x = w.homestead.originX + i;
    w.player.y = w.homestead.originY + 3;
    buildAt(w, "plank", w.player.x, w.player.y, 1000);
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
    //
    // Counted as a DELTA rather than against a literal, because the town's own
    // buildings are floored in plank too (src/content/town.ts) and the absolute
    // number is now an implementation detail of the town layout. The invariant
    // was never "there are four boards" — it's "nothing goes missing" — and this
    // way the town's floors are covered by it as well.
    for (let seed = 0; seed < 40; seed++) {
      const w = worldWithBoards(4);
      const before = countTiles(w, PLANK);
      simulateAway(w, 72 * HOUR, Date.now(), makeRng(seed));
      expect(countTiles(w, PLANK)).toBe(before);
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

  it("the curator revises a donated exhibit, and remembers doing it", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 4 });
    // Give her something to be wrong about, twice over.
    w.inventory.wood = 5;
    donate(w, exhibitDef("timber"));
    const curator = w.villagers.find((v) => v.id === "museum")!;
    expect(hasMemory(curator.memory, "exhibit")).toBe(false);

    // Run absences until the shuffled pool picks the remount event.
    for (let i = 0; i < 20 && !hasMemory(curator.memory, "exhibit"); i++) {
      simulateAway(w, 72 * HOUR, Date.now(), makeRng(i));
    }
    expect(hasMemory(curator.memory, "exhibit")).toBe(true);
    // The card under the exhibit actually moved on — the memory is a record of
    // a change to the world, not a line about one.
    expect(w.museum.donated[0].placard).toBeGreaterThan(0);
    // The TITLE, so a scholar's dialogue line reads as a real thing on a case.
    expect(recall(curator.memory, "exhibit")?.value).toBe(exhibitDef("timber").title);
  });

  it("says nothing about the museum when nothing has been donated", () => {
    const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 4 });
    const curator = w.villagers.find((v) => v.id === "museum")!;
    for (let i = 0; i < 20; i++) {
      const lines = simulateAway(w, 72 * HOUR, Date.now(), makeRng(i));
      expect(lines.some((l) => l.includes("Corrigal"))).toBe(false);
    }
    // An empty museum has no card to revise, so she is skipped entirely rather
    // than announcing an exhibit standing on no plinth anywhere.
    expect(hasMemory(curator.memory, "exhibit")).toBe(false);
  });

  it("finds the curator by id, never by form", () => {
    // Margfrom is also a scholar, and in a save old enough to predate Corrigal
    // she comes FIRST in the list. A form-based lookup landed on whichever one
    // happened to be earlier, so the same event hit different people depending
    // on how old the town was.
    const w = newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 4 });
    w.inventory.wood = 5;
    donate(w, exhibitDef("timber"));
    const resident = w.villagers.find((v) => v.id === "resident1")!;
    const curator = w.villagers.find((v) => v.id === "museum")!;
    expect(resident.form).toBe("scholar");
    expect(curator.form).toBe("scholar");

    for (let i = 0; i < 20 && !hasMemory(curator.memory, "exhibit"); i++) {
      simulateAway(w, 72 * HOUR, Date.now(), makeRng(i));
    }
    expect(hasMemory(curator.memory, "exhibit")).toBe(true);
    expect(hasMemory(resident.memory, "exhibit")).toBe(false);
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
