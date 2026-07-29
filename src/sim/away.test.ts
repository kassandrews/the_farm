import { describe, it, expect } from "vitest";
import { newWorld, summarizeAway, contextAction, buildAt } from "./game";
import { simulateAway } from "./away";
import { makeRng } from "./rng";
import { tileKey } from "./world";
import { PLANK, MUSHROOM } from "../content/tiles";
import { hasMemory, recall } from "./memory";
import { donate } from "./museum";
import { exhibitDef } from "../content/museum";
import { FESTIVALS } from "../content/festivals";
import { CROPS, type CropId } from "../content/crops";
import { plant } from "./crops";

const HOUR = 3_600_000;

/** A plot of `id`, already ripe, so summarizeAway sees it cross the line. */
function ripe(w: ReturnType<typeof newWorld>, x: number, y: number, id: CropId, now: number) {
  plant(w, x, y, id, now);
  const c = w.crops[tileKey(x, y)];
  c.stage = CROPS[id].stages.length - 2; // one boundary short of ripe
  c.growthMs = 0;
  // Wide enough for the SLOWEST final stage in the table (wheat's 18h), not
  // just the fast ones — at 10h this silently failed to ripen a pumpkin and the
  // test read as a bug in the postcard.
  c.lastUpdate = now - 60 * HOUR;
  c.wateredUntil = now + HOUR;
}

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

  it("calls a ripened radish a radish", () => {
    // It used to say `${n} carrot${s}` whatever came up, so a save with three
    // ripe kale reported three carrots. Wrong since the seed stall shipped a
    // second variety in Phase 3g.
    const w = worldWithBoards(0);
    const now = new Date(2026, 6, 15, 12).getTime(); // July: nobody's month but the tomato's
    w.lastSaved = now - 5 * HOUR;
    ripe(w, 4, 4, "radish", now);
    const lines = summarizeAway(w, now, makeRng(2));
    expect(lines.join(" ")).toContain("radish");
    expect(lines.join(" ")).not.toContain("carrot");
  });

  it("names the biggest group rather than listing everything", () => {
    const w = worldWithBoards(0);
    const now = new Date(2026, 6, 15, 12).getTime();
    w.lastSaved = now - 5 * HOUR;
    ripe(w, 4, 4, "radish", now);
    ripe(w, 5, 4, "radish", now);
    ripe(w, 6, 4, "potato", now);
    const text = summarizeAway(w, now, makeRng(2)).join(" ");
    expect(text).toContain("2 radishes");
    expect(text).not.toContain("potato");
  });

  it("falls back to the plain word when two varieties tie", () => {
    // Picking a winner between equal groups would be inventing a fact.
    const w = worldWithBoards(0);
    const now = new Date(2026, 6, 15, 12).getTime();
    w.lastSaved = now - 5 * HOUR;
    ripe(w, 4, 4, "radish", now);
    ripe(w, 5, 4, "potato", now);
    const text = summarizeAway(w, now, makeRng(2)).join(" ");
    expect(text).toContain("2 crops");
  });

  it("adds the season's note only when the in-season variety is what ripened", () => {
    const october = new Date(2026, 9, 15, 12).getTime();
    const w = worldWithBoards(0);
    w.lastSaved = october - 5 * HOUR;
    ripe(w, 4, 4, "pumpkin", october);
    expect(summarizeAway(w, october, makeRng(2)).join(" ")).toContain("own month");

    // …and not for a variety whose month it isn't.
    const w2 = worldWithBoards(0);
    w2.lastSaved = october - 5 * HOUR;
    ripe(w2, 4, 4, "radish", october);
    expect(summarizeAway(w2, october, makeRng(2)).join(" ")).not.toContain("own month");
  });

  it("says nothing about the season when nothing ripened", () => {
    // The guard on the away rule: a season changes nothing, so it may never
    // produce a sentence of its own (sim/away.ts §the slideshow).
    const october = new Date(2026, 9, 15, 12).getTime();
    const w = worldWithBoards(0);
    w.lastSaved = october - 5 * HOUR;
    const text = summarizeAway(w, october, makeRng(2)).join(" ");
    expect(text).not.toContain("own month");
    expect(text).not.toContain("autumn");
  });
});


describe("a festival you missed", () => {
  const MARCH = FESTIVALS.find((f) => f.id === "the-airing")!;
  /** Just after that year's Airing finished. */
  const AFTER = new Date(2026, MARCH.month - 1, MARCH.day, 22, 0, 0).getTime();

  function town() {
    return newWorld({ name: "Me", form: "dog", spot: "hilltop", seed: 11 });
  }

  it("is news when the window covered it, and nothing when it didn't", () => {
    const w = town();
    const lines = simulateAway(w, 3 * 24 * HOUR, AFTER, makeRng(3));
    expect(lines.some((l) => l.includes(MARCH.name))).toBe(true);

    // A week that contains no festival produces no news from the stage.
    const quiet = town();
    const quietAt = new Date(2026, MARCH.month - 1, MARCH.day + 10, 12, 0, 0).getTime();
    const quietLines = simulateAway(quiet, 3 * 24 * HOUR, quietAt, makeRng(3));
    expect(quietLines.some((l) => l.includes(MARCH.name))).toBe(false);
  });

  it("is remembered by the town and NOT by the player", () => {
    // The whole shape of the beat: it happened, they were there, you weren't.
    // A player memory here would be the game telling you that you attended
    // something you missed.
    const w = town();
    simulateAway(w, 3 * 24 * HOUR, AFTER, makeRng(3));
    expect(w.villagers.some((v) => hasMemory(v.memory, "festival"))).toBe(true);
    expect(hasMemory(w.player.memory, "festival")).toBe(false);
  });

  it("costs nothing — no friendship moves for a party you weren't at", () => {
    const w = town();
    const before = w.villagers.map((v) => v.friendship);
    simulateAway(w, 3 * 24 * HOUR, AFTER, makeRng(3));
    expect(w.villagers.map((v) => v.friendship)).toEqual(before);
  });

  it("leaves the institutions out of it, except the Blob who ran it", () => {
    const w = town();
    simulateAway(w, 3 * 24 * HOUR, AFTER, makeRng(3));
    const shop = w.villagers.find((v) => v.id === "shop")!;
    const blob = w.villagers.find((v) => v.id === "stage")!;
    expect(hasMemory(shop.memory, "festival")).toBe(false);
    expect(hasMemory(blob.memory, "festival")).toBe(true);
  });
});
