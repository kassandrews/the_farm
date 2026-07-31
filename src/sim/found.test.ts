// The found places. What is under test is mostly what they must NOT do — the
// category's whole design is a set of refusals (DESIGN.md §Found places), and the
// refusals are the part a later change can quietly break.

import { describe, it, expect } from "vitest";
import { foundAt, generatedTile, homesteadOrigin, PLAZA } from "./world";
import { dayNumber } from "./found";
import { FOUND, FOUND_KINDS, LETTERS, letterFor } from "../content/found";
import { MAILBOX, POLE, STAIR, TILES, WATER } from "../content/tiles";
import type { HomesteadSpot } from "./types";

const SPOTS: HomesteadSpot[] = ["riverside", "forest", "lakeside", "coast"];

/** One town's seed, for the letter tests. The seed is IN the letter's key — two
 *  towns' nearest mailboxes must not hold the same line on the same day. */
const SEED = 4242;

describe("siting", () => {
  it("is a stable fact about a town, not a roll", () => {
    for (const spot of SPOTS) {
      for (let r = 90; r < 900; r += 37) {
        const a = foundAt(4242, spot, r, -r + 3);
        const b = foundAt(4242, spot, r, -r + 3);
        expect(a?.kind ?? null).toBe(b?.kind ?? null);
        expect(a?.index ?? null).toBe(b?.index ?? null);
      }
    }
  });

  it("lays out differently in different towns", () => {
    // Walks the mailbox's own ring, because the thing that has to differ per world
    // is the BEARING. A first draft scanned outward along +x and found six sites in
    // a hundred and twenty towns — which says nothing about the siting and
    // everything about the fact that a ray only meets a place aimed at it.
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      expect(foundAt(seed, "forest", 0, 0)).toBe(null); // never at the datum
      const ring = FOUND.mailbox.ring;
      for (let a = 0; a < 800; a++) {
        const th = (a / 800) * Math.PI * 2;
        const s = foundAt(seed, "forest", Math.round(Math.cos(th) * ring), Math.round(Math.sin(th) * ring));
        if (s?.kind === "mailbox") seen.add(`${s.x},${s.y}`);
      }
    }
    expect(seen.size).toBeGreaterThan(20);
  });

  it("keeps every kind clear of the town, on a thousand seeds", () => {
    // The nearest ring is 96 and the older landmarks live at 44, 58 and 72, so
    // nothing here can land on the town, the plaza, the homestead or an existing
    // secret. This asserts the consequence rather than the arithmetic.
    for (const spot of SPOTS) {
      const home = homesteadOrigin(spot);
      for (let seed = 1; seed <= 1000; seed++) {
        for (let dy = -6; dy <= 6; dy += 3) {
          for (let dx = -6; dx <= 6; dx += 3) {
            expect(foundAt(seed, spot, home.x + dx, home.y + dy)).toBe(null);
            expect(foundAt(seed, spot, PLAZA.x0 + dx, PLAZA.y0 + dy)).toBe(null);
          }
        }
      }
    }
  });

  it("keeps going outward instead of running out", () => {
    // The one place this departs from the grove and the cube. A category that
    // stops after the first lap has told you the world ends where its contents
    // do, on a map that does not end.
    for (const kind of FOUND_KINDS) {
      const def = FOUND[kind];
      for (const index of [0, 1, 5, 20]) {
        const ring = def.ring + index * def.spacing;
        const found = ringWalk(77, "forest", ring, kind);
        expect(found, `${kind} #${index} at ring ${ring}`).toBe(true);
      }
    }
  });

  /** Is there an instance of this kind somewhere on this ring? Walks the ring
   *  rather than assuming a bearing — `onLand` moves the bearing to dry ground,
   *  which is exactly the behaviour that must not lose a place.
   *
   *  THE SAMPLING IS ADAPTIVE, and a fixed 720 bearings is what it was first. That
   *  works near town and silently stops working out here: ring 4376 is 27,000 tiles
   *  around, so 720 samples land 38 tiles apart and step straight over a grove
   *  seven tiles wide. The test failed and the code was fine, which is the most
   *  expensive kind of red. */
  function ringWalk(seed: number, spot: HomesteadSpot, ring: number, kind: string): boolean {
    const step = Math.max(0.5, FOUND[kind as keyof typeof FOUND].radius);
    const n = Math.ceil((2 * Math.PI * ring) / step);
    for (let a = 0; a < n; a++) {
      const th = (a / n) * Math.PI * 2;
      const x = Math.round(Math.cos(th) * ring);
      const y = Math.round(Math.sin(th) * ring);
      if (foundAt(seed, spot, x, y)?.kind === kind) return true;
    }
    return false;
  }

  it("never sites one in the sea", () => {
    // The bug that cost an afternoon three times over (see `onLand`): a stand of
    // trees, an orchard, and now a mailbox, standing in open water where nobody
    // can ever reach it.
    for (const spot of SPOTS) {
      for (let seed = 1; seed <= 60; seed++) {
        for (const kind of FOUND_KINDS) {
          const def = FOUND[kind];
          for (let a = 0; a < 360; a += 3) {
            const th = (a / 360) * Math.PI * 2;
            const x = Math.round(Math.cos(th) * def.ring);
            const y = Math.round(Math.sin(th) * def.ring);
            const site = foundAt(seed, spot, x, y);
            if (site?.kind !== kind) continue;
            expect(generatedTile(seed, spot, site.x, site.y)).not.toBe(WATER);
          }
        }
      }
    }
  });
});

describe("what they give you, which is nothing", () => {
  it("puts down no tile that carries a material", () => {
    // The invariant with the most ways to break it later: a found place may hold a
    // mood, and the most it may EVER give is a finish (DESIGN §Found places). None
    // of its three props is diggable, tillable or gatherable, so there is nothing
    // out there to farm and nothing to come back for with a basket.
    for (const id of [POLE, MAILBOX, STAIR]) {
      const def = TILES[id];
      expect(def.diggable ?? false).toBe(false);
      expect(def.tillable ?? false).toBe(false);
      expect(def.solid).toBe(true);
    }
  });

  it("is never required by anything", () => {
    // Nothing in the game may depend on having found one, and the cheapest
    // structural version of that promise is that the props exist in no cost, no
    // recipe and no yield — they are terrain the world put down and nothing else
    // in the codebase knows their names.
    expect(TILES[MAILBOX].name).toBe("Mailbox");
    expect(TILES[STAIR].name).toBe("Steps");
    expect(TILES[POLE].name).toBe("Pole");
  });
});

describe("the letter", () => {
  it("is the same letter all day, and a different one tomorrow", () => {
    const day = dayNumber(Date.UTC(2026, 6, 31, 9));
    expect(letterFor(SEED, 3, day)).toBe(letterFor(SEED, 3, day));
    // Not "differs tomorrow" — sometimes tomorrow is also empty, which is fine.
    // What must be true is that the pair (box, day) is what decides.
    const week = new Set<string | null>();
    for (let i = 0; i < 14; i++) week.add(letterFor(SEED, 3, day + i));
    expect(week.size).toBeGreaterThan(1);
  });

  it("differs between TOWNS, not only between boxes", () => {
    // The bug this exists to keep out: without the seed in the key, "the nearest
    // mailbox" is one box shared by every save in the world.
    const day = dayNumber(Date.UTC(2026, 6, 31, 9));
    const towns = new Set<string | null>();
    for (let seed = 1; seed <= 40; seed++) towns.add(letterFor(seed, 0, day));
    expect(towns.size).toBeGreaterThan(1);
  });

  it("differs between boxes on the same day", () => {
    const day = dayNumber(Date.UTC(2026, 6, 31, 9));
    const boxes = new Set<string | null>();
    for (let i = 0; i < 30; i++) boxes.add(letterFor(SEED, i, day));
    expect(boxes.size).toBeGreaterThan(1);
  });

  it("is usually empty, because a box with post every day is a route", () => {
    let full = 0;
    let n = 0;
    for (let box = 0; box < 40; box++) {
      for (let day = 0; day < 200; day++) {
        if (letterFor(SEED, box, day) !== null) full++;
        n++;
      }
    }
    const rate = full / n;
    expect(rate).toBeGreaterThan(0.25);
    expect(rate).toBeLessThan(0.45);
  });

  it("uses the whole bank", () => {
    const seen = new Set<string>();
    for (let box = 0; box < 60; box++) {
      for (let day = 0; day < 300; day++) {
        const l = letterFor(SEED, box, day);
        if (l) seen.add(l);
      }
    }
    expect(seen.size).toBe(LETTERS.length);
  });

  it("never asks you for anything", () => {
    // A notice speaks only in the past tense (DESIGN §The errands board). A letter
    // that named a task would turn a mood into a quest board in a field, and the
    // whole category would become somewhere you are SENT.
    for (const line of LETTERS) {
      expect(line).not.toMatch(/\?/); // no questions
      expect(line.toLowerCase()).not.toMatch(/\b(please|could you|would you|bring|fetch|meet me|need you)\b/);
    }
  });
});
