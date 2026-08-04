// Sitting together. The feature is a derived predicate and a named bench
// cell, so the tests are about derivation staying honest: moving is standing
// up, demolition un-sits with no stale state, and the companion genuinely
// ends up close enough for the Moments sweep to count them.

import { describe, it, expect } from "vitest";
import { newWorld, tick } from "./game";
import { invite } from "./company";
import { sittingAt, seatBeside } from "./play";
import { befriend } from "./friendship";
import { TOWN_FIXTURES } from "../content/town";
import { placeFurniture, removeFurnitureAt } from "./furniture";
import type { WorldState, Villager } from "./types";
import type { CharId } from "../content/cast";

function freshWorld(): WorldState {
  return newWorld({ name: "Me", form: "dog", spot: "forest", seed: 21 });
}

function find(w: WorldState, id: CharId): Villager {
  return w.villagers.find((x) => x.id === id)!;
}

const AFTERNOON = new Date(2026, 5, 15, 14, 0, 0).getTime();

/** The town's own bench — the fixture this step added. */
const BENCH = TOWN_FIXTURES.find((f) => f.id === "bench")!;

/** How close somebody has to be for a Moment to count them (sim/moments.ts
 *  BESIDE_YOU). Re-derived here so the "sitting makes Moments reachable"
 *  claim is asserted, not assumed. */
const BESIDE_YOU = 4;

describe("sitting is derived, never stored", () => {
  it("true on the town bench, false the instant you have somewhere to be", () => {
    const w = freshWorld();
    w.player.x = BENCH.x;
    w.player.y = BENCH.y;
    w.player.target = null;
    expect(sittingAt(w)?.cell.id).toBe("bench");
    w.player.target = { x: BENCH.x + 5, y: BENCH.y };
    expect(sittingAt(w)).toBeNull();
  });

  it("the town ships exactly one bench, standing in the plaza", () => {
    const w = freshWorld();
    expect(w.furniture[`${BENCH.x},${BENCH.y}`]?.id).toBe("bench");
  });

  it("a demolished bench un-sits you with no stale state", () => {
    const w = freshWorld();
    // A bench of your own, away from town, so removing it is legal.
    expect(placeFurniture(w, 40, 40, "bench", "s", "pine")).toBe(true);
    w.player.x = 40;
    w.player.y = 40;
    w.player.target = null;
    expect(sittingAt(w)?.cell.id).toBe("bench");
    removeFurnitureAt(w, 40, 40);
    expect(sittingAt(w)).toBeNull();
  });
});

describe("the second half of the bench", () => {
  it("a companion is aimed at it, sits, and stays within a Moment's reach", () => {
    const w = freshWorld();
    const v = find(w, "resident1");
    befriend(v, 20);
    expect(invite(w, "resident1", AFTERNOON)).toBe(true);
    w.player.x = BENCH.x;
    w.player.y = BENCH.y;
    w.player.target = null;
    const seat = seatBeside(w, v);
    expect(seat).not.toBeNull();
    expect(seat).not.toEqual({ x: BENCH.x, y: BENCH.y }); // not the half you're on
    for (let i = 0; i < 60 * 30; i++) tick(w, 1 / 60, AFTERNOON);
    expect(Math.hypot(v.x - seat!.x, v.y - seat!.y)).toBeLessThanOrEqual(0.05);
    expect(Math.hypot(v.x - w.player.x, v.y - w.player.y)).toBeLessThanOrEqual(BESIDE_YOU);
  });

  it("names no cell for a stool — beside is already with you", () => {
    const w = freshWorld();
    const v = find(w, "resident1");
    befriend(v, 20);
    invite(w, "resident1", AFTERNOON);
    expect(placeFurniture(w, 40, 40, "stool", "s", "pine")).toBe(true);
    w.player.x = 40;
    w.player.y = 40;
    w.player.target = null;
    expect(sittingAt(w)?.cell.id).toBe("stool");
    expect(seatBeside(w, v)).toBeNull();
  });
});
