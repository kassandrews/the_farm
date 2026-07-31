import { describe, it, expect } from "vitest";
import { newWorld } from "./game";
import { setTile, tileKey } from "./world";
import { GRASS } from "../content/tiles";
import { placeStructure, removeStructure } from "./structures";
import { placeFurniture } from "./furniture";
import { assign } from "./assign";
import {
  arrivalDue,
  admitArrival,
  openCommission,
  commissionState,
  stampCommission,
  fileCommission,
  arrivalOf,
  MIN_INTERIOR,
} from "./commission";
import { ARRIVALS } from "../content/arrivals";
import { stopTarget } from "./housing";
import type { WorldState } from "./types";

/** A fixed clock. `assign` stamps a sleeper spell into the place log, and a
 *  test that passed Date.now() would write a different season depending on the
 *  month it ran in (ROADMAP §"Two clocks for one fact"). */
const NOW = Date.UTC(2026, 6, 1, 12);

function town() {
  const w = newWorld({ name: "Test", form: "blob", spot: "forest", seed: 42 });
  w.flags.onboarded = true;
  return w;
}

const HOUR = 60 * 60 * 1000;

/** A house big enough to satisfy a commission, with a bed in it. Returns the
 *  bed's anchor. */
function buildHouse(w: WorldState, x0: number, y0: number, wide = 5, tall = 4) {
  for (let y = y0 - 1; y <= y0 + tall; y++) {
    for (let x = x0 - 1; x <= x0 + wide; x++) setTile(w, x, y, GRASS);
  }
  for (let y = 0; y < tall; y++) {
    for (let x = 0; x < wide; x++) {
      const edge = x === 0 || y === 0 || x === wide - 1 || y === tall - 1;
      if (edge) placeStructure(w, x0 + x, y0 + y, "wall", "pine");
    }
  }
  placeStructure(w, x0 + 1, y0 + tall - 1, "door", "pine");
  placeFurniture(w, x0 + 1, y0 + 1, "bed", "s", "pine");
  return { x: x0 + 1, y: y0 + 1 };
}

describe("arrivals", () => {
  it("waits for the town to be settled before anyone moves in", () => {
    const w = town();
    w.flags.onboarded = false;
    expect(arrivalDue(w, w.createdAt + 10 * HOUR)).toBe(false);
  });

  it("nobody turns up on the first minute", () => {
    const w = town();
    expect(arrivalDue(w, w.createdAt + 1000)).toBe(false);
  });

  it("someone is due once the town has had a moment", () => {
    const w = town();
    expect(arrivalDue(w, w.createdAt + HOUR)).toBe(true);
  });

  it("admits exactly one neighbour however long you were away", () => {
    const w = town();
    const before = w.villagers.length;
    // Two days later, in one go — the case the whole clock-derived design
    // exists for. Coming back to forty-eight new neighbours would be the bug.
    admitArrival(w, w.createdAt + 48 * HOUR);
    expect(arrivalDue(w, w.createdAt + 48 * HOUR)).toBe(false);
    expect(w.villagers.length).toBe(before + 1);
  });

  it("holds the queue while someone is still in a tent", () => {
    const w = town();
    admitArrival(w, w.createdAt + HOUR);
    // A month on, and still only the one. Two people asking at once turns a
    // gift into a queue, which is the part that would feel like work.
    expect(arrivalDue(w, w.createdAt + 30 * 24 * HOUR)).toBe(false);
  });

  it("runs out rather than looping", () => {
    const w = town();
    let t = w.createdAt + HOUR;
    for (let i = 0; i < ARRIVALS.length; i++) {
      const c = admitArrival(w, t)!;
      expect(c).not.toBeNull();
      c.stampedAt = t; // pretend it was satisfied, to open the queue again
      t += 24 * HOUR;
    }
    expect(admitArrival(w, t)).toBeNull();
    expect(arrivalDue(w, t)).toBe(false);
  });

  it("pitches the tent somewhere nobody is standing on anything", () => {
    const w = town();
    const c = admitArrival(w, w.createdAt + HOUR)!;
    const key = tileKey(c.tent.x, c.tent.y);
    expect(w.build[key]).toBeUndefined();
    expect(w.furniture[key]).toBeUndefined();
    expect(w.crops[key]).toBeUndefined();
  });

  it("camps by its tent rather than standing in the square", () => {
    const w = town();
    const c = admitArrival(w, w.createdAt + HOUR)!;
    const v = w.villagers.find((k) => k.id === c.id)!;
    // 2am: their routine says "home", and they haven't got one. Someone whose
    // bed was DEMOLISHED belongs in the plaza; someone still waiting on a house
    // has somewhere to be, and it's their tent.
    const twoAm = new Date(2026, 6, 25, 2, 0, 0).getTime();
    const stop = stopTarget(w, v, twoAm);
    expect(Math.abs(stop.x - c.tent.x) + Math.abs(stop.y - c.tent.y)).toBeLessThanOrEqual(1);
  });
});

describe("satisfying a commission", () => {
  it("is not satisfied by someone still in a tent", () => {
    const w = town();
    const c = admitArrival(w, w.createdAt + HOUR)!;
    expect(commissionState(w, c)).toEqual({ done: false, why: "no-home" });
  });

  it("gives the Office Creature's reason the assignment panel's words", () => {
    const w = town();
    const c = admitArrival(w, w.createdAt + HOUR)!;
    const bed = buildHouse(w, 40, 40);
    assign(w, c.id, bed.x, bed.y, NOW);
    expect(commissionState(w, c).done).toBe(true);

    // Then take a wall out from under it. This is the only way these verdicts
    // ever surface: assign(, NOW) won't hand someone a bed that doesn't qualify in
    // the first place, so a commission sees "no-room" when a FINISHED house
    // stops being one — which is the case worth reporting anyway. The words are
    // qualify()'s own, so the form and the panel can't disagree about what a
    // house is.
    removeStructure(w, 41, 40);
    expect(commissionState(w, c)).toEqual({ done: false, why: "no-room" });
  });

  it("holds out for a minimum size, and says the size", () => {
    const w = town();
    const c = admitArrival(w, w.createdAt + HOUR)!;
    // A 3x5 ring: a one-cell-wide interior, most of which is the bed. It
    // qualifies as housing — enclosed, a door, a bed — and is still not a house
    // you'd give someone. That gap is exactly why the minimum lives on the
    // COMMISSION and not in qualify().
    const bed = buildHouse(w, 40, 40, 3, 5);
    assign(w, c.id, bed.x, bed.y, NOW);
    const state = commissionState(w, c);
    expect(state.done).toBe(false);
    expect(state).toMatchObject({ why: "too-small" });
    if (!state.done && state.why === "too-small") expect(state.size).toBeLessThan(MIN_INTERIOR);
  });

  it("is satisfied by an ordinary house with nothing in it but a bed", () => {
    const w = town();
    const c = admitArrival(w, w.createdAt + HOUR)!;
    const bed = buildHouse(w, 40, 40);
    assign(w, c.id, bed.x, bed.y, NOW);
    // No finish, no furniture, no generosity of space. Taste is delight, never
    // a gate (DESIGN) — a plain box you made them is a house.
    expect(commissionState(w, c).done).toBe(true);
  });
});

describe("stamping", () => {
  function housed() {
    const w = town();
    const c = admitArrival(w, w.createdAt + HOUR)!;
    const bed = buildHouse(w, 40, 40);
    assign(w, c.id, bed.x, bed.y, NOW);
    return { w, c };
  }

  it("refuses to stamp a form that isn't satisfied", () => {
    const w = town();
    const c = admitArrival(w, w.createdAt + HOUR)!;
    expect(stampCommission(w, c, Date.now())).toBeNull();
    expect(c.stampedAt).toBeNull();
  });

  it("unlocks the finish that arrival was carrying", () => {
    const { w, c } = housed();
    const def = arrivalOf(c);
    expect(def.unlocks).toBe("whitewash"); // the first arrival teaches the beat
    expect(w.skins.unlocked).not.toContain("whitewash");
    expect(stampCommission(w, c, Date.now())).toBe("whitewash");
    expect(w.skins.unlocked).toContain("whitewash");
  });

  it("pays once, however many times it is asked", () => {
    const { w, c } = housed();
    stampCommission(w, c, Date.now());
    const count = w.skins.unlocked.filter((s) => s === "whitewash").length;
    expect(stampCommission(w, c, Date.now())).toBeNull();
    expect(w.skins.unlocked.filter((s) => s === "whitewash").length).toBe(count);
  });

  it("lets the resident remember the day they got a house", () => {
    const { w, c } = housed();
    stampCommission(w, c, Date.now());
    const v = w.villagers.find((k) => k.id === c.id)!;
    expect(v.memory.some((m) => m.kind === "housed")).toBe(true);
  });

  it("opens the queue again once it's closed", () => {
    const { w, c } = housed();
    expect(openCommission(w)).not.toBeNull();
    stampCommission(w, c, Date.now());
    expect(openCommission(w)).toBeNull();
  });

  it("filing is idempotent, which is funnier than it is important", () => {
    const w = town();
    const c = admitArrival(w, w.createdAt + HOUR)!;
    fileCommission(c, 1000);
    fileCommission(c, 2000);
    expect(c.filedAt).toBe(1000);
  });
});
