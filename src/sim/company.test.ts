// Company — the third of DESIGN's three gaps. These tests are mostly NEGATIVES,
// which is the house habit for a system whose design is defined by what it
// refuses (see museum.test.ts and errands.ts's header): no party, no payout, no
// punishment for a goodbye, no leash.

import { describe, it, expect } from "vitest";
import { newWorld, tick, useShaft, contextAction } from "./game";
import { companion, canInvite, invite, partWays, updateCompany, dayOver, followTarget } from "./company";
import { befriend } from "./friendship";
import { sink, carve, setTile } from "./world";
import { SHAFT, CAVE_FLOOR } from "../content/tiles";
import { hasMemory } from "./memory";
import { charDef } from "../content/cast";
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

/** A wall-clock moment in the middle of an ordinary afternoon, so `dayOver`
 *  isn't answering "yes, they're in bed" on every assertion. Built from a fixed
 *  date rather than from Date.now(), because a suite that passes before 9pm and
 *  fails after it is the worst kind of flake. */
const AFTERNOON = new Date(2026, 5, 15, 14, 0, 0).getTime();
const LATE = new Date(2026, 5, 15, 22, 0, 0).getTime();

/** Warm somebody up to `familiar`, the invitation threshold. */
function warm(v: Villager): Villager {
  befriend(v, 20);
  return v;
}

describe("who will come", () => {
  it("won't come along until they know you", () => {
    const w = freshWorld();
    const her = find(w, "resident1");
    expect(canInvite(w, her, AFTERNOON)).toEqual({ ok: false, why: "stranger" });
    expect(invite(w, "resident1", AFTERNOON)).toBe(false);
    expect(w.company).toBeNull();
  });

  it("comes along once familiar", () => {
    const w = freshWorld();
    warm(find(w, "resident1"));
    expect(canInvite(w, find(w, "resident1"), AFTERNOON).ok).toBe(true);
    expect(invite(w, "resident1", AFTERNOON)).toBe(true);
    expect(companion(w)?.id).toBe("resident1");
  });

  // The six counters are places. A shop that follows you is a shop that's shut.
  it("refuses every counter, however friendly", () => {
    const w = freshWorld();
    for (const id of ["office", "shop", "heap", "museum", "seedstall", "stage"] as CharId[]) {
      warm(find(w, id));
      expect(canInvite(w, find(w, id), AFTERNOON)).toEqual({ ok: false, why: "rooted" });
    }
  });

  // ...except the Dog, whose institution is a round rather than a counter, and
  // who is DESIGN §Company's own example. This is the assertion that stops
  // somebody "tidying" the rule into `def.fixed`.
  it("lets the Dog Thing off the board", () => {
    const w = freshWorld();
    warm(find(w, "errands"));
    expect(canInvite(w, find(w, "errands"), AFTERNOON).ok).toBe(true);
  });

  it("keeps one companion, never a party", () => {
    const w = freshWorld();
    warm(find(w, "resident1"));
    warm(find(w, "errands"));
    invite(w, "resident1", AFTERNOON);
    expect(canInvite(w, find(w, "errands"), AFTERNOON)).toEqual({ ok: false, why: "busy" });
    expect(invite(w, "errands", AFTERNOON)).toBe(false);
    expect(companion(w)?.id).toBe("resident1");
  });

  it("won't drag somebody out of bed", () => {
    const w = freshWorld();
    warm(find(w, "resident1"));
    expect(canInvite(w, find(w, "resident1"), LATE)).toEqual({ ok: false, why: "abed" });
  });

  // One predicate, two uses: the same call that refuses the invitation is the
  // one that ends the company. If these ever disagreed you could re-invite
  // somebody one second after they said goodnight.
  it("uses the same day-is-over rule to refuse and to send home", () => {
    const w = freshWorld();
    const her = charDef(find(w, "resident1"));
    expect(dayOver(her, AFTERNOON)).toBe(false);
    expect(dayOver(her, LATE)).toBe(true);

    warm(find(w, "resident1"));
    invite(w, "resident1", AFTERNOON);
    expect(updateCompany(w, AFTERNOON)).toBeNull();
    expect(updateCompany(w, LATE)?.id).toBe("resident1");
    expect(w.company).toBeNull();
    expect(canInvite(w, find(w, "resident1"), LATE).ok).toBe(false);
  });
});

describe("what company costs", () => {
  it("pays nothing and takes nothing for a goodbye", () => {
    const w = freshWorld();
    warm(find(w, "resident1"));
    invite(w, "resident1", AFTERNOON);
    const inv = { ...w.inventory };
    const warmth = find(w, "resident1").friendship;

    partWays(w, AFTERNOON);
    expect(w.inventory).toEqual(inv);
    expect(find(w, "resident1").friendship).toBe(warmth);
    // And re-inviting immediately is free — no cooldown for a cooldown to
    // become a move.
    expect(invite(w, "resident1", AFTERNOON)).toBe(true);
  });

  it("records the trip on the person who took it, and on nobody else", () => {
    const w = freshWorld();
    warm(find(w, "resident1"));
    invite(w, "resident1", AFTERNOON);
    partWays(w, AFTERNOON);

    expect(hasMemory(find(w, "resident1").memory, "company")).toBe(true);
    for (const v of w.villagers) {
      if (v.id === "resident1") continue;
      expect(hasMemory(v.memory, "company")).toBe(false);
    }
  });
});

describe("walking with you", () => {
  it("aims at the player and stops short", () => {
    const w = freshWorld();
    const her = warm(find(w, "resident1"));
    invite(w, "resident1", AFTERNOON);

    her.x = w.player.x + 8;
    her.y = w.player.y;
    expect(followTarget(w, her)).toEqual({
      x: Math.round(w.player.x),
      y: Math.round(w.player.y),
    });

    // Close enough is close enough: null means "stand still", not "no company".
    her.x = w.player.x + 1;
    her.y = w.player.y;
    expect(followTarget(w, her)).toBeNull();
    expect(companion(w)?.id).toBe("resident1");
  });

  it("walks toward you instead of walking its routine", () => {
    const w = freshWorld();
    const her = warm(find(w, "resident1"));
    invite(w, "resident1", AFTERNOON);
    her.x = w.player.x + 6;
    her.y = w.player.y;
    const before = Math.hypot(her.x - w.player.x, her.y - w.player.y);
    for (let i = 0; i < 30; i++) tick(w, 1 / 30, AFTERNOON);
    const after = Math.hypot(her.x - w.player.x, her.y - w.player.y);
    expect(after).toBeLessThan(before);
  });

  it("gives the routine straight back when they go home", () => {
    const w = freshWorld();
    const her = warm(find(w, "resident1"));
    invite(w, "resident1", AFTERNOON);
    partWays(w, AFTERNOON);
    // Nothing is stored about the interruption: the very next tick walks her to
    // the post the clock says, from wherever standing next to you left her.
    her.x = 20;
    her.y = 20;
    for (let i = 0; i < 60; i++) tick(w, 1 / 30, AFTERNOON);
    expect(Math.hypot(her.x - 20, her.y - 20)).toBeGreaterThan(0.5);
  });
});

describe("underground", () => {
  /** Sink a shaft under the player and open the cell below it. */
  function shaftUnderPlayer(w: WorldState): { x: number; y: number } {
    const x = Math.round(w.player.x);
    const y = Math.round(w.player.y);
    setTile(w, x, y, SHAFT);
    sink(w, x, y);
    setTile(w, x, y, SHAFT);
    carve(w, x, y);
    return { x, y };
  }

  it("comes down the ladder with you, and back up", () => {
    const w = freshWorld();
    const her = warm(find(w, "resident1"));
    invite(w, "resident1", AFTERNOON);
    const at = shaftUnderPlayer(w);
    her.x = at.x + 1;
    her.y = at.y;

    expect(useShaft(w)).toBe(true);
    expect(w.player.layer).toBe("under");
    expect(her.layer).toBe("under");

    expect(useShaft(w)).toBe(true);
    expect(her.layer).toBe("surface");
  });

  it("leaves behind somebody who was nowhere near the ladder", () => {
    const w = freshWorld();
    const her = warm(find(w, "resident1"));
    invite(w, "resident1", AFTERNOON);
    const at = shaftUnderPlayer(w);
    her.x = at.x + 30;
    her.y = at.y;

    useShaft(w);
    expect(w.player.layer).toBe("under");
    expect(her.layer ?? "surface").toBe("surface");
    // Still your company, just on the wrong layer — and not walked anywhere,
    // because a route through the ceiling isn't a route.
    expect(companion(w)?.id).toBe("resident1");
    expect(followTarget(w, her)).toBeNull();
  });

  // The loose end 4a left open (ROADMAP: "mining and carving still call no
  // `witness`"). Now they do — for whoever is actually standing there.
  it("remembers a dig only for whoever was in the tunnel", () => {
    const w = freshWorld();
    const her = warm(find(w, "resident1"));
    invite(w, "resident1", AFTERNOON);
    const at = shaftUnderPlayer(w);
    her.x = at.x + 1;
    her.y = at.y;
    useShaft(w);

    // Step off the shaft first — standing on one makes ACT mean "fill it in",
    // which is the reticle doing exactly what it promises and not what this
    // test is about.
    carve(w, at.x + 1, at.y);
    w.player.x = at.x + 1;
    her.x = at.x + 1;
    her.y = at.y;
    w.player.heading = "e";
    const res = contextAction(w, "dig", AFTERNOON);
    expect(res).toMatchObject({ kind: "carve", changed: true });

    expect(hasMemory(her.memory, "dug")).toBe(true);
    const upstairs = find(w, "shop");
    expect(hasMemory(upstairs.memory, "dug")).toBe(false);
  });

  it("logs the deep trip as its own kind of afternoon", () => {
    const w = freshWorld();
    const her = warm(find(w, "resident1"));
    invite(w, "resident1", AFTERNOON);
    const at = shaftUnderPlayer(w);
    her.x = at.x + 1;
    her.y = at.y;
    useShaft(w);

    partWays(w, AFTERNOON);
    expect(hasMemory(her.memory, "delved")).toBe(true);
    expect(hasMemory(her.memory, "company")).toBe(false);
    // And she is put back on the surface, where every routine in the cast table
    // lives — a villager left on "under" is one the surface stops drawing.
    expect(her.layer).toBe("surface");
  });

  it("carves at all, so the test above is testing what it says", () => {
    const w = freshWorld();
    const at = shaftUnderPlayer(w);
    expect(w.under[`${at.x},${at.y}`]).toBe(CAVE_FLOOR);
  });
});
