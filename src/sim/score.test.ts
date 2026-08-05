// The score's two facts: where you are, and what time it is.
//
// Nothing here can hear anything — these tests measure the numbers the engine
// is handed, which is the whole reason they live in sim. What they cannot catch
// is whether the result sounds good; that is what the browser is for.

import { describe, it, expect } from "vitest";
import {
  settledness,
  wildness,
  nightMusic,
  restSeconds,
  assembleSeconds,
  poolFor,
  choosePiece,
  SETTLED_CORE,
  SETTLED_REACH,
  PIECE_SECONDS,
  NO_REPEAT,
} from "./score";
import { newWorld } from "./game";
import { PLAZA, homesteadOrigin } from "./world";
import { PIECES, LAYERS, MODES, PATTERNS, zoneGain, arrivalGain } from "../content/music";

function world() {
  return newWorld({ name: "Tester", form: "dog", spot: "riverside", seed: 7 });
}

describe("settledness", () => {
  it("is 1 standing on the plaza", () => {
    const w = world();
    w.player.x = 0;
    w.player.y = 0;
    expect(settledness(w)).toBe(1);
  });

  it("is 1 anywhere on the paving, not just its middle", () => {
    const w = world();
    // The far corner of the rectangle is still town.
    w.player.x = PLAZA.x1;
    w.player.y = PLAZA.y0;
    expect(settledness(w)).toBe(1);
  });

  it("is 1 at the homestead however far out it sits", () => {
    const w = world();
    const home = homesteadOrigin(w.homestead.spot);
    w.player.x = home.x;
    w.player.y = home.y;
    expect(settledness(w)).toBe(1);
  });

  it("is 0 out past the reach of both anchors", () => {
    const w = world();
    w.player.x = 400;
    w.player.y = 400;
    expect(settledness(w)).toBe(0);
  });

  it("falls off monotonically as you walk away", () => {
    const w = world();
    let last = 1.01;
    for (let d = 0; d <= SETTLED_REACH + 10; d += 2) {
      w.player.x = PLAZA.x1 + d;
      w.player.y = 0;
      const s = settledness(w);
      expect(s).toBeLessThanOrEqual(last + 1e-9);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
      last = s;
    }
    expect(last).toBe(0);
  });

  it("holds a plateau across the core rather than peaking at a point", () => {
    const w = world();
    w.player.x = PLAZA.x1 + SETTLED_CORE - 1;
    w.player.y = 0;
    expect(settledness(w)).toBe(1);
  });

  it("is 0 underground, however far under the plaza you are", () => {
    const w = world();
    w.player.x = 0;
    w.player.y = 0;
    w.player.layer = "under";
    expect(settledness(w)).toBe(0);
  });

  it("wildness is its complement", () => {
    const w = world();
    w.player.x = PLAZA.x1 + 20;
    w.player.y = 0;
    expect(wildness(w)).toBeCloseTo(1 - settledness(w), 10);
  });
});

describe("the clock", () => {
  const at = (h: number) => new Date(2026, 6, 15, h, 0, 0).getTime();

  it("plays the day setlist at noon and the night one at two in the morning", () => {
    expect(nightMusic(at(12))).toBe(false);
    expect(nightMusic(at(2))).toBe(true);
  });

  it("rests longer after dark", () => {
    expect(restSeconds(true)).toBeGreaterThan(restSeconds(false));
  });

  it("keeps far more silence than music", () => {
    expect(restSeconds(false)).toBeGreaterThan(PIECE_SECONDS);
    expect(restSeconds(true)).toBeGreaterThan(PIECE_SECONDS);
  });
});

describe("assemble time", () => {
  it("is quicker in town than in the wild", () => {
    expect(assembleSeconds(1)).toBeLessThan(assembleSeconds(0));
  });

  it("clamps outside 0..1 rather than running away", () => {
    expect(assembleSeconds(-3)).toBe(assembleSeconds(0));
    expect(assembleSeconds(9)).toBe(assembleSeconds(1));
  });

  it("never reaches zero — nothing may snap on", () => {
    for (let s = 0; s <= 1; s += 0.1) expect(assembleSeconds(s)).toBeGreaterThan(5);
  });
});

describe("the setlist", () => {
  it("splits into a day pool and a night pool, both non-empty", () => {
    expect(poolFor(false).length).toBeGreaterThan(0);
    expect(poolFor(true).length).toBeGreaterThan(0);
  });

  it("never offers a day piece after dark", () => {
    for (const p of poolFor(true)) expect(p.at === "night" || p.at === "any").toBe(true);
    for (const p of poolFor(false)) expect(p.at === "day" || p.at === "any").toBe(true);
  });

  it("keeps the night pieces slower than every day piece", () => {
    const slowestDay = Math.min(...poolFor(false).map((p) => p.tempo));
    const fastestNight = Math.max(...poolFor(true).map((p) => p.tempo));
    expect(fastestNight).toBeLessThan(slowestDay);
  });

  it("has unique names — the no-repeat window keys on them", () => {
    expect(new Set(PIECES.map((p) => p.name)).size).toBe(PIECES.length);
  });

  it("only names modes and patterns that exist", () => {
    for (const p of PIECES) {
      expect(MODES[p.mode]).toBeDefined();
      expect(PATTERNS[p.drums]).toBeDefined();
    }
  });

  it("keeps every progression to four bars of real scale degrees", () => {
    for (const p of PIECES) {
      expect(p.prog).toHaveLength(4);
      for (const d of p.prog) {
        expect(Number.isInteger(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThan(7);
      }
    }
  });

  it("keeps swing inside the window that reads as human", () => {
    for (const p of PIECES) {
      expect(p.swing).toBeGreaterThan(0.5);
      expect(p.swing).toBeLessThan(0.7);
    }
  });
});

describe("choosePiece", () => {
  it("refuses to repeat what just played", () => {
    const pool = poolFor(false);
    for (let i = 0; i < pool.length; i++) {
      const roll = i / pool.length;
      expect(choosePiece(pool, ["Parish Office"], roll).name).not.toBe("Parish Office");
    }
  });

  it("avoids the whole recent window when the pool is big enough", () => {
    const pool = poolFor(false);
    const recent = pool.slice(0, NO_REPEAT).map((p) => p.name);
    for (let i = 0; i <= 10; i++) {
      const got = choosePiece(pool, recent, i / 11).name;
      expect(recent).not.toContain(got);
    }
  });

  it("settles for 'not the last one' when the pool is smaller than the window", () => {
    const pool = poolFor(true); // three pieces, window of three
    const recent = pool.map((p) => p.name);
    const got = choosePiece(pool, recent, 0.5);
    expect(got.name).not.toBe(recent[recent.length - 1]);
  });

  it("always returns something, even from a single-piece pool", () => {
    const one = [PIECES[0]];
    expect(choosePiece(one, [PIECES[0].name], 0.9)).toBe(PIECES[0]);
  });

  it("stays in range for rolls at and beyond the edges", () => {
    const pool = poolFor(false);
    for (const roll of [0, 0.999999, 1, 2, -1]) {
      expect(pool).toContain(choosePiece(pool, [], roll));
    }
  });

  it("spreads across the pool rather than favouring one row", () => {
    const pool = poolFor(false);
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add(choosePiece(pool, [], i / 60).name);
    expect(seen.size).toBe(pool.length);
  });
});

describe("the layer table", () => {
  it("drops the drums before you are half way out", () => {
    const drums = LAYERS.find((l) => l.id === "drums")!;
    expect(zoneGain(drums, 0)).toBe(1);
    expect(zoneGain(drums, 0.5)).toBe(0);
  });

  it("brings the pads up only once you have left", () => {
    const pads = LAYERS.find((l) => l.id === "pads")!;
    expect(zoneGain(pads, 0)).toBe(0);
    expect(zoneGain(pads, 1)).toBe(1);
  });

  it("never lets the Rhodes leave entirely", () => {
    const keys = LAYERS.find((l) => l.id === "keys")!;
    expect(zoneGain(keys, 1)).toBeGreaterThan(0);
  });

  it("keeps every layer's gain inside 0..1 all the way out", () => {
    for (const l of LAYERS) {
      for (let w = 0; w <= 1.001; w += 0.05) {
        const g = zoneGain(l, w);
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThanOrEqual(1);
      }
    }
  });

  it("leaves the whole band silent at the very start of an assemble", () => {
    for (const l of LAYERS) expect(arrivalGain(l, 0)).toBe(0);
  });

  it("has the whole band in by the end of one", () => {
    for (const l of LAYERS) expect(arrivalGain(l, 1)).toBe(1);
  });

  it("brings the drums in last, after everything else", () => {
    const drums = LAYERS.find((l) => l.id === "drums")!;
    for (const l of LAYERS) {
      if (l.id === "drums") continue;
      expect(l.arrive[1]).toBeLessThanOrEqual(drums.arrive[1]);
    }
    // And nothing else is still arriving when they land.
    for (const l of LAYERS) {
      if (l.id === "drums") continue;
      expect(arrivalGain(l, drums.arrive[0])).toBeGreaterThan(0);
    }
  });

  it("starts with something held, so nothing sounds like it switched on", () => {
    const early = LAYERS.filter((l) => l.arrive[0] === 0);
    expect(early.length).toBeGreaterThan(0);
    for (const l of early) expect(l.zone.woods).toBeGreaterThan(0);
  });
});
